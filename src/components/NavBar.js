import "./NavBarStyle.css"
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
const NavBar = () => {
    const [click, setClick] = useState(false);
    const handleClick = () => setClick(!click);
    const [color, setColor] = useState(false);
    const changeColor = () => { if (window.scrollY >= 100) { setColor(true); } else { setColor(false) }; };
    window.addEventListener("scroll", changeColor);
    return (
            <div className={color ? "header header-bg" : "header"}>
                <Link to="/">
                    <h1>PC Soluciones</h1>
                </Link>
                <ul className={click ? "navbar active" : "navbar"}>
                    <li><a href="#Home">Home</a></li>
                    <li><a href="#About">About We</a></li>
                </ul>
                <div className="fabar" onClick={handleClick}>
                    {click ? (<FaTimes size={20} style={{ color: "#fff" }} />) : (<FaBars size={20} style={{ color: "#fff" }} />)}
                </div>
            </div>
    );
}

export default NavBar;