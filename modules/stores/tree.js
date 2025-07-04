
import Immutable from "immutable";
import {
  expandTreePath, expandTreeSubpath, getItemByPath, fixPathsInTree,
  getTotalRulesCountInTree, fixEmptyGroupsInTree, isEmptyTree, hasChildren, removeIsLockedInTree
} from "../utils/treeUtils";
import {
  defaultRuleProperties, defaultGroupProperties, defaultOperator,
  defaultOperatorOptions, defaultRoot, defaultItemProperties
} from "../utils/defaultUtils";
import * as constants from "../constants";
import uuid from "../utils/uuid";
import {
  getFuncConfig, getFieldConfig, getFieldWidgetConfig, getOperatorConfig
} from "../utils/configUtils";
import {
  getOperatorsForField, getFirstOperator, getWidgetForFieldOp,
  getNewValueForFieldOp
} from "../utils/ruleUtils";
import { deepEqual, defaultValue, applyToJS } from "../utils/stuff";
import { validateValue } from "../utils/validation";
import omit from "lodash/omit";
import mapValues from "lodash/mapValues";
import { findObjectById } from "../import";

/**
 * @param {object} config
 * @param {Immutable.List} path
 * @param {Immutable.Map} properties
 */
const addNewGroup = (state, path, type, groupUuid, properties, config, children = null, meta = {}) => {
  const { shouldCreateEmptyGroup } = config.settings;
  const groupPath = path.push(groupUuid);
  const canAddNewRule = !shouldCreateEmptyGroup;
  const isDefaultCase = !!meta?.isDefaultCase;

  const origState = state;
  state = addItem(state, path, type, groupUuid, defaultGroupProperties(config).merge(properties || {}), config, children);
  if (state !== origState) {
    if (!children && !isDefaultCase) {
      state = state.setIn(expandTreePath(groupPath, "children1"), new Immutable.OrderedMap());

      // Add one empty rule into new group
      if (canAddNewRule) {
        state = addItem(state, groupPath, "rule", uuid(), defaultRuleProperties(config), config);
      }
    }

    state = fixPathsInTree(state);
  }

  return state;
};

/**
 * @param {object} config
 * @param {Immutable.List} path
 * @param {Immutable.Map} properties
 */
const removeGroup = (state, path, config) => {
  state = removeItem(state, path);

  const { canLeaveEmptyGroup } = config.settings;
  const parentPath = path.slice(0, -1);
  const isEmptyParentGroup = !hasChildren(state, parentPath);
  if (isEmptyParentGroup && !canLeaveEmptyGroup) {
    // check ancestors for emptiness (and delete 'em if empty)
    state = fixEmptyGroupsInTree(state);

    if (isEmptyTree(state) && !canLeaveEmptyGroup) {
      // if whole query is empty, add one empty rule to root
      state = addItem(state, new Immutable.List(), "rule", uuid(), defaultRuleProperties(config), config);
    }
  }
  state = fixPathsInTree(state);
  return state;
};

/**
 * @param {object} config
 * @param {Immutable.List} path
 */
