import NavBar from "../components/NavBar";
import { useCart } from "../components/CartContext";
import "./CartPage.css";
const brandImages = {
  Kingston: "/brands/Kingston.jpg",
  XPG: "/brands/xpg.jpg",
  AMD: "/brands/amd.jpg",
  Intel: "/brands/intel.jpeg",
  NVIDIA: "/brands/nvidia.png",
  ASUS: "/brands/asus.jpg",
  MSI: "/brands/msi.jpg",
  Gigabyte: "/brands/gigabyte.jpg",
  Memox: "/brands/memox.jpg",
  "Western Digital": "/brands/westerndigital.jpg",
};
const getImage = (item) =>
  item.image_url?.trim() ||
  brandImages[item.brand] ||
  "/brands/hardwaregen.png";
const CartPage = () => {
  const {
    cart,
    removeFromCart,
    clearCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const whatsappMessage = encodeURIComponent(
    `Hola! Quiero consultar por estos productos:\n\n${cart
      .map(
        (item) =>
          `• ${item.name}\nSKU: ${item.sku || "Sin SKU"}\nCantidad: ${item.quantity}`
      )
      .join("\n\n")}`
  );


  return (
    <>
      <NavBar />

      <main className="cart-page">
        <h1>Carrito de consulta</h1>

        {cart.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <>
            <div className="cart-grid">
              {cart.map((item) => (
                <div key={item.id} className="cart-card">
                  <img src={getImage(item)} alt={item.name} />

                  <div>
                    <h3>{item.name}</h3>

                    <p>SKU: {item.sku || "Sin SKU"}</p>

                    <div className="cart-quantity">
                      <button onClick={() => decreaseQuantity(item.id)}>
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button onClick={() => increaseQuantity(item.id)}>
                        +
                      </button>
                    </div>

                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-actions">
              <button onClick={clearCart}>
                Vaciar carrito
              </button>

              <a
                href={`https://wa.me/5493513256553?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar consulta
              </a>
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default CartPage;