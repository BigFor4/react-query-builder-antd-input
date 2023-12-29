import Immutable, { fromJS, Map } from "immutable";
import uuid from "../utils/uuid";
import { validateTree } from "../utils/validation";
import { extendConfig } from "../utils/configUtils";
import { getTreeBadFields, getLightTree } from "../utils/treeUtils";
import { isJsonLogic } from "../utils/stuff";
let treeData = [];

export const getTreeData = () => {
  return treeData;
};
function convertJson(inputJson) {
  const operatorLabels = {
    equal: {
      label: '==',
    },
    not_equal: {
      label: '!=',
    },
    less: {
      label: '<',
    },
    less_or_equal: {
      label: '<=',
    },
    greater: {
      label: '>',
    },
    greater_or_equal: {
      label: '>=',
    },
  };

  function convertRule(rule) {
    const operatorLabel = operatorLabels[rule?.properties?.operator]?.label || '';
    const field = rule?.properties?.field || '';
    const value = rule?.properties?.value?.[0] || '';

    if (operatorLabel && field && value !== null && value !== undefined) {
      return {
        title: `Attribute.${field} ${operatorLabel} ${value}`,
        type: 'attribute',
      };
    } else {
      return null;
    }
  }

  function convertGroup(group) {
    const conjunction = group?.properties?.conjunction || 'AND';
    const not = group?.properties?.not || false;

    const result = {
      title: conjunction,
      type: 'operator',
      children: (group?.children1 || []).map(convertNode).filter(Boolean),
    };

    return not ? { title: 'NOT', type: 'operator', children: [result] } : result;
  }

  function convertNode(node) {
    if (node?.type === 'rule') {
      return convertRule(node);
    } else if (node?.type === 'group') {
      return convertGroup(node);
    } else {
      return null;
    }
  }

  return convertNode(inputJson) || {};
}
export const getTree = (immutableTree, light = true, children1AsArray = true) => {
  if (!immutableTree) return undefined;
  let tree = immutableTree;
  tree = tree.toJS();
  if (light)
    tree = getLightTree(tree, children1AsArray);
  return convertJson(tree);
};
export const findObjectById = (root, targetId) => {
  if (typeof root === 'object' && root !== null && 'id' in root) {
    if (root.id === targetId) {
      return root;
    }
  }
  for (const key in root) {
    if (typeof root[key] === 'object' && root[key] !== null) {
      const result = findObjectById(root[key], targetId);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
function convertRule(node) {
  let { attribute, condition, value } = parseConditionString(node.title);
  const rule = {
    type: "rule",
    id: uuid(),
    properties: {
      field: attribute,
      operator: getOperator(condition),
      value: [value?.toString() || ''],
      valueSrc: [null],
      valueError: [null],
      valueType: [null]
    }
  };
  return rule;
}
const parseConditionString = (conditionString) => {
  const regex = /^(Attribute|Object)\.(.*?)\s*(!=|>=|<=|==|=|>|<)\s*(.*)$/;
  const match = conditionString.match(regex);
  if (match) {
    const attribute = match[2].trim();
    const condition = match[3] === '=' ? '==' : match[3];
    let value = match[4].trim();
    if (!attribute || !condition) {
      return {};
    }
    return { attribute, condition, value };
  }
  return {};
};
function convertGroup(node) {
  const group = {
    type: "group",
    id: uuid(),
    children1: node?.children?.map(convertNode),
    properties: {
      conjunction: node?.title?.toUpperCase(),
      not: node?.title === "NOT"
    }
  };
  return group;
}

function convertNode(node) {
  if (node.type === "operator") {
    return convertGroup(node);
  } else if (node.type === "attribute") {
    return convertRule(node);
  }
}

function getOperator(operator) {
  if (operator === "==" || operator === "===" || operator === "=") {
    return "equal";
  } else if (operator === "!=" || operator === "!==") {
    return "not_equal";
  } else if (operator === "<=") {
    return "less_or_equal";
  } else if (operator === "<") {
    return "less";
  } else if (operator === ">=") {
    return "greater_or_equal";
  } else if (operator === ">") {
    return "greater";
  }
}

export const loadTree = (serTree) => {
  if (typeof serTree == "string") {
    serTree = JSON.parse(serTree);
  }
  serTree = convertGroup(serTree);
  if (isImmutableTree(serTree)) {
    return serTree;
  } else if (isTree(serTree)) {
    return jsTreeToImmutable(serTree);
  } else if (typeof serTree == "string" && serTree.startsWith('["~#iM"')) {
    throw "You are trying to load query in obsolete serialization format (Immutable string) which is not supported in versions starting from 2.1.17";
  } else if (typeof serTree == "string") {
    return jsTreeToImmutable(JSON.parse(serTree));
  } else throw "Can't load tree!";
};

export const checkTree = (tree, config) => {
  if (!tree) return undefined;
  const extendedConfig = extendConfig(config);
  return validateTree(tree, null, extendedConfig, extendedConfig);
};

export const isValidTree = (tree) => {
  return getTreeBadFields(tree).length == 0;
};

export const isImmutableTree = (tree) => {
  return Map.isMap(tree);
};

export const isTree = (tree) => {
  return typeof tree == "object" && (tree.type == "group" || tree.type == "switch_group");
};

export { isJsonLogic };

function jsTreeToImmutable(tree) {
  return fromJS(tree, function (key, value) {
    let outValue;
    if (key == "properties") {
      outValue = value.toOrderedMap();

      // `value` should be undefined instead of null
      // JSON doesn't support undefined and replaces undefined -> null
      // So fix: null -> undefined
      for (let i = 0; i < 2; i++) {
        if (outValue.get("value")?.get(i) === null) {
          outValue = outValue.setIn(["value", i], undefined);
        }
      }
    } else if (key == "value" && value.get(0) && value.get(0).toJS !== undefined) {
      const valueJs = value.get(0).toJS();
      if (valueJs.func) {
        outValue = value.toOrderedMap();
      } else {
        // only for raw values keep JS representation
        outValue = Immutable.List.of(valueJs);
      }
    } else if (key == "asyncListValues") {
      // keep in JS format
      outValue = value.toJS();
    } else if (key == "children1" && Immutable.Iterable.isIndexed(value)) {
      outValue = new Immutable.OrderedMap(value.map(child => [child.get("id"), child]));
    } else {
      outValue = Immutable.Iterable.isIndexed(value) ? value.toList() : value.toOrderedMap();
    }
    return outValue;
  });
}

