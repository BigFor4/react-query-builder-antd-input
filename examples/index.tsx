
import React, {Component, useState} from "react";
import ReactDOM from "react-dom";
import Demo from "./demo/index";

import "../css/antd.less";
import "../css/styles.scss";
import "antd/dist/antd.css";

const preStyle = {
  backgroundColor: "darkgrey",
  margin: "10px",
  padding: "10px",
};
function App() {

  return (
    <div className="App" style={{ padding: 5 }}>
      <Demo />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
