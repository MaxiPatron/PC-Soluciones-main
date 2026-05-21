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

      <div className="products-page">
        <FilterSidebar onFilterChange={handleFilterChange} />

        <div className="products-container">
          <h2>Todos los Productos</h2>

          {loading ? (
            <p>Cargando productos...</p>
          ) : (
            <div className="product-list">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <img src={product.image_url} alt={product.name} />
                    <h3>{product.name}</h3>
                    <p className="product-brand">{product.brand}</p>
                    <p>${product.price}</p>
                    <span>
                      {product.stock > 0 ? "En stock" : "Agotado"}
                    </span>
                  </div>
                ))
              ) : (
                <p>No se encontraron productos</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;