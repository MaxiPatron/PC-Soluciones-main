import "./FooterStyle.css";
import React, { forwardRef } from "react";
import { FaHome, FaMailBulk } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import pdf from "../assets/curriculum.pdf";
import { AiFillGithub, AiFillInstagram } from "react-icons/ai";
import { FaLinkedinIn } from "react-icons/fa";
const Footer = forwardRef((props, ref) => {
    return (
        <div className="Footer" ref={ref}>
            <div className="FooterContent">
                <div className="left">
                    <div className="Loc">
                        <FaHome size={20} style={{ color: "#fff", marginRight: "2rem" }} />
                        <p id="footer">Argentina, Córdoba</p>
                    </div>
                    <div className="Email">
                        <h4><FaMailBulk size={20} style={{ color: "#fff", marginRight: "2rem" }} />maximo.patron2003@gmail.com</h4>
                    </div>
                </div>
                <div>
                    <div md={12} className="home-about-social">
                        <ul className="home-about-social-links">
                            <li className="social-icons">
                                <a href="https://github.com/MaxiPatron" className="icon-divour  home-social-icons"><AiFillGithub /></a>
                            </li>
                            <li className="social-icons">
                                <a href="https://www.linkedin.com/in/maximo-patron-a1b1a4262/" className="icon-divour  home-social-icons"><FaLinkedinIn /></a>
                            </li>
                            <li className="social-icons">
                                <a href="https://www.instagram.com/maximo_patron" className="icon-divour home-social-icons"><AiFillInstagram /></a>
                            </li>
                            <div className="right">
                            <a
                                className="btn"
                                href={pdf}
                                download="Curriculum_Maximo_Patron.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FaDownload />
                                &nbsp;Download CV
                            </a>
                            </div>
                        </ul>

                    </div>
                </div>
            </div>
        </div>


    );
});
export default Footer;