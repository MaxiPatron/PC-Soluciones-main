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
                                En PC Soluciones nos especializamos en la venta de componentes, notebooks,
                                periféricos y accesorios para setups de trabajo, gaming y uso profesional.
                                <br /><br />

                                Brindamos asesoramiento personalizado para ayudarte a elegir el hardware
                                adecuado según tu presupuesto, necesidad y tipo de uso.
                                <br /><br />

                                También ofrecemos soluciones vinculadas al armado, mantenimiento y mejora de
                                equipos, buscando siempre rendimiento, confianza y atención cercana.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default About;
