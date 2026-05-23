import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import "./FilterSideBar.css";

const FilterSideBar = ({ onFilterChange }) => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    storage: [],
    stock: "",
  });

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: catData } = await supabase
        .from("categories")
        .select("name, slug")
        .order("name", { ascending: true });

      const { data: productData } = await supabase
        .from("products")
        .select("brand")
        .not("brand", "is", null);

      setCategories(catData || []);

      const uniqueBrands = [
        ...new Set(productData?.map((p) => p.brand).filter(Boolean)),
      ].sort();

      setBrands(uniqueBrands);
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const toggleArrayFilter = (type, value) => {
    setFilters((prev) => {
      const exists = prev[type].includes(value);

      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((item) => item !== value)
          : [...prev[type], value],
      };
    });
  };

  const setStockFilter = (value) => {
    setFilters((prev) => ({
      ...prev,
      stock: prev.stock === value ? "" : value,
    }));
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-category">
        <h4>Categorías</h4>

        {categories.map((cat) => (
          <label key={cat.slug}>
            <input
              type="checkbox"
              checked={filters.categories.includes(cat.slug)}
              onChange={() => toggleArrayFilter("categories", cat.slug)}
            />
            {cat.name}
          </label>
        ))}
      </div>

      <div className="filter-variants">
        <h4>Marcas</h4>

        {brands.map((brand) => (
          <label key={brand}>
            <input
              type="checkbox"
              checked={filters.brands.includes(brand)}
              onChange={() => toggleArrayFilter("brands", brand)}
            />
            {brand}
          </label>
        ))}
      </div>

      <div className="filter-variants">
        <h4>Almacenamiento</h4>

        {["SSD", "HDD", "NVMe"].map((type) => (
          <label key={type}>
            <input
              type="checkbox"
              checked={filters.storage.includes(type)}
              onChange={() => toggleArrayFilter("storage", type)}
            />
            {type}
          </label>
        ))}
      </div>

      <div className="stock-filter">
        <h4>Stock</h4>

        <label>
          <input
            type="checkbox"
            checked={filters.stock === "in-stock"}
            onChange={() => setStockFilter("in-stock")}
          />
          En stock
        </label>

        <label>
          <input
            type="checkbox"
            checked={filters.stock === "out-of-stock"}
            onChange={() => setStockFilter("out-of-stock")}
          />
          Agotado
        </label>
      </div>
    </div>
  );
};

export default FilterSideBar;