const removeRule = (state, path, config) => {
  state = removeItem(state, path);

  const { canLeaveEmptyGroup } = config.settings;
  const parentPath = path.pop();
  const parent = state.getIn(expandTreePath(parentPath));

  const parentField = parent.getIn(["properties", "field"]);
  const parentOperator = parent.getIn(["properties", "operator"]);
  const parentValue = parent.getIn(["properties", "value", 0]);
  const parentFieldConfig = parentField ? getFieldConfig(config, parentField) : null;
  const parentOperatorConfig = parentOperator ? getOperatorConfig(config, parentOperator, parentField) : null;
  const hasGroupCountRule = parentField && parentOperator && parentOperatorConfig.cardinality != 0; // && parentValue != undefined;

  const isParentRuleGroup = parent?.get("type") == "rule_group";
  const isEmptyParentGroup = !hasChildren(state, parentPath);
  const canLeaveEmpty = isParentRuleGroup
    ? hasGroupCountRule && parentFieldConfig.initialEmptyWhere
    : canLeaveEmptyGroup;

  if (isEmptyParentGroup && !canLeaveEmpty) {
    if (isParentRuleGroup) {
      // deleted last rule from rule_group, so delete whole rule_group
      state = state.deleteIn(expandTreePath(parentPath));
    }

    // check ancestors for emptiness (and delete 'em if empty)
    state = fixEmptyGroupsInTree(state);

    if (isEmptyTree(state) && !canLeaveEmptyGroup) {
      // if whole query is empty, add one empty rule to root
      state = addItem(state, new Immutable.List(), "rule", uuid(), defaultRuleProperties(config), config);
    }
  }
  state = fixPathsInTree(state);
  return state;
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {bool} not
 */
const setNot = (state, path, not) =>
  state.setIn(expandTreePath(path, "properties", "not"), not);

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {bool} lock
 */
const setLock = (state, path, lock) =>
  removeIsLockedInTree(state.setIn(expandTreePath(path, "properties", "isLocked"), lock));

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {string} conjunction
 */
const setConjunction = (state, path, conjunction) =>
  state.setIn(expandTreePath(path, "properties", "conjunction"), conjunction);

// convert children deeply from JS to Immutable
const _addChildren1 = (config, item, children) => {
  if (children && Array.isArray(children)) {
    item.children1 = new Immutable.OrderedMap(
      children.reduce((map, it) => {
        const id1 = uuid();
        const it1 = {
          ...it,
          properties: defaultItemProperties(config, it).merge(it.properties || {}),
          id: id1
        };
        _addChildren1(config, it1, it1.children1);
        //todo: guarantee order
        return {
          ...map,
          [id1]: new Immutable.Map(it1)
        };
      }, {})
    );
  }
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {string} type
 * @param {string} id
 * @param {Immutable.OrderedMap} properties
 * @param {object} config
 */
const addItem = (state, path, type, id, properties, config, children = null) => {
  if (type == "switch_group")
    throw new Error("Can't add switch_group programmatically");
  const { maxNumberOfCases, maxNumberOfRules, maxNesting } = config.settings;
  const rootType = state?.get("type");
  const isTernary = rootType == "switch_group";
  const targetItem = state.getIn(expandTreePath(path));
  const caseGroup = isTernary ? state.getIn(expandTreePath(path.take(2))) : null;
  const childrenPath = expandTreePath(path, "children1");
  const targetChildren = state.getIn(childrenPath);
  const hasChildren = !!targetChildren && targetChildren.size;
  const targetChildrenSize = hasChildren ? targetChildren.size : null;
  let currentNumber, maxNumber;
  if (type == "case_group") {
    currentNumber = targetChildrenSize;
    maxNumber = maxNumberOfCases;
  } else if (type == "group") {
    currentNumber = path.size;
    maxNumber = maxNesting;
  } else if (targetItem?.get("type") == "rule_group") {
    // don't restrict
  } else {
    currentNumber = isTernary ? getTotalRulesCountInTree(caseGroup) : getTotalRulesCountInTree(state);
    maxNumber = maxNumberOfRules;
  }
  const canAdd = maxNumber && currentNumber ? (currentNumber < maxNumber) : true;

  const item = { type, id, properties };
  _addChildren1(config, item, children);

  const isLastDefaultCase = type == "case_group" && hasChildren && targetChildren.last()?.get("children1") == null;

  if (canAdd) {
    const newChildren = new Immutable.OrderedMap({
      [id]: new Immutable.Map(item)
    });
    if (!hasChildren) {
      state = state.setIn(childrenPath, newChildren);
    } else if (isLastDefaultCase) {
      const last = targetChildren.last();
      const newChildrenWithLast = new Immutable.OrderedMap({
        [id]: new Immutable.Map(item),
        [last?.get("id")]: last
      });
      state = state.deleteIn(expandTreePath(childrenPath, "children1", last?.get("id")));
      state = state.mergeIn(childrenPath, newChildrenWithLast);
    } else {
      state = state.mergeIn(childrenPath, newChildren);
    }
    state = fixPathsInTree(state);
  }
  return state;
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 */
const removeItem = (state, path) => {
  state = state.deleteIn(expandTreePath(path));
  state = fixPathsInTree(state);
  return state;
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} fromPath
 * @param {Immutable.List} toPath
 * @param {string} placement, see constants PLACEMENT_*: PLACEMENT_AFTER, PLACEMENT_BEFORE, PLACEMENT_APPEND, PLACEMENT_PREPEND
 * @param {object} config
 */
const moveItem = (state, fromPath, toPath, placement, config) => {
  const from = getItemByPath(state, fromPath);
  const sourcePath = fromPath.pop();
  const source = fromPath.size > 1 ? getItemByPath(state, sourcePath) : null;
  const sourceChildren = source ? source?.get("children1") : null;

  const to = getItemByPath(state, toPath);
  const targetPath = (placement == constants.PLACEMENT_APPEND || placement == constants.PLACEMENT_PREPEND) ? toPath : toPath.pop();
  const target = (placement == constants.PLACEMENT_APPEND || placement == constants.PLACEMENT_PREPEND)
    ? to
    : toPath.size > 1 ? getItemByPath(state, targetPath) : null;
  const targetChildren = target ? target?.get("children1") : null;

  if (!source || !target || !from)
    return state;

  const isSameParent = (source?.get("id") == target?.get("id"));
  const isSourceInsideTarget = targetPath.size < sourcePath.size
    && deepEqual(targetPath.toArray(), sourcePath.toArray().slice(0, targetPath.size));
  const isTargetInsideSource = targetPath.size > sourcePath.size
    && deepEqual(sourcePath.toArray(), targetPath.toArray().slice(0, sourcePath.size));
  let sourceSubpathFromTarget = null;
  let targetSubpathFromSource = null;
  if (isSourceInsideTarget) {
    sourceSubpathFromTarget = Immutable.List(sourcePath.toArray().slice(targetPath.size));
  } else if (isTargetInsideSource) {
    targetSubpathFromSource = Immutable.List(targetPath.toArray().slice(sourcePath.size));
  }

  let newTargetChildren = targetChildren, newSourceChildren = sourceChildren;
  if (!isTargetInsideSource)
    newSourceChildren = newSourceChildren.delete(from?.get("id"));
  if (isSameParent) {
    newTargetChildren = newSourceChildren;
  } else if (isSourceInsideTarget) {
    newTargetChildren = newTargetChildren.updateIn(expandTreeSubpath(sourceSubpathFromTarget, "children1"), (_oldChildren) => newSourceChildren);
  }

  if (placement == constants.PLACEMENT_BEFORE || placement == constants.PLACEMENT_AFTER) {
    newTargetChildren = Immutable.OrderedMap().withMutations(r => {
      for (let [itemId, item] of newTargetChildren.entries()) {
        if (itemId == to?.get("id") && placement == constants.PLACEMENT_BEFORE) {
          r.set(from?.get("id"), from);
        }

        r.set(itemId, item);

        if (itemId == to?.get("id") && placement == constants.PLACEMENT_AFTER) {
          r.set(from?.get("id"), from);
        }
      }
    });
  } else if (placement == constants.PLACEMENT_APPEND) {
    newTargetChildren = newTargetChildren.merge({ [from?.get("id")]: from });
  } else if (placement == constants.PLACEMENT_PREPEND) {
    newTargetChildren = Immutable.OrderedMap({ [from?.get("id")]: from }).merge(newTargetChildren);
  }

  if (isTargetInsideSource) {
    newSourceChildren = newSourceChildren.updateIn(expandTreeSubpath(targetSubpathFromSource, "children1"), (_oldChildren) => newTargetChildren);
    newSourceChildren = newSourceChildren.delete(from?.get("id"));
  }

  if (!isSameParent && !isSourceInsideTarget)
    state = state.updateIn(expandTreePath(sourcePath, "children1"), (_oldChildren) => newSourceChildren);
  if (!isTargetInsideSource)
    state = state.updateIn(expandTreePath(targetPath, "children1"), (_oldChildren) => newTargetChildren);

  state = fixPathsInTree(state);
  return state;
};


/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {string} field
 */
const setField = (state, path, newField, config) => {
  const { fieldSeparator, setOpOnChangeField, showErrorMessage } = config.settings;
  if (Array.isArray(newField))
    newField = newField.join(fieldSeparator);
  const currentType = state.getIn(expandTreePath(path, "type"));
  const wasRuleGroup = currentType == "rule_group";
  const pathJS = path.toJS();
  const idNode = pathJS[pathJS.length - 1];
  let object = findObjectById(state.toJS(), idNode);
  let currentProperties = object?.properties;
  const newFieldConfig = JSON.parse(JSON.stringify(object));
  let valueField = new Immutable.fromJS([]);
  if (currentProperties) {
    currentProperties = new Immutable.Map(currentProperties)
  }
  let newOperator = '';
  if (newFieldConfig?.properties) {
    valueField = new Immutable.fromJS(newFieldConfig.properties.value);
    newFieldConfig.properties.field = newField;
    newOperator = newFieldConfig.properties.operator;
  }
  const isRuleGroup = newFieldConfig?.type == "!group";
  const isRuleGroupExt = isRuleGroup && newFieldConfig?.mode == "array";
  if (wasRuleGroup && !isRuleGroup) {
    state = state.setIn(expandTreePath(path, "type"), "rule");
    state = state.deleteIn(expandTreePath(path, "children1"));
    state = state.setIn(expandTreePath(path, "properties"), new Immutable.OrderedMap());
  }

  if (isRuleGroup) {
    state = state.setIn(expandTreePath(path, "type"), "rule_group");
    const { canReuseValue, newValue, newValueSrc, newValueType, operatorCardinality } = getNewValueForFieldOp(
      config, config, currentProperties, newField, newOperator, "field", true
    );
    let groupProperties = defaultGroupProperties(config, newFieldConfig).merge({
      field: newField,
      mode: newFieldConfig?.mode,
    });
    if (isRuleGroupExt) {
      groupProperties = groupProperties.merge({
        operator: newOperator,
        value: valueField || newValue,
        valueSrc: newValueSrc,
        valueType: newValueType,
      });
    }
    state = state.setIn(expandTreePath(path, "children1"), new Immutable.OrderedMap());
    state = state.setIn(expandTreePath(path, "properties"), groupProperties);
    if (newFieldConfig?.initialEmptyWhere && operatorCardinality == 1) { // just `COUNT(grp) > 1` without `HAVING ..`
      // no childeren
    } else {
      state = addItem(state, path, "rule", uuid(), defaultRuleProperties(config, newField), config);
    }
    state = fixPathsInTree(state);

    return state;
  }

  return state.updateIn(expandTreePath(path, "properties"), (map) => map.withMutations((current) => {
    const { canReuseValue, newValue, newValueSrc, newValueType, newValueError } = getNewValueForFieldOp(
      config, config, current, newField, newOperator, "field", true
    );
    if (showErrorMessage) {
      current = current
        .set("valueError", newValueError);
    }
    return current
      .set("field", newField)
      .set("operator", newOperator)
      .set("value", valueField || newValue)
      .set("valueSrc", newValueSrc)
      .set("valueType", newValueType)
      .delete("asyncListValues");
  }));
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {string} operator
 */
const setOperator = (state, path, newOperator, config) => {
  const { showErrorMessage } = config.settings;
  const pathJS = path.toJS();
  const idNode = pathJS[pathJS.length - 1];
  let object = findObjectById(state.toJS(), idNode);
  let currentProperties = object;
  let valueField = new Immutable.fromJS([]);
  if (currentProperties?.properties) {
    valueField = new Immutable.fromJS(currentProperties.properties.value);
  }
  const properties = currentProperties.properties;
  const children = currentProperties.children1;
  const currentField = properties.field;
  const fieldConfig = currentProperties;
  const isRuleGroup = fieldConfig?.type == "!group";
  const operatorConfig = getOperatorConfig(config, newOperator, currentField);
  const operatorCardinality = operatorConfig ? defaultValue(operatorConfig.cardinality, 1) : null;

  state = state.updateIn(expandTreePath(path, "properties"), (map) => map.withMutations((current) => {
    const currentField = current?.get("field");
    const currentOperatorOptions = current?.get("operatorOptions");

    const { canReuseValue, newValue, newValueSrc, newValueType, newValueError } = getNewValueForFieldOp(
      config, config, current, currentField, newOperator, "operator", true
    );
    if (showErrorMessage) {
      current = current
        .set("valueError", newValueError);
    }
    const newOperatorOptions = canReuseValue ? currentOperatorOptions : defaultOperatorOptions(config, newOperator, currentField);

    if (!canReuseValue) {
      current = current
        .delete("asyncListValues");
    }

    return current
      .set("operator", newOperator)
      .set("operatorOptions", newOperatorOptions)
      .set("value", valueField || newValue)
      .set("valueSrc", newValueSrc)
      .set("valueType", newValueType);
  }));

  if (isRuleGroup) {
    if (operatorCardinality == 0 && children.size == 0) {
      state = addItem(state, path, "rule", uuid(), defaultRuleProperties(config, currentField), config);
    }
  }

  return state;
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {integer} delta
 * @param {*} value
 * @param {string} valueType
 * @param {*} asyncListValues
 * @param {boolean} __isInternal
 */
const setValue = (state, path, dataUpdate, config) => {
  const {showErrorMessage } = config.settings;
  let newField = dataUpdate?.value || dataUpdate;
  const typeUpdate = dataUpdate?.type;
  const arrayModel = dataUpdate?.arrayModel;
  const dataType = dataUpdate?.dataType;
  const currentType = state.getIn(expandTreePath(path, "type"));
  const wasRuleGroup = currentType == "rule_group";
  const pathJS = path.toJS();
  const idNode = pathJS[pathJS.length - 1];
  let object = findObjectById(state.toJS(), idNode);
  let currentProperties = object?.properties;
  const newFieldConfig = JSON.parse(JSON.stringify(object));
  if (currentProperties) {
    currentProperties = new Immutable.Map(currentProperties)
  }
  let valueField = new Immutable.fromJS([]);
  let newOperator = '';
  let field = '';
  if (newFieldConfig?.properties) {
    let dataValue = newFieldConfig.properties.value?.[0] || {};
    dataValue[typeUpdate] = newField;
    if (typeUpdate === 'type') {
      dataValue.arrayModel = arrayModel || [];
      dataValue.dataType = dataType || "";
    }
    valueField = new Immutable.fromJS([dataValue]);
    newOperator = newFieldConfig.properties.operator;
    field = newFieldConfig.properties.field;
  }
  const isRuleGroup = newFieldConfig?.type == "!group";
  const isRuleGroupExt = isRuleGroup && newFieldConfig?.mode == "array";

  if (wasRuleGroup && !isRuleGroup) {
    state = state.setIn(expandTreePath(path, "type"), "rule");
    state = state.deleteIn(expandTreePath(path, "children1"));
    state = state.setIn(expandTreePath(path, "properties"), new Immutable.OrderedMap());
  }

  if (isRuleGroup) {
    state = state.setIn(expandTreePath(path, "type"), "rule_group");
    const { canReuseValue, newValue, newValueSrc, newValueType, operatorCardinality } = getNewValueForFieldOp(
      config, config, currentProperties, newField, newOperator, "field", true
    );
    let groupProperties = defaultGroupProperties(config, newFieldConfig).merge({
      field: newField,
      mode: newFieldConfig?.mode,
    });
    if (isRuleGroupExt) {
      groupProperties = groupProperties.merge({
        operator: newOperator,
        value: newValue,
        valueSrc: newValueSrc,
        valueType: newValueType,
      });
    }
    state = state.setIn(expandTreePath(path, "children1"), new Immutable.OrderedMap());
    state = state.setIn(expandTreePath(path, "properties"), groupProperties);
    if (newFieldConfig?.initialEmptyWhere && operatorCardinality == 1) { // just `COUNT(grp) > 1` without `HAVING ..`
      // no childeren
    } else {
      state = addItem(state, path, "rule", uuid(), defaultRuleProperties(config, newField), config);
    }
    state = fixPathsInTree(state);

    return state;
  }

  return state.updateIn(expandTreePath(path, "properties"), (map) => map.withMutations((current) => {
    const { canReuseValue, newValue, newValueSrc, newValueType, newValueError } = getNewValueForFieldOp(
      config, config, current, newField, newOperator, "field", true
    );
    if (showErrorMessage) {
      current = current
        .set("valueError", newValueError);
    }
    return current
      .set("field", field)
      .set("operator", newOperator)
      .set("value", valueField)
      .set("valueSrc", newValueSrc)
      .set("valueType", newValueType)
      .delete("asyncListValues");
  }));
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {integer} delta
 * @param {*} srcKey
 */
const setValueSrc = (state, path, delta, srcKey, config) => {
  const { showErrorMessage } = config.settings;

  const field = state.getIn(expandTreePath(path, "properties", "field")) || null;
  const operator = state.getIn(expandTreePath(path, "properties", "operator")) || null;

  state = state.setIn(expandTreePath(path, "properties", "value", delta + ""), undefined);
  state = state.setIn(expandTreePath(path, "properties", "valueType", delta + ""), null);
  state = state.deleteIn(expandTreePath(path, "properties", "asyncListValues"));

  if (showErrorMessage) {
    // clear value error
    state = state.setIn(expandTreePath(path, "properties", "valueError", delta), null);

    // if current operator is range, clear possible range error
    const operatorConfig = getOperatorConfig(config, operator, field);
    const operatorCardinality = operator ? defaultValue(operatorConfig.cardinality, 1) : null;
    if (operatorConfig.validateValues) {
      state = state.setIn(expandTreePath(path, "properties", "valueError", operatorCardinality), null);
    }
  }

  // set valueSrc
  if (typeof srcKey === "undefined") {
    state = state.setIn(expandTreePath(path, "properties", "valueSrc", delta + ""), null);
  } else {
    state = state.setIn(expandTreePath(path, "properties", "valueSrc", delta + ""), srcKey);
  }

  // maybe set default value
  if (srcKey) {
    const properties = state.getIn(expandTreePath(path, "properties"));
    // this call should return canReuseValue = false and provide default value
    const { canReuseValue, newValue, newValueSrc, newValueType, newValueError } = getNewValueForFieldOp(
      config, config, properties, field, operator, "valueSrc", true
    );
    if (!canReuseValue && newValueSrc?.get(delta) == srcKey) {
      state = state.setIn(expandTreePath(path, "properties", "value", delta + ""), newValue?.get(delta));
      state = state.setIn(expandTreePath(path, "properties", "valueType", delta + ""), newValueType?.get(delta));
    }
  }

  return state;
};

/**
 * @param {Immutable.Map} state
 * @param {Immutable.List} path
 * @param {string} name
 * @param {*} value
 */
const setOperatorOption = (state, path, name, value) => {
  return state.setIn(expandTreePath(path, "properties", "operatorOptions", name), value);
};

/**
 * @param {Immutable.Map} state
 */
const checkEmptyGroups = (state, config) => {
  const { canLeaveEmptyGroup } = config.settings;
  if (!canLeaveEmptyGroup) {
    state = fixEmptyGroupsInTree(state);
  }
  return state;
};


/**
 * 
 */
const calculateValueType = (value, valueSrc, config) => {
  let calculatedValueType = null;
  if (value) {
    if (valueSrc === "field") {
      const fieldConfig = getFieldConfig(config, value);
      if (fieldConfig) {
        calculatedValueType = fieldConfig.type;
      }
    } else if (valueSrc === "func") {
      const funcKey = value?.get("func");
      if (funcKey) {
        const funcConfig = getFuncConfig(config, funcKey);
        if (funcConfig) {
          calculatedValueType = funcConfig.returnType;
        }
      }
    }
  }
  return calculatedValueType;
};

const getField = (state, path) => {
  const field = state.getIn(expandTreePath(path, "properties", "field")) || null;
  return field;
};

const emptyDrag = {
  dragging: {
    id: null,
    x: null,
    y: null,
    w: null,
    h: null
  },
  mousePos: {},
  dragStart: {
    id: null,
  },
};

const getActionMeta = (action, state) => {
  const actionKeysToOmit = [
    "config", "asyncListValues", "__isInternal"
  ];
  const actionTypesToIgnore = [
    constants.SET_TREE,
    constants.SET_DRAG_START,
    constants.SET_DRAG_PROGRESS,
    constants.SET_DRAG_END,
  ];
  let meta = mapValues(omit(action, actionKeysToOmit), applyToJS);
  let affectedField = action.path && getField(state.tree, action.path) || action.field;
  if (affectedField)
    meta.affectedField = affectedField;
  if (actionTypesToIgnore.includes(action.type) || action.type.indexOf("@@redux") == 0)
    meta = null;
  return meta;
};

/**
 * @param {Immutable.Map} state
 * @param {object} action
 */
export default (config, tree, getMemoizedTree) => {
  const emptyTree = defaultRoot(config);
  const initTree = tree || emptyTree;
  const emptyState = {
    tree: initTree,
    ...emptyDrag
  };

  return (state = emptyState, action) => {
    const unset = { __isInternalValueChange: undefined, __lastAction: undefined };
    let set = {};
    let actionMeta = getActionMeta(action, state);

    switch (action.type) {
      case constants.SET_TREE: {
        const validatedTree = getMemoizedTree(action.config, action.tree);
        set.tree = validatedTree;
        break;
      }

      case constants.ADD_CASE_GROUP: {
        set.tree = addNewGroup(state.tree, action.path, "case_group", action.id, action.properties, action.config, action.children, action.meta);
        break;
      }

      case constants.ADD_GROUP: {
        set.tree = addNewGroup(state.tree, action.path, "group", action.id, action.properties, action.config, action.children, action.meta);
        break;
      }

      case constants.REMOVE_GROUP: {
        set.tree = removeGroup(state.tree, action.path, action.config);
        break;
      }

      case constants.ADD_RULE: {
        set.tree = addItem(state.tree, action.path, action.ruleType, action.id, action.properties, action.config, action.children);
        break;
      }

      case constants.REMOVE_RULE: {
        set.tree = removeRule(state.tree, action.path, action.config);
        break;
      }

      case constants.SET_CONJUNCTION: {
        set.tree = setConjunction(state.tree, action.path, action.conjunction);
        break;
      }

      case constants.SET_NOT: {
        set.tree = setNot(state.tree, action.path, action.not);
        break;
      }

      case constants.SET_FIELD: {
        set.tree = setField(state.tree, action.path, action.field, action.config);
        break;
      }

      case constants.SET_LOCK: {
        set.tree = setLock(state.tree, action.path, action.lock);
        break;
      }

      case constants.SET_OPERATOR: {
        set.tree = setOperator(state.tree, action.path, action.operator, action.config);
        break;
      }

      case constants.SET_VALUE: {
        set.tree = setValue(state.tree, action.path, action.field, action.config);
        break;
      }

      case constants.SET_VALUE_SRC: {
        set.tree = setValueSrc(state.tree, action.path, action.delta, action.srcKey, action.config);
        break;
      }

      case constants.SET_OPERATOR_OPTION: {
        set.tree = setOperatorOption(state.tree, action.path, action.name, action.value);
        break;
      }

      case constants.MOVE_ITEM: {
        set.tree = moveItem(state.tree, action.fromPath, action.toPath, action.placement, action.config);
        break;
      }

      case constants.SET_DRAG_START: {
        set.dragStart = action.dragStart;
        set.dragging = action.dragging;
        set.mousePos = action.mousePos;
        break;
      }

      case constants.SET_DRAG_PROGRESS: {
        set.mousePos = action.mousePos;
        set.dragging = action.dragging;
        break;
      }

      case constants.SET_DRAG_END: {
        set.tree = checkEmptyGroups(state.tree, config);
        set = { ...set, ...emptyDrag };
        break;
      }

      default: {
        break;
      }
    }

    if (actionMeta) {
      set.__lastAction = actionMeta;
    }

    return { ...state, ...unset, ...set };
  };

};
