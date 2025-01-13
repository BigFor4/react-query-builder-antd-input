import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { getFieldConfig, getOperatorConfig } from "../../utils/configUtils";
import keys from "lodash/keys";
import pickBy from "lodash/pickBy";
import mapValues from "lodash/mapValues";
import { useOnPropsChanged } from "../../utils/reactUtils";

const operators = [
  {
    "key": "less",
    "path": "less",
    "label": "<",
    "labelForFormat": "<",
    "sqlOp": "<",
    "reversedOp": "greater_or_equal",
    "jsonLogic": "<",
    "elasticSearchQueryType": "range"
  },
  {
    "key": "not_equal",
    "path": "not_equal",
    "label": "!=",
    "labelForFormat": "!=",
    "sqlOp": "<>",
    "reversedOp": "equal",
    "jsonLogic": "!="
  },
  {
    "key": "greater_or_equal",
    "path": "greater_or_equal",
    "label": ">=",
    "labelForFormat": ">=",
    "sqlOp": ">=",
    "reversedOp": "less",
    "jsonLogic": ">=",
    "elasticSearchQueryType": "range"
  },
  {
    "key": "equal",
    "path": "equal",
    "label": "=",
    "labelForFormat": "==",
    "sqlOp": "=",
    "reversedOp": "not_equal",
    "jsonLogic": "==",
    "elasticSearchQueryType": "term"
  },
  {
    "key": "greater",
    "path": "greater",
    "label": ">",
    "labelForFormat": ">",
    "sqlOp": ">",
    "reversedOp": "less_or_equal",
    "jsonLogic": ">",
    "elasticSearchQueryType": "range"
  },
  {
    "key": "less_or_equal",
    "path": "less_or_equal",
    "label": "<=",
    "labelForFormat": "<=",
    "sqlOp": "<=",
    "reversedOp": "greater",
    "jsonLogic": "<=",
    "elasticSearchQueryType": "range"
  }
]
export default class Operator extends PureComponent {
  static propTypes = {
    id: PropTypes.string,
    groupId: PropTypes.string,
    config: PropTypes.object.isRequired,
    selectedField: PropTypes.string,
    selectedOperator: PropTypes.string,
    readonly: PropTypes.bool,
    typeData: PropTypes.string,
    //actions
    setOperator: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    useOnPropsChanged(this);

    this.onPropsChanged(props);
  }

  onPropsChanged(nextProps) {
    const prevProps = this.props;
    const keysForMeta = ["config", "selectedField", "selectedOperator"];
    const needUpdateMeta = !this.meta || keysForMeta.map(k => (nextProps[k] !== prevProps[k])).filter(ch => ch).length > 0;

    if (needUpdateMeta) {
      this.meta = this.getMeta(nextProps);
    }
  }

  getMeta({ config, selectedField, selectedOperator }) {
    const fieldConfig = getFieldConfig(config, selectedField);
    const operators = fieldConfig?.operators;
    const operatorOptions
      = mapValues(
        pickBy(
          config.operators,
          (item, key) => operators?.indexOf(key) !== -1
        ),
        (_opts, op) => getOperatorConfig(config, op, selectedField)
      );

    const items = this.buildOptions(config, operatorOptions, operators);

    const isOpSelected = !!selectedOperator;
    const currOp = isOpSelected ? operatorOptions[selectedOperator] : null;
    const selectedOpts = currOp || {};
    const placeholder = this.props.config.settings.placeholders.operatorPlaceholder;
    const selectedKey = selectedOperator;
    const selectedKeys = isOpSelected ? [selectedKey] : null;
    const selectedPath = selectedKeys;
    const selectedLabel = selectedOpts.label;

    return {
      placeholder, items,
      selectedKey, selectedKeys, selectedPath, selectedLabel, selectedOpts, fieldConfig
    };
  }

  buildOptions(config, fields, ops) {
    if (!fields || !ops)
      return null;

    return keys(fields).sort((a, b) => (ops.indexOf(a) - ops.indexOf(b))).map(fieldKey => {
      const field = fields[fieldKey];
      const label = field.label;
      return {
        key: fieldKey,
        path: fieldKey,
        label,
      };
    });
  }

  render() {
    const { config, customProps, setOperator, readonly, id, groupId, typeData } = this.props;
    const { renderOperator } = config.settings;
    const renderProps = {
      id,
      groupId,
      config,
      customProps,
      readonly,
      setField: setOperator,
      isValue: 'operator',
      typeData,
      ...this.meta
    };
    if (!renderProps.items)
      renderProps.items = operators
    return renderOperator(renderProps);
  }
}
