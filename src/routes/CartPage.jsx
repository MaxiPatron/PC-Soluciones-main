import { useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { FaMinus, FaPlus, FaTrash, FaWhatsapp, FaShoppingCart, FaArrowLeft } from "react-icons/fa";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useCart } from "../components/CartContext";
import { SHOW_PRICES, formatPrice, hasPrice, priceLabel, productImage, imgFallback, whatsappLink } from "../utils/store";
import "./CartPage.css";

const CartPage = () => {
  const { cart, removeFromCart, clearCart, increaseQuantity, decreaseQuantity, syncCart } = useCart();

  // Al abrir el carrito, traer precios y stock actuales
  useEffect(() => {
    const ids = cart.map((i) => i.id);
    if (!ids.length) return;
    supabase
      .from("products")
      .select("id, name, slug, brand, sku, stock, image_url, active")
      .in("id", ids)
      .then(({ data, error }) => {
        if (!error && data) syncCart(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = cart.reduce((n, i) => n + i.quantity, 0);
  const priced = cart.filter(hasPrice);
  const total = priced.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const missingPrices = cart.length - priced.length;

  const message =
    `Hola! Quiero consultar por estos productos:\n\n` +
    cart
      .map(
        (i) =>
          `• ${i.name}\n  SKU: ${i.sku || "Sin SKU"} · Cantidad: ${i.quantity}` +
          (hasPrice(i) ? ` · ${formatPrice(i.price)} c/u` : "")
      )
      .join("\n\n") +
    (total ? `\n\nTotal estimado: ${formatPrice(total)}` : "");

  return (
    <>
      <NavBar />

      <main className="cart-page">
        <header className="cart-header">
          <span className="section-eyebrow">Tu pedido</span>
          <h1>
            Carrito de <span className="text-accent">consulta</span>
          </h1>
          <p>Armá tu lista y mandánosla por WhatsApp. Te confirmamos stock y precio final.</p>
        </header>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <FaShoppingCart />
            <h2>Tu carrito está vacío</h2>
            <p>Agregá productos desde el catálogo para armar tu consulta.</p>
            <Link to="/productos" className="cart-primary">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {cart.map((item) => (
                <article key={item.id} className="cart-card">
                  <Link to={`/producto/${item.slug}`} className="cart-img">
                    <img src={productImage(item)} alt={item.name} onError={imgFallback} />
                  </Link>

                  <div className="cart-info">
                    <span className="cart-brand">{item.brand}</span>
                    <Link to={`/producto/${item.slug}`}>
                      <h3>{item.name}</h3>
                    </Link>
                    <p className="cart-sku">SKU: {item.sku || "Sin SKU"}</p>

                    <div className="cart-row">
                      <div className="cart-quantity" aria-label="Cantidad">
                        <button onClick={() => decreaseQuantity(item.id)} disabled={item.quantity <= 1} aria-label="Restar">
                          <FaMinus />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => increaseQuantity(item.id)} aria-label="Sumar">
                          <FaPlus />
                        </button>
                      </div>

                      <div className="cart-price">
                        <strong className={hasPrice(item) ? "" : "ask"}>
                          {hasPrice(item) ? formatPrice(Number(item.price) * item.quantity) : priceLabel(item)}
                        </strong>
                        {hasPrice(item) && item.quantity > 1 && (
                          <small>{formatPrice(item.price)} c/u</small>
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="cart-remove" onClick={() => removeFromCart(item.id)} aria-label="Eliminar">
                    <FaTrash />
                  </button>
                </article>
              ))}

              <div className="cart-list-footer">
                <Link to="/productos">
                  <FaArrowLeft /> Seguir comprando
                </Link>
                <button onClick={clearCart}>Vaciar carrito</button>
              </div>
            </section>

            <aside className="cart-summary">
              <h2>Resumen</h2>
              <div className="cart-summary-row">
                <span>Productos</span>
                <span>{units}</span>
              </div>
              {SHOW_PRICES ? (
                <div className="cart-summary-row total">
                  <span>Total estimado</span>
                  <strong>{total ? formatPrice(total) : "A consultar"}</strong>
                </div>
              ) : (
                <p className="cart-note">
                  Mandanos la lista por WhatsApp y te pasamos el presupuesto con stock y precio actualizados.
                </p>
              )}
              {missingPrices > 0 && total > 0 && (
                <p className="cart-note">
                  {missingPrices} {missingPrices === 1 ? "producto no tiene" : "productos no tienen"} precio publicado y no{" "}
                  {missingPrices === 1 ? "está incluido" : "están incluidos"}.
                </p>
              )}
              <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="cart-primary">
                <FaWhatsapp /> Enviar consulta
              </a>
              {SHOW_PRICES && <p className="cart-note">Los precios pueden variar según la cotización del dólar.</p>}
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default CartPage;
