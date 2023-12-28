import React, { PureComponent } from "react";
import { Tooltip, Select, Input, Spin } from "antd";
import { BUILT_IN_PLACEMENTS } from "../../../../utils/domUtils";
import PropTypes from "prop-types";
import debounce from 'lodash/debounce';
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
    setField: PropTypes.func.isRequired,
    searchObject: PropTypes.func,
    isValue: PropTypes.bool,
  };

  state = {
    listProjectOption: [],
    lastFetchId: 0,
    fetching: false,
    dropdown: false,
    searchValue: this.props.selectedKey?.toString() || null
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
      .map(k => (typeof dataForFilter[k] === "string" ? dataForFilter[k] : ""))
      .join("\0");
    return valueForFilter.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  handleSearchObjectInfo = debounce(async (value) => {
    this.setState({ listProjectOption: [], fetching: true, searchValue: value || null });
    this.props.setField(value);
    if (value && value !== "") {
      this.setState((prevState) => ({ lastFetchId: prevState.lastFetchId + 1 }));
      const fetchId = this.state.lastFetchId;
      try {
        const res = await this.props.searchObject(value);
        if (fetchId !== this.state.lastFetchId) {
          return;
        }
        this.setState({ listProjectOption: res, fetching: false });
      } catch (error) {
        this.setState({ fetching: false });
      }
    }
  }, 500);

  splitAtFirstSpecialCharacter = (str, character) => {
    if (!str) return [];
    var i = str.indexOf(character);
    if (i > 0) {
      return [str.substring(0, i), str.substring(i + 1)];
    } else return [str];
  };

  splitTextObjectInfo = (text) => {
    const value = this.splitAtFirstSpecialCharacter(text, '=');
    return value ? value[0] : '';
  };

  handleClick = () => {
    this.setState((prevState) => ({ dropdown: !prevState.dropdown }));
  };

  render() {
    const {
      config, customProps, items, placeholder, isSelect,
      selectedKey, selectedLabel, selectedAltLabel, selectedFullLabel, readonly,
      isValue
    } = this.props;
    const dropdownPlacement = config.settings.dropdownPlacement;
    const dropdownAlign = dropdownPlacement ? BUILT_IN_PLACEMENTS[dropdownPlacement] : undefined;
    let tooltipText = selectedAltLabel || selectedFullLabel;
    if (tooltipText === selectedLabel)
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
    ) : isValue || !this.props.searchObject ? <Input style={{ width: 150, marginLeft: 10 }}
      placeholder={placeholder}
      onChange={this.onChangeInput}
      value={selectedKey || undefined}
      disabled={readonly}
      {...customProps}></Input> : <Select
        allowClear
        style={{ width: 150 }}
        disabled={readonly}
        showSearch
        value={selectedKey || undefined}
        optionFilterProp="children"
        placeholder={placeholder}
        notFoundContent={this.state.fetching ? <Spin size="small" /> : null}
        filterOption={false}
        onChange={this.onChange}
        onSearch={this.handleSearchObjectInfo}
        open={this.state.dropdown}
        onFocus={() => this.setState({ dropdown: true })}
        onBlur={() => this.setState({ dropdown: false })}
        onDropdownVisibleChange={this.handleClick}
        onClear={() => {
          this.setState({ searchValue: '' })
          this.props.setField('');
        }}
      >
      {
        this.state.searchValue ? <Option label={this.state.searchValue} key={'searchValue'} value={this.state.searchValue}>
          {this.state.searchValue}
        </Option> : null
      }
      {this.state.listProjectOption &&
        this.state.listProjectOption.map(d => (
          <Option label={this.splitTextObjectInfo(d.inf)} key={d?._id || d?.id} value={d?._id || d?.id}>
            {this.splitTextObjectInfo(d.inf)}
          </Option>
        ))}
    </Select>;

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
