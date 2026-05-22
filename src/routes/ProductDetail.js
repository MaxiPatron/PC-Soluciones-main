import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import "../components/ProductDetail.css";

const brandImages = {
  Intel: "/brands/intel.jpeg",
  AMD: "/brands/amd.jpg",
  NVIDIA: "/brands/nvidia.png",
  Kingston: "/brands/Kingston.jpg",
};

function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("slug", slug)
        .single();

      if (!error) setProduct(data);
      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="product-detail-page">
          <p>Cargando producto...</p>
        </main>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <NavBar />
        <main className="product-detail-page">
          <h1>Producto no encontrado</h1>
          <Link to="/productos">Volver al catálogo</Link>
        </main>
      </>
    );
  }

  const image =
    product.image_url?.trim() ||
    brandImages[product.brand] ||
    "/brands/default.jpg";

  return (
    <>
      <NavBar />

      <main className="product-detail-page">
        <Link to="/productos" className="back-link">
          ← Volver al catálogo
        </Link>

        <section className="product-detail-card">
          <div className="product-detail-image">
            <img src={image} alt={product.name} />
          </div>

          <div className="product-detail-info">
            <span className="detail-category">
              {product.categories?.name || "Producto"}
            </span>

            <h1>{product.name}</h1>

            <p className="detail-brand">{product.brand}</p>

            <p className="detail-price">
              {Number(product.price) > 0
                ? `$${Number(product.price).toLocaleString("es-AR")}`
                : "Consultar precio"}
            </p>

            <div className="detail-meta">
              <span>{product.stock > 0 ? "En stock" : "Agotado"}</span>
              <span>SKU: {product.sku || "Sin SKU"}</span>
            </div>

            <p className="detail-description">
              {product.description || "Producto disponible para consulta."}
            </p>

            <a
              className="detail-whatsapp"
              href={`https://wa.me/5493513256553?text=${encodeURIComponent(
                `Hola! Quiero consultar por este producto: ${product.name} - SKU: ${product.sku || "Sin SKU"}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

export default ProductDetail;