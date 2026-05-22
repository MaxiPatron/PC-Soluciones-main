import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import FilterSidebar from "../components/FilterSidebar";
import "../components/ProductsPage.css";

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    categories: [],
    brands: [],
    storage: [],
    stock: "",
  });
  const brandImages = {
    Intel: "/brands/intel.jpeg",
    AMD: "/brands/amd.jpg",
    NVIDIA: "/brands/nvidia.png",
    Kingston: "/brands/Kingston.jpg",
  };
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchQuery = queryParams.get("search");

    if (searchQuery) {
      setSearch(searchQuery);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            name,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al obtener productos:", error);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    );

    if (selectedFilters.categories.length > 0) {
      filtered = filtered.filter((product) =>
        selectedFilters.categories.includes(product.categories?.slug)
      );
    }

    if (selectedFilters.brands.length > 0) {
      filtered = filtered.filter((product) =>
        selectedFilters.brands.includes(product.brand)
      );
    }

    if (selectedFilters.storage.length > 0) {
      filtered = filtered.filter((product) =>
        selectedFilters.storage.some((type) =>
          product.name.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    if (selectedFilters.stock === "in-stock") {
      filtered = filtered.filter((product) => product.stock > 0);
    }

    if (selectedFilters.stock === "out-of-stock") {
      filtered = filtered.filter((product) => product.stock <= 0);
    }

    setFilteredProducts(filtered);
  }, [products, search, selectedFilters]);

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
  };

  return (
    <div>
      <NavBar />

      <main className="products-page">
        <section className="products-hero">
          <span>CATÁLOGO</span>
          <h1>Productos disponibles</h1>
          <p>Componentes, periféricos y hardware seleccionado.</p>
        </section>

        <section className="products-layout">
          <FilterSidebar onFilterChange={handleFilterChange} />

          <div className="products-content">
            <div className="products-topbar">
              <h2>{filteredProducts.length} productos encontrados</h2>
            </div>

            {loading ? (
              <p className="products-message">Cargando productos...</p>
            ) : filteredProducts.length > 0 ? (
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="product-card">
                    <div className="product-image">
                      <img
                        src={
                          product.image_url && product.image_url.trim() !== ""
                            ? product.image_url
                            : brandImages[product.brand] || "/brands/default.jpg"
                        }
                        alt={product.name}
                      />
                    </div>

                    <div className="product-info">
                      <span className="product-brand">{product.brand}</span>
                      <h3>{product.name}</h3>

                      <div className="product-bottom">
                        <p className="product-price">
                          {Number(product.price) > 0
                            ? `$${Number(product.price).toLocaleString("es-AR")}`
                            : "Consultar precio"}
                        </p>

                        <span className={product.stock > 0 ? "stock ok" : "stock no"}>
                          {product.stock > 0 ? "En stock" : "Agotado"}
                        </span>
                      </div>

                      <a
                        className="product-btn"
                        href={`https://wa.me/5493513256553?text=${encodeURIComponent(
                          `Hola! Quiero consultar por este producto: ${product.name}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Consultar
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="products-message">No se encontraron productos</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductsPage;