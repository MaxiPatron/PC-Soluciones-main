import "./NavBarStyle.css"
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { Form, FormControl, Container, Row, Col } from "react-bootstrap";

const NavBar = () => {
    const [click, setClick] = useState(false);
    const handleClick = () => setClick(!click);
    const [color, setColor] = useState(false);
    const changeColor = () => { if (window.scrollY >= 100) { setColor(true); } else { setColor(false) }; };
    window.addEventListener("scroll", changeColor);
    const [searchTerm, setSearchTerm] = useState("");

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className={color ? "header header-bg" : "header"}>
            <Link to="/">
                <h1>PC Soluciones</h1>
            </Link>
            <Container className="d-flex justify-content-center mt-3">
    <Row>
        <Col>
            <Form className="search-container">
                <FormControl
                    type="text"
                    placeholder="Buscar productos, marcas y más..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="search-input"
                />
                <button className="search-icon">
                    <FaSearch />
                </button>
            </Form>
        </Col>
    </Row>
</Container>
            <div className="fabar" onClick={handleClick}>
                {click ? (<FaTimes size={20} style={{ color: "#fff" }} />) : (<FaBars size={20} style={{ color: "#fff" }} />)}
            </div>
            <ul className={click ? "navbar active" : "navbar"}>
                <li><a href="#Home">Home</a></li>
                <li><a href="#About">About We</a></li>
            </ul>
        </div>
    );
}

export default NavBar;