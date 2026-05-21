import React from "react";
import NavBar from "../components/NavBar";
import ProductsForm from "../components/ProductForm.jsx";
import CategoriaForm from "../components/CategoriaForm.jsx";
import UserRoles from "../components/UserRoles";

const Products = () => {
  return (
    <>
      <NavBar />

      <div className="admin-page">
        <ProductsForm />
        <CategoriaForm />
        <UserRoles />
      </div>
    </>
  );
};

export default Products;