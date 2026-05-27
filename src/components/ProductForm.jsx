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
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortPrice, setSortPrice] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [newDollar, setNewDollar] = useState("");
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

  const fetchExchangeRate = async () => {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error al obtener dólar:", error);
      return;
    }

    setExchangeRate(data);
    setNewDollar(data.usd_ars);
  };

  const handleUpdateDollar = async () => {
    const { error } = await supabase
      .from("exchange_rates")
      .update({
        usd_ars: Number(newDollar),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      alert("Error al actualizar dólar");
      return;
    }

    alert("Dólar actualizado");
    fetchExchangeRate();
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchExchangeRate();
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

  const filteredAdminProducts = products
    .filter((prod) =>
      prod.name?.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((prod) =>
      brandFilter ? prod.brand === brandFilter : true
    )
    .filter((prod) =>
      categoryFilter ? String(prod.category_id) === categoryFilter : true
    )
    .sort((a, b) => {
      if (sortPrice === "asc") return Number(a.price) - Number(b.price);
      if (sortPrice === "desc") return Number(b.price) - Number(a.price);
      return 0;
    });

  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  return (
    <div className="container mt-5">
      <h2>Cargar Producto</h2>
      <div className="admin-dollar-card">
        <div>
          <span>Dólar mayorista</span>
          <h3>
            ${exchangeRate ? Number(exchangeRate.usd_ars).toLocaleString("es-AR") : "Cargando..."}
          </h3>
          <p>
            Última actualización:{" "}
            {exchangeRate?.updated_at
              ? new Date(exchangeRate.updated_at).toLocaleString("es-AR")
              : "-"}
          </p>
        </div>

        <div className="admin-dollar-actions">
          <input
            type="number"
            value={newDollar}
            onChange={(e) => setNewDollar(e.target.value)}
            placeholder="Nuevo dólar"
          />

          <button type="button" onClick={handleUpdateDollar}>
            Actualizar dólar
          </button>
        </div>
      </div>

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
          <label className="form-label">Precio sugerido interno</label>
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
      <div className="admin-table-filters">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select value={sortPrice} onChange={(e) => setSortPrice(e.target.value)}>
          <option value="">Ordenar precio</option>
          <option value="asc">Menor a mayor</option>
          <option value="desc">Mayor a menor</option>
        </select>
      </div>
      <div className="table-responsive">
        <table className="table table-dark table-striped mt-3">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Marca</th>
              <th>Costo ARS</th>
              <th>Costo USD</th>
              <th>IVA</th>
              <th>Precio sugerido</th>
              <th>Cód. mayorista</th>
              <th>Stock</th>
              <th>Categoría</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredAdminProducts.map((prod) => (
              <tr key={prod.id}>
                <td>{prod.name}</td>
                <td>{prod.sku || "Sin SKU"}</td>
                <td>{prod.brand}</td>
                <td>${Number(prod.cost_price || 0).toLocaleString("es-AR")}</td>
                <td>
                  {prod.cost_price_usd
                    ? `U$S ${Number(prod.cost_price_usd).toLocaleString("es-AR")}`
                    : "-"}
                </td>
                <td>{prod.iva ? `${prod.iva}%` : "-"}</td>
                <td>
                  {prod.price
                    ? `$${Number(prod.price).toLocaleString("es-AR")}`
                    : "Sin precio"}
                </td>
                <td>{prod.supplier_code || "-"}</td>
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