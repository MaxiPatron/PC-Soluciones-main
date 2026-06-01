import "./NavBarStyle.css";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { Form, FormControl } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabaseClient";
import useIsAdmin from "../utils/useIsAdmin";
import { useCart } from "./CartContext";
const NavBar = ({ isProfile }) => {
  const [click, setClick] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { cart } = useCart();
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim() !== "") {
      navigate(`/productos?search=${searchTerm}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="header">
      <Link to="/">
        <h1>PC Soluciones</h1>
      </Link>

      {!isProfile && (
        <div className="search-wrapper">
          <Form className="search-container" onSubmit={handleSearchSubmit}>
            <FormControl
              type="text"
              placeholder="Buscar productos, marcas y más..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-icon" type="submit">
              <FaSearch />
            </button>
          </Form>
        </div>
      )}

      <div className="fabar" onClick={() => setClick(!click)}>
        {click ? <FaTimes size={20} color="#fff" /> : <FaBars size={20} color="#fff" />}
      </div>

      <ul className={click ? "navbar active" : "navbar"}>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/productos">Productos</Link></li>
        <li><Link to="/armar-pc">Armá tu PC</Link></li>
        <li><a href="#about">About We</a></li>
        <li>
          <Link to="/carrito" className="cart-nav-link">
            Carrito
            {cartQuantity > 0 && (
              <span className="cart-badge">{cartQuantity}</span>
            )}
          </Link>
        </li>
        {isAdmin && (
          <li><Link to="/ProductsForm">Admin</Link></li>
        )}

        {user ? (
          <>
            <li><Link to="/profile">Perfil</Link></li>
            <li>
              <button onClick={handleLogout} className="nav-logout">
                Salir
              </button>
            </li>
          </>
        ) : (
          <li><Link to="/login">Login</Link></li>
        )}
      </ul>
    </div>
  );
};

export default NavBar;