import React, { useEffect, useState } from "react";
import "./FilterSideBar.css";

const FilterSideBar = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    storage: [],
    stock: "",
  });

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

        <label>
          <input
            type="checkbox"
            onChange={() => toggleArrayFilter("categories", "microprocesadores")}
          />
          Microprocesadores
        </label>

        <label>
          <input
            type="checkbox"
            onChange={() => toggleArrayFilter("categories", "tarjetas-graficas")}
          />
          Tarjetas Gráficas
        </label>

        <label>
          <input
            type="checkbox"
            onChange={() => toggleArrayFilter("categories", "memoria-ram")}
          />
          Memoria RAM
        </label>

        <label>
          <input
            type="checkbox"
            onChange={() => toggleArrayFilter("categories", "almacenamiento")}
          />
          Almacenamiento
        </label>
      </div>

      <div className="filter-variants">
        <h4>Marcas</h4>

        {["Intel", "AMD", "NVIDIA", "Corsair", "Kingston", "G.Skill"].map(
          (brand) => (
            <label key={brand}>
              <input
                type="checkbox"
                onChange={() => toggleArrayFilter("brands", brand)}
              />
              {brand}
            </label>
          )
        )}
      </div>

      <div className="filter-variants">
        <h4>Almacenamiento</h4>

        {["SSD", "HDD", "NVMe"].map((type) => (
          <label key={type}>
            <input
              type="checkbox"
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