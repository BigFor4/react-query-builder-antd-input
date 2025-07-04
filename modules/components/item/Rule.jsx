import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import RuleContainer from "../containers/RuleContainer";
import Draggable from "../containers/Draggable";
import OperatorWrapper from "../rule/OperatorWrapper";
import FieldWrapper from "../rule/FieldWrapper";
import OperatorOptions from "../rule/OperatorOptions";
import { getFieldConfig, getOperatorConfig, getFieldWidgetConfig } from "../../utils/configUtils";
import { getFieldPathLabels, getValueSourcesForFieldOp } from "../../utils/ruleUtils";
import { useOnPropsChanged } from "../../utils/reactUtils";
import { Col, DragIcon, dummyFn, ConfirmFn } from "../utils";
import { Input } from "antd";
import { findObjectById } from "../../import";
const classNames = require("classnames");


@RuleContainer
@Draggable("rule")
@ConfirmFn
class Rule extends PureComponent {
  static propTypes = {
    id: PropTypes.string.isRequired,
    groupId: PropTypes.string,
    selectedField: PropTypes.string,
    selectedOperator: PropTypes.string,
    operatorOptions: PropTypes.object,
    config: PropTypes.object.isRequired,
    value: PropTypes.any, //depends on widget
    valueSrc: PropTypes.any,
    asyncListValues: PropTypes.array,
    isDraggingMe: PropTypes.bool,
    isDraggingTempo: PropTypes.bool,
    parentField: PropTypes.string, //from RuleGroup
    valueError: PropTypes.any,
    isLocked: PropTypes.bool,
    isTrueLocked: PropTypes.bool,
    handleDraggerMouseDown: PropTypes.func,
    setField: PropTypes.func,
    setOperator: PropTypes.func,
    setOperatorOption: PropTypes.func,
    setLock: PropTypes.func,
    removeSelf: PropTypes.func,
    setValue: PropTypes.func,
    setValueSrc: PropTypes.func,
    reordableNodesCnt: PropTypes.number,
    tree: PropTypes.any,
    searchObject: PropTypes.func,
    typeModelOptions: PropTypes.array,
    modeQueryOptions: PropTypes.array,
    treeProject: PropTypes.array,
  };

  constructor(props) {
    super(props);
    useOnPropsChanged(this);
    this.removeSelf = this.removeSelf.bind(this);
    this.setLock = this.setLock.bind(this);

    this.onPropsChanged(props);
  }

  onPropsChanged(nextProps) {
    const prevProps = this.props;
    const keysForMeta = ["selectedField", "selectedOperator", "config", "reordableNodesCnt", "isLocked"];
    const needUpdateMeta = !this.meta || keysForMeta.map(k => (nextProps[k] !== prevProps[k])).filter(ch => ch).length > 0;

    if (needUpdateMeta) {
      this.meta = this.getMeta(nextProps);
    }
  }

  getMeta({ selectedField, selectedOperator, config, reordableNodesCnt, isLocked, id }) {
    const selectedFieldPartsLabels = getFieldPathLabels(selectedField, config);
    const selectedFieldConfig = findObjectById(this.props.tree.toJS(), id);
    const isSelectedGroup = selectedFieldConfig && selectedFieldConfig.type == "!struct";
    const isFieldAndOpSelected = selectedOperator && !isSelectedGroup;
    const selectedOperatorConfig = getOperatorConfig(config, selectedOperator, selectedField);
    const selectedOperatorHasOptions = selectedOperatorConfig && selectedOperatorConfig.options != null;
    const selectedFieldWidgetConfig = getFieldWidgetConfig(config, selectedField, selectedOperator) || {};
    const hideOperator = selectedFieldWidgetConfig.hideOperator;
    const showDragIcon = config.settings.canReorder && reordableNodesCnt > 1 && !isLocked;
    const showOperator = !hideOperator;
    const showOperatorLabel = hideOperator && selectedFieldWidgetConfig.operatorInlineLabel;
    const showWidget = true;
    const showOperatorOptions = isFieldAndOpSelected && selectedOperatorHasOptions;

    return {
      selectedFieldPartsLabels, selectedFieldWidgetConfig,
      showDragIcon, showOperator, showOperatorLabel, showWidget, showOperatorOptions
    };
  }

