import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Query, Builder, Utils,
  ImmutableTree, Config, BuilderProps, JsonTree, ActionMeta, Actions
} from "react-query-builder-antd-input";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import axios from "axios";
import { treeProject } from "./init_value";
const stringify = JSON.stringify;
const { getTree, loadTree, uuid } = Utils;
const preStyle = { backgroundColor: "darkgrey", margin: "10px", padding: "10px" };

const initialSkin = "antd";
const emptyInitValue: JsonTree = { id: uuid(), type: "group" };
const loadedConfig = loadConfig(initialSkin);
let initValue = emptyInitValue;
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
  console.log(treeProject)
  const renderBuilder = useCallback((bprops: BuilderProps) => {
    memo.current._actions = bprops.actions;
    return (
      <div className="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...bprops}
            searchObject={searchObject}
            treeProject={treeProject}
          />
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
  const searchObject = async (value) => {
    try {
      const response = await axios.post('https://testapi.xd-twin.io/searchObjectInfor', {
        projectId: '655c8616c070a1001264a8f8',
        search: value
      }, {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1OGQzNTgyYzllNDNmMDAxMmEyMWQ0YSIsImlhdCI6MTcwMzc1MzE2MiwiZXhwIjoxNzA2MzQ1MTYyfQ.lBphR-qdLuJTS11x3Pi4mkefZW-oNN7NWFSy9yzZ1AM",
        },
      });
      if (response.data) {
        return response.data;
      } else {
        console.error('Unexpected response structure:', response);
        return [];
      }
    } catch (error) {
      console.error('Error in searchObject:', error);
      return [];
    }
  };

  return (
    <div>
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
