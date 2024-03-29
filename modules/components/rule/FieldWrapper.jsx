import React, { PureComponent } from "react";
import Field from "./Field";
import { Col } from "../utils";


export default class FieldWrapper extends PureComponent {
  render() {
    const { config, selectedField, setField, parentField, classname, readonly, id, groupId, isValue, typeData, searchObject, treeProject, arrayModel } = this.props;
    return (
      <Col className={classname}>
        {config.settings.showLabels
          && <label className="rule--label">{config.settings.fieldLabel}</label>
        }
        <Field
          config={config}
          selectedField={selectedField}
          parentField={parentField}
          setField={setField}
          isValue={isValue}
          typeData={typeData}
          arrayModel={arrayModel}
          customProps={config.settings.customFieldSelectProps}
          readonly={readonly}
          id={id}
          groupId={groupId}
          searchObject={searchObject}
          treeProject={treeProject}
        />
      </Col>
    );
  }
}
