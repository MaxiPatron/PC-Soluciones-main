import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import "./productForm.css";

const ProductForm = () => {
  const [product, setProduct] = useState({
    name: "",
    slug: "",
    description: "",
    category_id: "",
    brand: "",
    price: "",
    stock: "",
    image_url: "",
    active: true,
    featured: false,
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const handleEdit = (prod) => {
    setProduct({
      name: prod.name || "",
      slug: prod.slug || "",
      description: prod.description || "",
      category_id: prod.category_id || "",
      brand: prod.brand || "",
      price: prod.price || "",
      stock: prod.stock || "",
      image_url: prod.image_url || "",
      active: prod.active,
      featured: prod.featured,
    });

    setEditingId(prod.id);
  };

  const createSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replaceAll(" ", "-")
      .replace(/[^\w-]+/g, "");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      slug: name === "name" ? createSlug(value) : prev.slug,
    }));
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (!error) setCategories(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const productToSave = {
      ...product,
      category_id: product.category_id ? Number(product.category_id) : null,
      price: Number(product.price),
      stock: Number(product.stock),
    };

    const { error } = editingId
      ? await supabase.from("products").update(productToSave).eq("id", editingId)
      : await supabase.from("products").insert([productToSave]);

    if (error) {
      console.error(error);
      alert("Error al guardar producto");
      return;
    }

    alert(editingId ? "Producto actualizado" : "Producto creado");

    setProduct({
      name: "",
      slug: "",
      description: "",
      category_id: "",
      brand: "",
      price: "",
      stock: "",
      image_url: "",
      active: true,
      featured: false,
    });

    setEditingId(null);
    fetchProducts();
  };
  
  const handleDelete = async (id) => {
  const confirmDelete = window.confirm("¿Seguro que querés eliminar este producto?");

  if (!confirmDelete) return;

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error(error);
    alert("Error al eliminar producto");
    return;
  }

  fetchProducts();
};

  return (
    <div className="container mt-5">
      <h2>Cargar Producto</h2>

      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Nombre</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={product.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Slug</label>
          <input
            type="text"
            className="form-control"
            name="slug"
            value={product.slug}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Categoría</label>
          <select
            className="form-control"
            name="category_id"
            value={product.category_id}
            onChange={handleChange}
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label">Marca</label>
          <input
            type="text"
            className="form-control"
            name="brand"
            value={product.brand}
            onChange={handleChange}
          />
        </div>

        <div className="col-12">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            name="description"
            value={product.description}
            onChange={handleChange}
            rows="2"
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Precio</label>
          <input
            type="number"
            className="form-control"
            name="price"
            value={product.price}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Stock</label>
          <input
            type="number"
            className="form-control"
            name="stock"
            value={product.stock}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Imagen URL</label>
          <input
            type="text"
            className="form-control"
            name="image_url"
            value={product.image_url}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <label>
            <input
              type="checkbox"
              name="active"
              checked={product.active}
              onChange={handleChange}
            />
            Activo
          </label>
        </div>

        <div className="col-md-3">
          <label>
            <input
              type="checkbox"
              name="featured"
              checked={product.featured}
              onChange={handleChange}
            />
            Destacado
          </label>
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary">
            Cargar Producto
          </button>
        </div>
      </form>

      <hr className="my-5" />

      <h3>Productos Cargados</h3>

      <div className="table-responsive">
        <table className="table table-dark table-striped mt-3">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Categoría</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {products.map((prod) => (
              <tr key={prod.id}>
                <td>{prod.name}</td>
                <td>{prod.brand}</td>
                <td>${prod.price}</td>
                <td>{prod.stock}</td>
                <td>{prod.categories?.name || "Sin categoría"}</td>
                <td>{prod.active ? "Sí" : "No"}</td>
                <td className="d-flex gap-2">
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleEdit(prod)}
                  >
                    Modificar
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(prod.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductForm;