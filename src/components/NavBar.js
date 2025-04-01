import "./NavBarStyle.css";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { Form, FormControl, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const NavBar = ({ isProfile }) => {
  const [click, setClick] = useState(false);
  const handleClick = () => setClick(!click);
  const [color, setColor] = useState(false);
  const changeColor = () => { if (window.scrollY >= 100) { setColor(true); } else { setColor(false) }; };
  window.addEventListener("scroll", changeColor);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim() !== "") {
      navigate(`/productos?search=${searchTerm}`);
    }
  };

  return (
    <div className={color ? "header header-bg" : "header"}>
      <Link to="/">
        <h1>PC Soluciones</h1>
      </Link>
      {!isProfile && (
        <Container className="d-flex justify-content-center mt-3">
          <Row>
            <Col>
              <Form className="search-container" onSubmit={handleSearchSubmit}>
                <FormControl
                  type="text"
                  placeholder="Buscar productos, marcas y más..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <button className="search-icon" type="submit">
                  <FaSearch />
                </button>
              </Form>
            </Col>
          </Row>
        </Container>
      )}
      <div className="fabar" onClick={handleClick}>
        {click ? (<FaTimes size={20} style={{ color: "#fff" }} />) : (<FaBars size={20} style={{ color: "#fff" }} />)}
      </div>
      <ul className={click ? "navbar active" : "navbar"}>
        <li><a href="/">Home</a></li>
        <li><Link to="/productos">Productos</Link></li>
        <li><a href="/">About We</a></li>
        {user ? (
          <li><Link to="/profile">{user?.user_metadata?.full_name || "Perfil"}</Link></li>

        ) : (
          <li><Link to="/login">Login</Link></li>
        )}
      </ul>
    </div>
  );
};

export default NavBar;
