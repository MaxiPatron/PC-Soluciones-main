import React, { useState, useEffect } from "react";
import "./index.css";
import Home from "./routes/Home";
import ProductsPage from "./routes/ProductsPage";
import Scroll from "./components/Scroll";
import { Route, Routes } from "react-router-dom";
import Preloader from "../src/components/PreLoader";
import Login from "./routes/Login";
import Profile from "./routes/Profile";
import { AuthProvider } from "./context/AuthContext";
import ProductsForm from "./routes/ProductAbm"
import AdminRoute from "./components/AdminRoute";
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
      <AuthProvider>
        <Preloader load={load} />
        <Scroll />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/ProductsForm"
            element={
              <AdminRoute>
                <ProductsForm />
              </AdminRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </div>
  );
}
export default App;