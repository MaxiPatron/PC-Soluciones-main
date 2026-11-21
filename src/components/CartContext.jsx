import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const loadCart = () => {
  try {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      // navegador sin almacenamiento: el carrito vive solo en memoria
    }
  }, [cart]);

  // Todas las funciones usan la forma setCart(prev => ...) para que
  // varias llamadas seguidas (ej: agregar un armado completo) no se pisen.
  const addToCart = (product, quantity = 1) => {
    setCart((current) => {
      const exists = current.find((item) => item.id === product.id);
      if (exists) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { ...product, quantity }];
    });
  };

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  // Actualiza stock/nombre/imagen con los datos actuales de la base
  // (el carrito guarda una copia del producto del momento en que se agregó)
  const syncCart = (freshProducts) => {
    const byId = new Map(freshProducts.map((p) => [p.id, p]));
    setCart((current) =>
      current
        .filter((item) => byId.has(item.id) && byId.get(item.id).active !== false)
        .map((item) => ({ ...item, ...byId.get(item.id), quantity: item.quantity }))
    );
  };

  const clearCart = () => setCart([]);

  const increaseQuantity = (id) => {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  };

  const decreaseQuantity = (id) => {
    setCart((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
      )
    );
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        syncCart,
        increaseQuantity,
        decreaseQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