  setLock(lock) {
    this.props.setLock(lock);
  }

  removeSelf() {
    const { confirmFn } = this.props;
    const { renderConfirm, removeRuleConfirmOptions: confirmOptions } = this.props.config.settings;
    const doRemove = () => {
      this.props.removeSelf();
    };
    if (confirmOptions && !this.isEmptyCurrentRule()) {
      renderConfirm({
        ...confirmOptions,
        onOk: doRemove,
        onCancel: null,
        confirmFn: confirmFn
      });
    } else {
      doRemove();
    }
  }

  isEmptyCurrentRule() {
    return !(
      this.props.selectedField !== null
      && this.props.selectedOperator !== null
      && this.props.value.filter((val) => val !== undefined).size > 0
    );
  }
  renderType() {
    const { config, isLocked } = this.props;
    const { immutableFieldsMode } = config.settings;
    const value = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.type : this.props.value?.toJS()?.[0]?.type : '';
    const arrayModel = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.arrayModel : this.props.value?.toJS()?.[0]?.arrayModel : '';
    const dataType = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.dataType : this.props.value?.toJS()?.[0]?.dataType : '';
    return <FieldWrapper
      key="type"
      classname={"rule--value"}
      config={config}
      selectedField={value}
      isValue={'type'}
      typeData={value}
      dataType={dataType}
      arrayModel={arrayModel}
      setField={!immutableFieldsMode ? this.props.setValue : dummyFn}
      parentField={this.props.parentField}
      readonly={immutableFieldsMode || isLocked}
      id={this.props.id}
      groupId={this.props.groupId}
      searchObject={this.props.searchObject}
      typeModelOptions={this.props.typeModelOptions}
      modeQueryOptions={this.props.modeQueryOptions}
      treeProject={this.props.treeProject}
    />;
  }

  renderField() {
    const { config, isLocked } = this.props;
    const { immutableFieldsMode } = config.settings;
    const typeData = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.type : this.props.value?.toJS()?.[0]?.type : '';
    return <FieldWrapper
      key="field"
      classname={"rule--field"}
      config={config}
      isValue={'attribute'}
      typeData={typeData}
      selectedField={this.props.selectedField}
      setField={!immutableFieldsMode ? this.props.setField : dummyFn}
      parentField={this.props.parentField}
      readonly={immutableFieldsMode || isLocked}
      id={this.props.id}
      groupId={this.props.groupId}
      searchObject={this.props.searchObject}
      typeModelOptions={this.props.typeModelOptions}
      modeQueryOptions={this.props.modeQueryOptions}
      treeProject={this.props.treeProject}
    />;
  }
  renderWidget() {
    const { config, isLocked } = this.props;
    const { immutableFieldsMode } = config.settings;
    const typeData = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.type : this.props.value?.toJS()?.[0]?.type : '';
    const value = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.value : this.props.value?.toJS()?.[0]?.value : '';
    return <FieldWrapper
      key="values"
      classname={"rule--value"}
      config={config}
      selectedField={value}
      isValue={'value'}
      typeData={typeData}
      setField={!immutableFieldsMode ? this.props.setValue : dummyFn}
      parentField={this.props.parentField}
      readonly={immutableFieldsMode || isLocked}
      id={this.props.id}
      groupId={this.props.groupId}
      searchObject={this.props.searchObject}
      typeModelOptions={this.props.typeModelOptions}
      modeQueryOptions={this.props.modeQueryOptions}
      treeProject={this.props.treeProject}
    />;
  }

  renderOperator() {
    const { config, isLocked } = this.props;
    const {
      selectedFieldPartsLabels, selectedFieldWidgetConfig, showOperator, showOperatorLabel
    } = this.meta;
    const { immutableOpsMode } = config.settings;
    const typeData = this.props.value ? Array.isArray(this.props.value) ? this.props.value?.[0]?.type : this.props.value?.toJS()?.[0]?.type : '';
    return <OperatorWrapper
      key="operator"
      config={config}
      typeData={typeData}
      selectedField={this.props.selectedField}
      selectedOperator={this.props.selectedOperator}
      setOperator={!immutableOpsMode ? this.props.setOperator : dummyFn}
      selectedFieldPartsLabels={selectedFieldPartsLabels}
      showOperator={showOperator}
      showOperatorLabel={showOperatorLabel}
      selectedFieldWidgetConfig={selectedFieldWidgetConfig}
      readonly={immutableOpsMode || isLocked}
      id={this.props.id}
      groupId={this.props.groupId}
    />;
  }


