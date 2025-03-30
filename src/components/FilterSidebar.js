import React, { useState } from "react";
import "./FilterSideBar.css";

const FilterSideBar = ({ onFilterChange }) => {
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedStock, setSelectedStock] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState({
        CPU: [],
        GPU: [],
        RAM: [],
        Storage: [],
    });

    const handleCategoryChange = (category) => {
        setSelectedCategories((prevCategories) =>
            prevCategories.includes(category)
                ? prevCategories.filter((cat) => cat !== category)
                : [...prevCategories, category]
        );
    };

    const handleVariantChange = (category, variant) => {
        setSelectedVariants((prevVariants) => {
            const updatedCategoryVariants = prevVariants[category].includes(variant)
                ? prevVariants[category].filter((v) => v !== variant)
                : [...prevVariants[category], variant];

            return {
                ...prevVariants,
                [category]: updatedCategoryVariants,
            };
        });
    };

    const handleStockChange = (stock) => {
        setSelectedStock((prevStock) =>
            prevStock.includes(stock)
                ? prevStock.filter((s) => s !== stock)
                : [...prevStock, stock]
        );
    };

    const handleFilterChange = () => {
        onFilterChange(selectedCategories, selectedStock, selectedVariants);
    };

    return (
        <div className="filter-sidebar">
            <div className="filter-category">
                <h4>Filtros de Categoría</h4>
                <ul>
                    <li>
                        <input
                            type="checkbox"
                            id="cpu"
                            onChange={() => {
                                handleCategoryChange("CPU");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="cpu">Microprocesadores</label>
                    </li>
                    <li>
                        <input
                            type="checkbox"
                            id="gpu"
                            onChange={() => {
                                handleCategoryChange("GPU");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="gpu">Tarjetas Gráficas</label>
                    </li>
                    <li>
                        <input
                            type="checkbox"
                            id="ram"
                            onChange={() => {
                                handleCategoryChange("RAM");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="ram">Memoria RAM</label>
                    </li>
                    <li>
                        <input
                            type="checkbox"
                            id="storage"
                            onChange={() => {
                                handleCategoryChange("Storage");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="storage">Almacenamiento</label>
                    </li>
                </ul>
            </div>

            {/* Variantes de los componentes (CPU, GPU, etc.) */}
            <div className="filter-variants">
                <h4>Filtros de Variantes</h4>
                {["CPU", "GPU", "RAM", "Storage"].map((category) => (
                    <div key={category}>
                        <h5>{category}</h5>
                        <ul>
                            {/* Variantes para cada categoría */}
                            {category === "CPU" && (
                                <>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="intel"
                                            onChange={() => {
                                                handleVariantChange("CPU", "Intel");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="intel">Intel</label>
                                    </li>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="amd"
                                            onChange={() => {
                                                handleVariantChange("CPU", "AMD");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="amd">AMD</label>
                                    </li>
                                </>
                            )}
                            {category === "GPU" && (
                                <>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="nvidia"
                                            onChange={() => {
                                                handleVariantChange("GPU", "NVIDIA");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="nvidia">NVIDIA</label>
                                    </li>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="amd-gpu"
                                            onChange={() => {
                                                handleVariantChange("GPU", "AMD");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="amd-gpu">AMD</label>
                                    </li>
                                </>
                            )}
                            {category === "RAM" && (
                                <>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="corsair"
                                            onChange={() => {
                                                handleVariantChange("RAM", "Corsair");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="corsair">Corsair</label>
                                    </li>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="g-skill"
                                            onChange={() => {
                                                handleVariantChange("RAM", "G.Skill");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="g-skill">G.Skill</label>
                                    </li>
                                </>
                            )}
                            {category === "Storage" && (
                                <>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="ssd"
                                            onChange={() => {
                                                handleVariantChange("Storage", "SSD");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="ssd">SSD</label>
                                    </li>
                                    <li>
                                        <input
                                            type="checkbox"
                                            id="hdd"
                                            onChange={() => {
                                                handleVariantChange("Storage", "HDD");
                                                handleFilterChange();
                                            }}
                                        />
                                        <label htmlFor="hdd">HDD</label>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Filtro de stock */}
            <div className="stock-filter">
                <h4>Filtros de Stock</h4>
                <ul>
                    <li>
                        <input
                            type="checkbox"
                            id="in-stock"
                            onChange={() => {
                                handleStockChange("in-stock");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="in-stock">En Stock</label>
                    </li>
                    <li>
                        <input
                            type="checkbox"
                            id="out-of-stock"
                            onChange={() => {
                                handleStockChange("out-of-stock");
                                handleFilterChange();
                            }}
                        />
                        <label htmlFor="out-of-stock">Agotado</label>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default FilterSideBar;
