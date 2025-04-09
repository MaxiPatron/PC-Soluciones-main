import React from "react";
import { Navigate } from "react-router-dom";
import useIsAdmin from "../utils/useIsAdmin";

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useIsAdmin();

  console.log("AdminRoute cargado");
  console.log("isAdmin:", isAdmin, "loading:", loading);

  if (loading) return <div>Cargando...</div>;

  if (!isAdmin) {
    console.log("No es admin. Redirigiendo...");
    return <Navigate to="/" />;
  }

  console.log("Es admin. Mostrando children");
  return children;
};

export default AdminRoute;