  renderOperatorOptions() {
    const { config } = this.props;
    const { showOperatorOptions } = this.meta;
    const { immutableOpsMode, immutableValuesMode } = config.settings;
    if (!showOperatorOptions) return null;

    const opOpts = <OperatorOptions
      key="operatorOptions"
      selectedField={this.props.selectedField}
      selectedOperator={this.props.selectedOperator}
      operatorOptions={this.props.operatorOptions}
      setOperatorOption={!immutableOpsMode ? this.props.setOperatorOption : dummyFn}
      config={config}
      readonly={immutableValuesMode}
    />;

    return (
      <Col key={"op-options-for-" + this.props.selectedOperator} className="rule--operator-options">
        {opOpts}
      </Col>
    );
  }

  renderBeforeWidget() {
    const { config } = this.props;
    const { renderBeforeWidget } = config.settings;
    return renderBeforeWidget
      && <Col key={"before-widget-for-" + this.props.selectedOperator} className="rule--before-widget">
        {typeof renderBeforeWidget === "function" ? renderBeforeWidget(this.props) : renderBeforeWidget}
      </Col>;
  }

  renderAfterWidget() {
    const { config } = this.props;
    const { renderAfterWidget } = config.settings;
    return renderAfterWidget
      && <Col key={"after-widget-for-" + this.props.selectedOperator} className="rule--after-widget">
        {typeof renderAfterWidget === "function" ? renderAfterWidget(this.props) : renderAfterWidget}
      </Col>;
  }

  renderError() {
    const { config, valueError } = this.props;
    const { renderRuleError, showErrorMessage } = config.settings;
    const oneValueError = valueError && valueError.toArray().filter(e => !!e).shift() || null;
    return showErrorMessage && oneValueError
      && <div className="rule--error">
        {renderRuleError ? renderRuleError({ error: oneValueError }) : oneValueError}
      </div>;
  }

  renderDrag() {
    const { showDragIcon } = this.meta;

    return showDragIcon
      && <span
        key="rule-drag-icon"
        className={"qb-drag-handler rule--drag-handler"}
        onMouseDown={this.props.handleDraggerMouseDown}
      ><DragIcon /> </span>;
  }

  renderDel() {
    const { config, isLocked } = this.props;
    const {
      deleteLabel,
      immutableGroupsMode,
      renderButton: Btn,
      canDeleteLocked
    } = config.settings;

    return !immutableGroupsMode && (!isLocked || isLocked && canDeleteLocked) && (
      <Btn
        type="delRule" onClick={this.removeSelf} label={deleteLabel} config={config}
      />
    );
  }

  renderLock() {
    const { config, isLocked, isTrueLocked, id } = this.props;
    const {
      lockLabel, lockedLabel, showLock,
      renderSwitch: Switch
    } = config.settings;

    return showLock && !(isLocked && !isTrueLocked) && (
      <Switch
        type="lock" id={id} value={isLocked} setValue={this.setLock} label={lockLabel} checkedLabel={lockedLabel} hideLabel={true} config={config}
      />
    );
  }

  render() {
    const { config } = this.props;
    const { renderButtonGroup: BtnGrp } = config.settings;

    const parts = [
      this.renderType(),
      this.renderField(),
      this.renderOperator(),
      this.renderBeforeWidget(),
      this.renderWidget(),
      this.renderAfterWidget(),
      this.renderOperatorOptions(),
    ];
    const body = <div key="rule-body" className={classNames("rule--body")}>{parts}</div>;

    const error = this.renderError();
    const drag = this.renderDrag();
    const lock = this.renderLock();
    const del = this.renderDel();

    return (
      <>
        {drag}
        <div className="rule--body--wrapper">
          {body}{error}
        </div>
        <div className="rule--header">
          <BtnGrp config={config}>
            {lock}
            {del}
          </BtnGrp>
        </div>
      </>
    );
  }

}


export default Rule;
