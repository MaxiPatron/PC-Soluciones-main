import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import "./FilterSideBar.css";

const FilterSideBar = ({ onFilterChange, selectedFilters }) => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

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

  const toggleArrayFilter = (type, value) => {
    const exists = selectedFilters[type].includes(value);

    onFilterChange({
      ...selectedFilters,
      [type]: exists
        ? selectedFilters[type].filter((item) => item !== value)
        : [...selectedFilters[type], value],
    });
  };

  const setStockFilter = (value) => {
    onFilterChange({
      ...selectedFilters,
      stock: selectedFilters.stock === value ? "" : value,
    });
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-category">
        <h4>Categorías</h4>

        {categories.map((cat) => (
          <label key={cat.slug}>
            <input
              type="checkbox"
              checked={selectedFilters.categories.includes(cat.slug)}
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
              checked={selectedFilters.brands.includes(brand)}
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
              checked={selectedFilters.storage.includes(type)}
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
            checked={selectedFilters.stock === "in-stock"}
            onChange={() => setStockFilter("in-stock")}
          />
          En stock
        </label>

        <label>
          <input
            type="checkbox"
            checked={selectedFilters.stock === "out-of-stock"}
            onChange={() => setStockFilter("out-of-stock")}
          />
          Agotado
        </label>
      </div>
    </div>
  );
};

export default FilterSideBar;