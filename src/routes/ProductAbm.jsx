import React from "react";
import ProductsForm from "../components/ProductForm.jsx";
import CategoriaForm from "../components/CategoriaForm.jsx";
import UserRoles from "../components/UserRoles";

const Products = () => {
  return (
    <div>
      <ProductsForm />
      <CategoriaForm />
      <UserRoles />

    </div>
  );
};

export default Products;
