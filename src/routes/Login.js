import React from "react";
import Login from "../components/Login.jsx";
import NavBar from "../components/NavBar.js";

const Log = () => {
  return (
    <div>
      <NavBar isProfile={true} />
      <Login />
    </div>
  );
};

export default Log;
