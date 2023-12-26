import React, { PureComponent } from "react";
import map from "lodash/map";
import { Button, Radio } from "antd";
const ButtonGroup = Button.Group;


class ConjsButton extends PureComponent {
  onClick = (_e) => {
    const {setConjunction, item} = this.props;
    const conj = item.key;
    setConjunction(conj);
  };

  render() {
    const {disabled, item} = this.props;
    return (
      <Button
        disabled={disabled}
        type={item.checked ? "primary" : null}
        onClick={this.onClick}
      >{item.label}</Button>
    );
  }
}


export default class ConjsButtons extends PureComponent {
  setNot = (e) => {
    const {setNot, not} = this.props;
    if (setNot)
      setNot(!not);
  };

  render() {
    const {readonly, disabled, conjunctionOptions, config, setConjunction} = this.props;
    const conjsCount = Object.keys(conjunctionOptions).length;
    const lessThenTwo = disabled;
    const {forceShowConj, renderSize} = config.settings;
    const showConj = forceShowConj || conjsCount > 1 && !lessThenTwo;

    return (
      <ButtonGroup
        key="group-conjs-buttons"
        size={renderSize}
        disabled={disabled || readonly}
      >
        {showConj && map(conjunctionOptions, (item, _index) => (readonly || disabled) && !item.checked ? null : (
          <ConjsButton
            key={item.id}
            item={item}
            disabled={disabled || readonly}
            setConjunction={setConjunction}
          />
        ))}
      </ButtonGroup>
    );
  }
}