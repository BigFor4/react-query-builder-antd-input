import React, { PureComponent } from "react";
import { Tooltip, Select, Input } from "antd";
import { BUILT_IN_PLACEMENTS } from "../../../../utils/domUtils";
import PropTypes from "prop-types";
const { Option, OptGroup } = Select;


export default class FieldSelect extends PureComponent {
  static propTypes = {
    config: PropTypes.object.isRequired,
    customProps: PropTypes.object,
    items: PropTypes.array.isRequired,
    placeholder: PropTypes.string,
    selectedKey: PropTypes.string,
    selectedKeys: PropTypes.array,
    selectedPath: PropTypes.array,
    selectedLabel: PropTypes.string,
    selectedAltLabel: PropTypes.string,
    selectedFullLabel: PropTypes.string,
    selectedOpts: PropTypes.object,
    readonly: PropTypes.bool,
    //actions
    setField: PropTypes.func.isRequired,
  };

  onChange = (key) => {
    this.props.setField(key);
  };
  onChangeInput = (e) => {
    const key = e.target.value;
    this.props.setField(key);
  };
  filterOption = (input, option) => {
    const dataForFilter = option;
    const keysForFilter = ["title", "value", "grouplabel", "label"];
    const valueForFilter = keysForFilter
      .map(k => (typeof dataForFilter[k] == "string" ? dataForFilter[k] : ""))
      .join("\0");
    return valueForFilter.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  render() {
    const {
      config, customProps, items, placeholder, isSelect,
      selectedKey, selectedLabel, selectedAltLabel, selectedFullLabel, readonly,
    } = this.props;
    const dropdownPlacement = config.settings.dropdownPlacement;
    const dropdownAlign = dropdownPlacement ? BUILT_IN_PLACEMENTS[dropdownPlacement] : undefined;
    let tooltipText = selectedAltLabel || selectedFullLabel;
    if (tooltipText == selectedLabel)
      tooltipText = null;

    const fieldSelectItems = this.renderSelectItems(items);

    let res = isSelect ? (
      <Select
        dropdownAlign={dropdownAlign}
        dropdownMatchSelectWidth={false}
        style={{ width: 150 }}
        placeholder={placeholder}
        onChange={this.onChange}
        value={selectedKey || undefined}
        filterOption={this.filterOption}
        disabled={readonly}
        {...customProps}
      >{fieldSelectItems}</Select>
    ) : <Input style={{ width: 150, marginLeft: 10 }}
      placeholder={placeholder}
      onChange={this.onChangeInput}
      value={selectedKey || undefined}
      disabled={readonly}
      {...customProps}></Input>;

    return res;
  }

  renderSelectItems(fields, level = 0) {
    return fields?.map(field => {
      const { items, key, path, label, fullLabel, altLabel, tooltip, grouplabel, disabled } = field;
      const groupPrefix = level > 0 ? "\u00A0\u00A0".repeat(level) : "";
      const prefix = level > 1 ? "\u00A0\u00A0".repeat(level - 1) : "";
      const pathKey = path || key;
      if (items) {
        const simpleItems = items.filter(it => !it.items);
        const complexItems = items.filter(it => !!it.items);
        const gr = simpleItems.length
          ? [<OptGroup
            key={pathKey}
            label={groupPrefix + label}
          >{this.renderSelectItems(simpleItems, level + 1)}</OptGroup>]
          : [];
        const list = complexItems.length ? this.renderSelectItems(complexItems, level + 1) : [];
        return [...gr, ...list];
      } else {
        const option = tooltip ? <Tooltip title={tooltip}>{prefix + label}</Tooltip> : prefix + label;
        return <Option
          key={pathKey}
          value={pathKey}
          title={altLabel}
          grouplabel={grouplabel}
          label={label}
          disabled={disabled}
        >
          {option}
        </Option>;
      }
    }).flat(Infinity);
  }

}