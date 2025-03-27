import React, { useState, useEffect } from "react";
import "./index.css";
import Home from "./routes/Home";
import Scroll from "./components/Scroll";
import { Route, Routes } from "react-router-dom";
import Preloader from "../src/components/PreLoader";

function App() {
  const [load, upadateLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      upadateLoad(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);


  return (
  
    <div className="App" id={load ? "no-scroll" : "scroll"}>
      <Preloader load={load} />
        <Scroll />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    
  )
}
export default App;