import React, { useEffect, useState } from "react";
import "./FeaturedBrands.css";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const brands = ["AMD", "Intel", "Kingston", "NVIDIA"];

const brandImages = {
  AMD: "/brands/amd.jpg",
  Intel: "/brands/intel.jpeg",
  Kingston: "/brands/Kingston.jpg",
  NVIDIA: "/brands/nvidia.png",
};

const FeaturedBrands = () => {
  const [selectedBrand, setSelectedBrand] = useState("AMD");
  const [brandProducts, setBrandProducts] = useState([]);

  useEffect(() => {
    const fetchBrandProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("brand", selectedBrand)
        .eq("active", true)
        .limit(3);

      if (!error) setBrandProducts(data || []);
    };

    fetchBrandProducts();
  }, [selectedBrand]);

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
        <Link
          to={`/productos?brand=${selectedBrand}`}
          className="brand-banner brand-banner-link"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,.9), rgba(0,0,0,.45)), url(${brandImages[selectedBrand]})`,
          }}
        >
          <div>
            <span>Marca destacada</span>
            <h3>{selectedBrand}</h3>
            <p>Ver todos los productos disponibles de {selectedBrand}.</p>
          </div>
        </Link>

        {brandProducts.map((product) => (
          <article className="brand-product-card" key={product.id}>
            <img
              src={
                product.image_url?.trim()
                  ? product.image_url
                  : brandImages[product.brand] || "/brands/hardwaregen.png"
              }
              alt={product.name}
            />

            <h4>{product.name}</h4>

            <p>
              {Number(product.price) > 0
                ? `$${Number(product.price).toLocaleString("es-AR")}`
                : "Consultar precio"}
            </p>

            <Link
              to={`/producto/${product.slug}`}
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