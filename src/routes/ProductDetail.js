import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FaCartPlus, FaCheck, FaWhatsapp, FaChevronRight, FaShieldAlt, FaTools, FaComments } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import "../components/ProductDetail.css";
import { useCart } from "../components/CartContext";
import {
  FALLBACK_IMAGE,
  PRODUCT_COLUMNS,
  imgFallback,
  hasPrice,
  priceLabel,
  productImage,
  productWhatsappText,
  whatsappLink,
} from "../utils/store";

function ProductDetail() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.scrollTo(0, 0);

    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`${PRODUCT_COLUMNS}, categories(name, slug)`)
        .eq("slug", slug)
        .single();

      if (cancelled) return;
      const prod = error ? null : data;
      setProduct(prod);
      setLoading(false);

      if (prod?.category_id) {
        const { data: rel } = await supabase
          .from("products")
          .select("id, name, slug, brand, image_url, stock")
          .eq("category_id", prod.category_id)
          .eq("active", true)
          .gt("stock", 0)
          .neq("id", prod.id)
          .limit(4);
        if (!cancelled) setRelated(rel || []);
      } else {
        setRelated([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="product-detail-page">
          <section className="product-detail-card">
            <div className="skeleton" style={{ minHeight: 420, borderRadius: 24 }} />
            <div>
              <div className="skeleton" style={{ height: 14, width: 120 }} />
              <div className="skeleton" style={{ height: 40, marginTop: 20 }} />
              <div className="skeleton" style={{ height: 40, width: "70%", marginTop: 10 }} />
              <div className="skeleton" style={{ height: 50, width: 200, marginTop: 40 }} />
              <div className="skeleton" style={{ height: 90, marginTop: 30 }} />
            </div>
          </section>
        </main>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <NavBar />
        <main className="product-detail-page not-found">
          <h1>Producto no encontrado</h1>
          <p>Puede que ya no esté disponible.</p>
          <Link to="/productos" className="detail-cart-btn">Volver al catálogo</Link>
        </main>
        <Footer />
      </>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const inStock = product.stock > 0;

  return (
    <>
      <NavBar />

      <main className="product-detail-page">
        <nav className="breadcrumb" aria-label="Ruta">
          <Link to="/productos">Productos</Link>
          {product.categories && (
            <>
              <FaChevronRight />
              <Link to={`/productos?categoria=${product.categories.slug}`}>{product.categories.name}</Link>
            </>
          )}
          <FaChevronRight />
          <span>{product.name}</span>
        </nav>

        <section className="product-detail-card">
          <div className="product-detail-image">
            <img
              src={productImage(product)}
              alt={product.name}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE)) e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>

          <div className="product-detail-info">
            <div className="detail-top">
              {product.brand && (
                <Link to={`/productos?brand=${encodeURIComponent(product.brand)}`} className="detail-brand">
                  {product.brand}
                </Link>
              )}
              <span className={`stock ${inStock ? "ok" : "no"}`}>{inStock ? "En stock" : "Agotado"}</span>
            </div>

            <h1>{product.name}</h1>

            <p className="detail-sku">SKU: {product.sku || "—"}</p>

            <div className="detail-price-box">
              <p className={`detail-price ${hasPrice(product) ? "" : "ask"}`}>{priceLabel(product)}</p>
              {hasPrice(product) && (
                <span>Precio sujeto a cambios según cotización. Confirmalo por WhatsApp.</span>
              )}
            </div>

            <div className="detail-actions">
              <button className={`detail-cart-btn ${added ? "added" : ""}`} onClick={handleAddToCart}>
                {added ? <><FaCheck /> Agregado</> : <><FaCartPlus /> Agregar al carrito</>}
              </button>

              <a
                className="detail-whatsapp-btn"
                href={whatsappLink(productWhatsappText(product))}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp /> Consultar
              </a>
            </div>

            <div className="detail-description">
              <h2>Descripción</h2>
              <p>{product.description || "Producto disponible para consulta."}</p>
            </div>

            <ul className="detail-perks">
              <li><FaComments /> Asesoramiento personalizado</li>
              <li><FaTools /> Armado y mantenimiento de equipos</li>
              <li><FaShieldAlt /> Atención directa por WhatsApp</li>
            </ul>
          </div>
        </section>

        {related.length > 0 && (
          <section className="related">
            <h2>
              También te puede <span className="text-accent">interesar</span>
            </h2>
            <div className="related-grid">
              {related.map((p) => (
                <Link key={p.id} to={`/producto/${p.slug}`} className="related-card">
                  <div className="related-img">
                    <img src={productImage(p)} alt={p.name} loading="lazy" onError={imgFallback} />
                  </div>
                  <div className="related-meta">
                    <span className="related-brand">{p.brand}</span>
                    {p.stock > 0 && <span className="related-stock">En stock</span>}
                  </div>
                  <h3>{p.name}</h3>
                  <div className="related-foot">
                    <p className={hasPrice(p) ? "" : "ask"}>{priceLabel(p)}</p>
                    <span className="related-cta">
                      Ver <FaChevronRight />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export default ProductDetail;
