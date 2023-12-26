import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Query, Builder, Utils,
  ImmutableTree, Config, BuilderProps, JsonTree, ActionMeta, Actions
} from "react-query-builder-antd-input";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import loadedInitValue from "./init_value";
const stringify = JSON.stringify;
const { getTree, loadTree, uuid } = Utils;
const preStyle = { backgroundColor: "darkgrey", margin: "10px", padding: "10px" };

const initialSkin = window._initialSkin || "antd";
const emptyInitValue: JsonTree = { id: uuid(), type: "group" };
const loadedConfig = loadConfig(initialSkin);
let initValue: JsonTree = loadedInitValue && Object.keys(loadedInitValue).length > 0 ? loadedInitValue as JsonTree : emptyInitValue;
let initTree: ImmutableTree;
initTree = loadTree(initValue);


// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent<CustomEventDetail>("update", {
  detail: {
    config: loadedConfig,
    _initTree: initTree,
    _initValue: initValue,
  }
});
window.dispatchEvent(updateEvent);

declare global {
  interface Window {
    _initialSkin: string;
  }
}

interface CustomEventDetail {
  config: Config;
  _initTree: ImmutableTree;
  _initValue: JsonTree;
}

interface DemoQueryBuilderState {
  tree: ImmutableTree;
  config: Config;
  skin: string,
  spelStr: string;
  spelErrors: Array<string>;
}

interface DemoQueryBuilderMemo {
  immutableTree?: ImmutableTree,
  config?: Config,
  _actions?: Actions,
}

const DemoQueryBuilder: React.FC = () => {
  const memo: React.MutableRefObject<DemoQueryBuilderMemo> = useRef({});

  const [state, setState] = useState<DemoQueryBuilderState>({
    tree: initTree,
    config: loadedConfig,
    skin: initialSkin,
    spelStr: "",
    spelErrors: [] as Array<string>
  });

  useEffect(() => {
    window.addEventListener("update", onConfigChanged);
    return () => {
      window.removeEventListener("update", onConfigChanged);
    };
  });


  const onConfigChanged = (e: Event) => {
    const { detail: { config, _initTree, _initValue } } = e as CustomEvent<CustomEventDetail>;
    console.log("Updating config...");
    setState({
      ...state,
      config,
    });
    initTree = _initTree;
    initValue = _initValue;
  };

  const resetValue = () => {
    setState({
      ...state,
      tree: initTree,
    });
  };

  const clearValue = () => {
    setState({
      ...state,
      tree: loadTree(emptyInitValue),
    });
  };

  const renderBuilder = useCallback((bprops: BuilderProps) => {
    memo.current._actions = bprops.actions;
    return (
      <div className="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...bprops} />
        </div>
      </div>
    );
  }, []);

  const onChange = useCallback((immutableTree: ImmutableTree, config: Config, actionMeta?: ActionMeta) => {
    if (actionMeta)
      console.info(actionMeta);
    memo.current.immutableTree = immutableTree;
    memo.current.config = config;
    updateResult();
  }, []);

  const updateResult = throttle(() => {
    setState(prevState => ({ ...prevState, tree: memo.current.immutableTree, config: memo.current.config }));
  }, 100);

  const renderResult = ({ tree: immutableTree, config }: { tree: ImmutableTree, config: Config }) => {
    const treeJs = getTree(immutableTree);

    return (
      <div>
        <hr />
        <div>
          Tree:
          <pre style={preStyle}>
            {stringify(treeJs, undefined, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div>
        <button onClick={resetValue}>reset</button>
        <button onClick={clearValue}>clear</button>
      </div>

      <Query
        {...state.config}
        value={state.tree}
        onChange={onChange}
        renderBuilder={renderBuilder}
      />
      <div className="query-builder-result">
        {renderResult(state)}
      </div>
    </div>
  );
};


export default DemoQueryBuilder;
