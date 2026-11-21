import "./NavBarStyle.css";
import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaSearch, FaShoppingCart, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabaseClient";
import useIsAdmin from "../utils/useIsAdmin";
import { useCart } from "./CartContext";
import Logo from "../assets/LogoSinFondoa.png";

const NavBar = ({ isProfile }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(
    () => new URLSearchParams(location.search).get("search") || ""
  );

  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { cart } = useCart();
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar el menú al navegar y bloquear el scroll mientras está abierto
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/productos?search=${encodeURIComponent(q)}` : "/productos");
  };

  const goToAbout = (e) => {
    e.preventDefault();
    setOpen(false);
    const scroll = () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    if (location.pathname === "/") scroll();
    else {
      navigate("/");
      setTimeout(scroll, 350);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className={`header ${scrolled || open ? "scrolled" : ""}`}>
      <Link to="/" className="nav-brand" aria-label="PC Soluciones - inicio">
        <img src={Logo} alt="" />
        <span>
          PC <strong>Soluciones</strong>
        </span>
      </Link>

      {!isProfile && (
        <form className="search-container" onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            placeholder="Buscar productos, marcas y más..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Buscar productos"
          />
          <button className="search-icon" type="submit" aria-label="Buscar">
            <FaSearch />
          </button>
        </form>
      )}

      <div className="nav-quick">
        <Link to="/carrito" className="nav-cart" aria-label={`Carrito (${cartQuantity})`}>
          <FaShoppingCart />
          {cartQuantity > 0 && <span className="cart-badge">{cartQuantity}</span>}
        </Link>
        <button
          className="fabar"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      <ul className={open ? "navbar active" : "navbar"}>
        <li><NavLink to="/" end>Inicio</NavLink></li>
        <li><NavLink to="/productos">Productos</NavLink></li>
        <li><NavLink to="/armar-pc">Armá tu PC</NavLink></li>
        <li><a href="/#about" onClick={goToAbout}>Nosotros</a></li>
        {isAdmin && (
          <li><NavLink to="/ProductsForm" className="nav-admin">Admin</NavLink></li>
        )}
        {user ? (
          <>
            <li>
              <NavLink to="/profile" className="nav-icon-link">
                <FaUserCircle /> Perfil
              </NavLink>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-logout">
                Salir
              </button>
            </li>
          </>
        ) : (
          <li>
            <NavLink to="/login" className="nav-login">Ingresar</NavLink>
          </li>
        )}
        <li className="nav-cart-desktop">
          <NavLink to="/carrito" className="nav-cart" aria-label={`Carrito (${cartQuantity})`}>
            <FaShoppingCart />
            {cartQuantity > 0 && <span className="cart-badge">{cartQuantity}</span>}
          </NavLink>
        </li>
      </ul>
    </header>
  );
};

export default NavBar;
