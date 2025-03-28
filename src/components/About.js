import React from "react";
import "./AboutStyle.css";
const About = () => {
    return (
        <div fluid className="home-about-section" id="about">
            <div>
                <div>
                    <h1 style={{ fontSize: "2.6em", textDecoration: "underline" }}>SOBRE NOSOTROS</h1>
                    <div md={8} className="home-about-description">
                        <div className="left">
                            <div className="AbImg">
                                <img className="into-Img" alt="IntroImg" />
                            </div>
                        </div>
                        <div className="right">
                            <p>
                                Me llamo Patrón Máximo, tengo 21 y actualmente terminé el cursado de la carrera de Analista de Sistemas de Computación en <a href="https://www.cervantes.edu.ar/">Institución Cervantes</a><br />
                                En un principio cuando me interesó el mundo de la programación por el 2018 practiqué bastante Fron End, luego adentrándome más me incline hacia el Back End logrando que me interese aún más por la programación
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default About;
