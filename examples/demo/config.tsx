import React, { Component } from "react";
import {
  BasicConfig, BasicFuncs,
  Operators, Widgets, Fields, Config, Types, Conjunctions, Settings, LocaleSettings, Funcs,
} from "react-query-builder-antd-input";
import AntdConfig from "react-query-builder-antd-input/config/antd";
import { localizers } from "./localizers";

const skinToConfig: Record<string, Config> = {
  vanilla: BasicConfig,
  antd: AntdConfig,
};

type Lang = keyof typeof localizers;

export default (skin: string, lang: Lang = "en") => {
  const InitialConfig = skinToConfig[skin] as BasicConfig;

  const conjunctions: Conjunctions = {
    ...InitialConfig.conjunctions,
    "NOR": {
      "label": "Nor",
      "mongoConj": "$nor",
      "jsonLogicConj": "nor",
      "sqlConj": "NOR",
      "spelConj": "nor",
      "formatConj": (children, conj, not, isForDisplay) => `(${children.join(` ${conj} `)})`,
      "sqlFormatConj": (children, conj, not) => `(${children.join(` ${conj} `)})`,
      "spelFormatConj": (children, conj, not) => `(${children.join(` ${conj} `)})`,
    },
    "XOR": {
      "label": "Xor",
      "mongoConj": "$xor",
      "jsonLogicConj": "xor",
      "sqlConj": "XOR",
      "spelConj": "xor",
      "formatConj": (children, conj, not, isForDisplay) => `(${children.join(` ${conj} `)})`,
      "sqlFormatConj": (children, conj, not) => `(${children.join(` ${conj} `)})`,
      "spelFormatConj": (children, conj, not) => `(${children.join(` ${conj} `)})`,
    }
  };
  const operators: Operators = {
    ...InitialConfig.operators
  };


  const widgets: Widgets = {
    ...InitialConfig.widgets,
    text: {
      ...InitialConfig.widgets.text
    },
    textarea: {
      ...InitialConfig.widgets.textarea,
      maxRows: 3
    },
  };


  const types: Types = {
    ...InitialConfig.types,
    text: {
      ...InitialConfig.types.text,
      excludeOperators: ["proximity"],
    },
  };
  const localeSettings: LocaleSettings = localizers[lang];

  const settings: Settings = {
    ...InitialConfig.settings,
    ...localeSettings,
    defaultSliderWidth: "200px",
    defaultSelectWidth: "200px",
    defaultSearchWidth: "100px",
    defaultMaxRows: 5,
    valueSourcesInfo: {
      value: {
        label: "Value"
      },
      field: {
        label: "Field",
        widget: "field",
      }
    },
    maxNesting: 5,
    canLeaveEmptyGroup: true,
    shouldCreateEmptyGroup: false,
    showErrorMessage: true,
  };


  const fields: Fields = {};
  const funcs: Funcs = {
    ...BasicFuncs
  };


  const config: Config = {
    conjunctions,
    operators,
    widgets,
    types,
    settings,
    fields,
    funcs,
  };

  return config;
};

