import React from "react";
import "./AboutStyle.css";
import AboutImg from "../assets/LogoSinFondoa.png";
const About = () => {
    return (
        <div fluid className="home-about-section" id="about">
            <div>
                <div>
                    <h1 style={{ fontSize: "2.6em", textDecoration: "underline" }}>SOBRE NOSOTROS</h1>
                    <div md={8} className="home-about-description">
                        <div className="left">
                            <div className="AbImg">
                                <img className="into-Img" src={AboutImg} alt="IntroImg" />
                            </div>
                        </div>
                        <div className="right">
                            <p>
                                Somos VAS PC, un equipo apasionado por la tecnología💻. 🖥 Nos especializamos en servicio técnico, mantenimiento y armado de computadoras, 🛒 además de la venta de todo lo relacionado con  PCs y tecnología. <br></br>

                                👨‍💻 Nacho Karam: Técnico en computadoras, especialista en mantenimiento, armado y optimización de PCs.<br></br>
                                👨‍🔧 Maximo Patron: Especialista en hardware y tecnología. Encargado de la venta y asesoramiento de PCs, notebooks, monitores, componentes y todo lo relacionado con tecnología.<br></br>
                                💡 Nos esforzamos por ofrecer soluciones rápidas y eficientes para que tu equipo rinda al máximo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default About;
