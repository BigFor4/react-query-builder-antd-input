import React, { PureComponent } from "react";
import { Tooltip, Select, Input, Spin, Button, Tree, Modal, Empty } from "antd";
import { BUILT_IN_PLACEMENTS } from "../../../../utils/domUtils";
import PropTypes, { array } from "prop-types";
import debounce from 'lodash/debounce';
const { Option, OptGroup } = Select;
const { DirectoryTree } = Tree

const isModel = (node) => {
  return !node ? false : (node && node.modelId) ? true : false;
}

const traversalTree = (data, parentKey) => {
  return data.map(item => {
    if (item.children) {
      return {
        ...item,
        children: traversalTree(item.children, item.key),
        parentKey,
        isLeaf: isModel(item) ? true : item.isLeaf,
      };
    }
    return {
      ...item,
      parentKey,
      isLeaf: isModel(item) ? true : item.isLeaf,
    };
  });
}
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
    arrayModel: PropTypes.array,
    treeProject: PropTypes.object,
    typeData: PropTypes.string
  };

  state = {
    listProjectOption: [],
    lastFetchId: 0,
    fetching: false,
    dropdown: false,
    searchValue: this.props.selectedKey?.toString() || null,
    type: this.props.selectedKey?.toString() || 'attribute',
    modelVisible: false,
    checkedNodes: Array.isArray(this.props.arrayModel) ? this.props.arrayModel : [],
    checkedNodesOld: Array.isArray(this.props.arrayModel) ? this.props.arrayModel : [],
  };
  onChange = (value) => {
    if (this.props.isValue === 'attribute' || this.props.isValue === 'operator') {
      this.props.setField(value);
    } else {
      this.props.setField({ value, type: this.props.isValue, arrayModel: this.state.checkedNodes});
    }
  };

  onChangeInput = (e) => {
    const value = e.target.value;
    if (this.props.isValue === 'attribute' || this.props.isValue === 'operator') {
      this.props.setField(value);
    } else {
      this.props.setField({ value, type: this.props.isValue, arrayModel: this.state.checkedNodes });
    }
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
  onCheck = (checkedKeys) => {
    this.setState({ checkedNodes: checkedKeys })
  }

  onClickHideShowModal = (data) => {
    this.setState({ modelVisible: data })
  }

  onOk = () => {
    this.setState({ checkedNodesOld: this.state.checkedNodes })
    this.props.setField({ value: this.props.selectedKey, type: this.props.isValue, arrayModel: this.state.checkedNodes});
    this.onClickHideShowModal(false)
  }

  render() {
    const {
      config, customProps, items, placeholder,
      selectedKey, selectedLabel, selectedAltLabel, selectedFullLabel, readonly,
      isValue, treeProject,
      typeData
    } = this.props;
    const dropdownPlacement = config.settings.dropdownPlacement;
    const dropdownAlign = dropdownPlacement ? BUILT_IN_PLACEMENTS[dropdownPlacement] : undefined;
    let tooltipText = selectedAltLabel || selectedFullLabel;
    if (tooltipText === selectedLabel)
      tooltipText = null;
    const treeData = traversalTree(treeProject || [])
    const fieldSelectItems = this.renderSelectItems(items);
    let res;
    switch (true) {
      case isValue === 'type':
        res = (
          <>
            <Select
              dropdownAlign={dropdownAlign}
              dropdownMatchSelectWidth={false}
              style={{ width: 100, marginLeft: 10 }}
              placeholder={'Type'}
              onChange={this.onChange}
              value={typeof selectedKey === 'string' ? selectedKey : undefined}
              filterOption={this.filterOption}
              disabled={readonly}
              {...customProps}
            >
              <Option label={'Attribute'} key={'attribute'} value={'attribute'}>
                Attribute
              </Option>
              <Option label={'Folder'} key={'folder'} value={'folder'}>
                Folder
              </Option>
            </Select>
            {
              typeData === 'folder' && (<Button style={{ marginLeft: 10 }} onClick={() => this.onClickHideShowModal(true)}>
                Data tree
              </Button>)
            }
          </>
        );
        break;
      case isValue === 'operator':
        res = typeData !== 'folder' && (
          <Select
            dropdownAlign={dropdownAlign}
            dropdownMatchSelectWidth={false}
            style={{ width: 150, marginLeft: 10 }}
            placeholder={placeholder}
            onChange={this.onChange}
            value={typeof selectedKey === 'string' ? selectedKey : undefined}
            filterOption={this.filterOption}
            disabled={readonly}
            {...customProps}
          >
            {fieldSelectItems}
          </Select>
        );
        break;
      case (isValue === 'value' || !this.props.searchObject):
        res = typeData !== 'folder' && (
          <Input
            style={{ width: 150, marginLeft: 10 }}
            placeholder={'Value'}
            onChange={this.onChangeInput}
            value={typeof selectedKey === 'string' ? selectedKey : undefined}
            disabled={readonly}
            {...customProps}
          />
        );
        break;

      case isValue === 'attribute':
        res = typeData !== 'folder' && (
          <Select
            allowClear
            style={{ width: 150, marginLeft: 10 }}
            disabled={readonly}
            showSearch
            value={typeof selectedKey === 'string' ? selectedKey : undefined}
            optionFilterProp="children"
            placeholder={'Attribute'}
            notFoundContent={this.state.fetching ? <Spin size="small" /> : null}
            filterOption={false}
            onChange={this.onChange}
            onSearch={this.handleSearchObjectInfo}
            open={this.state.dropdown}
            onFocus={() => this.setState({ dropdown: true })}
            onBlur={() => this.setState({ dropdown: false })}
            onDropdownVisibleChange={this.handleClick}
            onClear={() => {
              this.setState({ searchValue: '' });
              this.props.setField('');
            }}
          >
            {this.state.searchValue ? (
              <Option label={this.state.searchValue} key={'searchValue'} value={this.state.searchValue}>
                {this.state.searchValue}
              </Option>
            ) : null}
            {this.state.listProjectOption &&
              this.state.listProjectOption.map((d) => (
                <Option label={this.splitTextObjectInfo(d.inf)} key={d?._id || d?.id} value={this.splitTextObjectInfo(d.inf)}>
                  {this.splitTextObjectInfo(d.inf)}
                </Option>
              ))}
          </Select>
        );
        break;
      default:
        res = <div></div>
        break
    }
    return <div>
      {res}
      <Modal
        title="Select 4D Node in Data Tree"
        centered
        zIndex={10001}
        visible={this.state.modelVisible}
        open={this.state.modelVisible}
        onCancel={() => {
          this.onClickHideShowModal(false)
          this.setState({ checkedNodes: this.state.checkedNodesOld })
        }}
        onOk={() => this.onOk()}
        style={{
          maxHeight: 'calc(100vh - 20px)',
        }}
        bodyStyle={{
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto',
        }}>
        {treeData?.length ? (
          <DirectoryTree
            multiple
            defaultExpandAll
            checkable
            checkedKeys={this.state.checkedNodes}
            treeData={treeData}
            onCheck={this.onCheck}
          />
        ) : (
          <Empty />
        )}
      </Modal>
    </div>;
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
