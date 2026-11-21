import React from "react";
import { Navigate } from "react-router-dom";
import useIsAdmin from "../utils/useIsAdmin";

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#a4a4b2" }}>
        Verificando permisos...
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
