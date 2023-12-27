
import React, {Component, useState} from "react";
import ReactDOM from "react-dom";
import Demo from "./demo/index";

import "../css/antd.less";
import "../css/styles.scss";
import "antd/dist/antd.css";

import { Button } from "antd";
const stringify = JSON.stringify;
const preStyle = {
  backgroundColor: "darkgrey",
  margin: "10px",
  padding: "10px",
};
function App() {
  const [arrayQuery, setArrayQuery] = useState([]);
  const [arrayResultQuery, setArrayResultQuery] = useState([]);
  const addNewQuery = () => {
    setArrayQuery((prev) => [
      ...prev,
      <Demo
        key={arrayQuery.length}
        index={arrayQuery.length}
        setArrayResultQuery={setArrayResultQuery}
        arrayResultQuery={arrayResultQuery}
      />,
    ]);
  };

  return (
    <div className="App" style={{ padding: 5 }}>
      <Button type="primary" onClick={addNewQuery}>
        Add New Query
      </Button>
      {arrayQuery.map((item, index) => (
        <div key={index} style={{ marginTop: 15 }}>
          {item}
        </div>
      ))}
      {/* <div>
        <hr />
        <div>
          Tree:
          <pre style={preStyle}>
            {stringify(arrayResultQuery, undefined, 2)}
          </pre>
        </div>
      </div> */}
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
