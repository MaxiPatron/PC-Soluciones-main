import React, { useState } from "react";
import "./FeaturedBrands.css";
import { Link } from "react-router-dom";
const brands = ["Corsair", "AMD", "Intel", "Kingston", "NVIDIA"];

const products = {
  Corsair: [
    { name: "Corsair Vengeance 16GB DDR4", price: "$65.000", image: "/ram.jpg" },
    { name: "Fuente Corsair 750W 80 Plus", price: "$120.000", image: "/Fuente.jpg" },
    { name: "Gabinete Corsair RGB", price: "$180.000", image: "/Gabinete.jpg" },
  ],
  AMD: [
    { name: "Ryzen 5 5600X", price: "$180.000", image: "/Micro.jpg" },
    { name: "Ryzen 7 5700X", price: "$260.000", image: "/Micro.jpg" },
    { name: "Motherboard AM4 Gaming", price: "$150.000", image: "/mother.jpg" },
  ],
  Intel: [
    { name: "Intel Core i5 12400F", price: "$210.000", image: "/Micro.jpg" },
    { name: "Intel Core i7 12700K", price: "$420.000", image: "/Micro.jpg" },
    { name: "Motherboard Intel B660", price: "$170.000", image: "/mother.jpg" },
  ],
  Kingston: [
    { name: "SSD Kingston NV2 1TB", price: "$85.000", image: "/ssd.jpg" },
    { name: "Kingston Fury 16GB", price: "$70.000", image: "/ram.jpg" },
    { name: "SSD Kingston 480GB", price: "$45.000", image: "/ssd.jpg" },
  ],
  NVIDIA: [
    { name: "RTX 3060 12GB", price: "$320.000", image: "/grafica.jpg" },
    { name: "RTX 4070", price: "$850.000", image: "/grafica.jpg" },
    { name: "RTX 4060 Ti", price: "$610.000", image: "/grafica.jpg" },
  ],
};

const FeaturedBrands = () => {
  const [selectedBrand, setSelectedBrand] = useState("Corsair");

  return (
    <section className="featured-brands">
      <div className="featured-header">
        <span>SELECCIÓN DESTACADA</span>
        <h2>
          Descubrí las mejores <strong>marcas</strong>
        </h2>
      </div>

      <div className="brand-tabs">
        {brands.map((brand) => (
          <button
            key={brand}
            className={selectedBrand === brand ? "active" : ""}
            onClick={() => setSelectedBrand(brand)}
          >
            {brand}
          </button>
        ))}
      </div>

      <div className="brand-showcase">
        <div className="brand-banner">
          <div>
            <span>Marca destacada</span>
            <h3>{selectedBrand}</h3>
            <p>Componentes seleccionados para rendimiento, gaming y productividad.</p>
          </div>
        </div>

        {products[selectedBrand].map((product, index) => (
          <article className="brand-product-card" key={index}>
            <img src={product.image} alt={product.name} />

            <h4>{product.name}</h4>

            <p>{product.price}</p>

            <Link
              to={`/productos?brand=${selectedBrand}`}
              className="brand-product-btn"
            >
              Ver producto
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FeaturedBrands;