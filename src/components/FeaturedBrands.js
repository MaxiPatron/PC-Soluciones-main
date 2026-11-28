import React, { useEffect, useState } from "react";
import "./FeaturedBrands.css";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { BRAND_IMAGES, PRODUCT_COLUMNS, imgFallback, priceLabel, productImage } from "../utils/store";

const brands = ["AMD", "Intel", "Kingston", "NVIDIA"];

const FeaturedBrands = () => {
  const [selectedBrand, setSelectedBrand] = useState("AMD");
  const [brandProducts, setBrandProducts] = useState([]);

  useEffect(() => {
    const fetchBrandProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("brand", selectedBrand)
        .eq("active", true)
        .gt("stock", 0)
        .order("featured", { ascending: false })
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
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,.9), rgba(0,0,0,.45)), url(${BRAND_IMAGES[selectedBrand]})`,
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
              src={productImage(product)}
              onError={imgFallback}
              alt={product.name}
            />

            <h4>{product.name}</h4>

            <p>
              {priceLabel(product)}
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