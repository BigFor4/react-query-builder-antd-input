import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import {getFieldConfig} from "../../utils/configUtils";
import {getFieldPath, getFieldPathLabels} from "../../utils/ruleUtils";
import {truncateString} from "../../utils/stuff";
import {useOnPropsChanged} from "../../utils/reactUtils";
import last from "lodash/last";
import keys from "lodash/keys";


export default class Field extends PureComponent {
  static propTypes = {
    id: PropTypes.string,
    groupId: PropTypes.string,
    config: PropTypes.object.isRequired,
    selectedField: PropTypes.string,
    parentField: PropTypes.string,
    customProps: PropTypes.object,
    readonly: PropTypes.bool,
    isValue: PropTypes.bool,
    typeData: PropTypes.string,
    arrayModel: PropTypes.array,
    dataType: PropTypes.string,
    searchObject: PropTypes.func,
    typeModelOptions: PropTypes.array,
    modeQueryOptions: PropTypes.array,
    setField: PropTypes.func.isRequired,
    treeProject: PropTypes.object,
  };

  constructor(props) {
    super(props);
    useOnPropsChanged(this);

    this.onPropsChanged(props);
  }

  onPropsChanged(nextProps) {
    const prevProps = this.props;
    const keysForMeta = ["selectedField", "config", "parentField"];
    const needUpdateMeta = !this.meta || keysForMeta.map(k => (nextProps[k] !== prevProps[k])).filter(ch => ch).length > 0;

    if (needUpdateMeta) {
      this.meta = this.getMeta(nextProps);
    }
  }

  getMeta({selectedField, config, parentField, isValue, arrayModel, typeData, dataType}) {
    const selectedKey = selectedField;
    const {maxLabelsLength, fieldSeparatorDisplay, fieldPlaceholder, fieldSeparator, valuePlaceholder} = config.settings;
    const isFieldSelected = !!selectedField;
    const placeholder = isValue ? truncateString(valuePlaceholder, maxLabelsLength) : !isFieldSelected ? truncateString(fieldPlaceholder, maxLabelsLength) : null;
    const currField = isFieldSelected ? getFieldConfig(config, selectedKey) : null;
    const selectedOpts = currField || {};

    const selectedKeys = getFieldPath(selectedKey, config);
    const selectedPath = getFieldPath(selectedKey, config, true);
    const selectedLabel = this.getFieldLabel(currField, selectedKey, config);
    const partsLabels = getFieldPathLabels(selectedKey, config);
    let selectedFullLabel = partsLabels ? partsLabels.join(fieldSeparatorDisplay) : null;
    if (selectedFullLabel == selectedLabel || parentField)
      selectedFullLabel = null;
    const selectedAltLabel = selectedOpts.label2;

    const parentFieldPath = typeof parentField == "string" ? parentField.split(fieldSeparator) : parentField;
    const parentFieldConfig = parentField ? getFieldConfig(config, parentField) : null;
    const sourceFields = parentField ? parentFieldConfig && parentFieldConfig.subfields : config.fields;
    const items = this.buildOptions(parentFieldPath, config, sourceFields, parentFieldPath);

    return {
      placeholder, items, parentField,
      arrayModel, dataType,
      selectedKey, selectedKeys, selectedPath, selectedLabel, selectedOpts, selectedAltLabel, selectedFullLabel,
    };
  }

  getFieldLabel(fieldOpts, field, config) {
    if (!field) return null;
    let fieldSeparator = config.settings.fieldSeparator;
    let maxLabelsLength = config.settings.maxLabelsLength;
    const fieldParts = Array.isArray(field) ? field : typeof field === 'string' ? field?.split(fieldSeparator) : [];
    let label = fieldOpts && fieldOpts.label || last(fieldParts);
    label = truncateString(label, maxLabelsLength);
    return label;
  }

  buildOptions(parentFieldPath, config, fields, path = null, optGroupLabel = null) {
    if (!fields)
      return null;
    const {fieldSeparator, fieldSeparatorDisplay} = config.settings;
    const prefix = path ? path.join(fieldSeparator) + fieldSeparator : "";

    return keys(fields).map(fieldKey => {
      const field = fields[fieldKey];
      const label = this.getFieldLabel(field, fieldKey, config);
      const partsLabels = getFieldPathLabels(prefix+fieldKey, config);
      let fullLabel = partsLabels.join(fieldSeparatorDisplay);
      if (fullLabel == label || parentFieldPath)
        fullLabel = null;
      const altLabel = field.label2;
      const tooltip = field.tooltip;
      const subpath = (path ? path : []).concat(fieldKey);
      const disabled = field.disabled;
            
      if (field.hideForSelect)
        return undefined;

      if (field.type == "!struct") {
        return {
          disabled,
          key: fieldKey,
          path: prefix+fieldKey,
          label,
          fullLabel,
          altLabel,
          tooltip,
          items: this.buildOptions(parentFieldPath, config, field.subfields, subpath, label)
        };
      } else {
        return {
          disabled,
          key: fieldKey,
          path: prefix+fieldKey,
          label,
          fullLabel,
          altLabel,
          tooltip,
          grouplabel: optGroupLabel
        };
      }
    }).filter(o => !!o);
  }

  render() {
    const {config, customProps, setField, readonly, id, groupId, searchObject, typeModelOptions, modeQueryOptions, isValue, treeProject, arrayModel, typeData, dataType} = this.props;
    const {renderField} = config.settings;
    const renderProps = {
      id,
      groupId,
      config, 
      customProps, 
      readonly,
      setField,
      searchObject,
      typeModelOptions,
      modeQueryOptions,
      treeProject,
      isValue,
      arrayModel,
      dataType,
      typeData,
      ...this.meta
    };
    return renderField(renderProps);
  }

}
