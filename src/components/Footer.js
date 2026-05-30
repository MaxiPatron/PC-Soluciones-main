import "./FooterStyle.css";
import React, { forwardRef } from "react";
import { FaHome, FaMailBulk } from "react-icons/fa";
import { AiFillInstagram } from "react-icons/ai";
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
                        <h4><FaMailBulk size={20} style={{ color: "#fff", marginRight: "2rem" }} /><a href="mailto:pcsolucionesvas@gmail.com">
  pcsolucionesvas@gmail.com
</a></h4>
                    </div>
                </div>
                <div>
                    <div md={12} className="home-about-social">
                        <ul className="home-about-social-links">
                            <li className="social-icons">
                                <a href="https://www.instagram.com/vas_pc_soluciones/" className="icon-divour home-social-icons"><AiFillInstagram /></a>
                            </li>
                            <div className="right">
                            </div>
                        </ul>

                    </div>
                </div>
            </div>
        </div>


    );
});
export default Footer;