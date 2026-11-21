import React from "react";
import { FaComments, FaMicrochip, FaTools } from "react-icons/fa";
import "./AboutStyle.css";
import AboutImg from "../assets/LogoSinFondoa.png";

const features = [
  {
    icon: <FaMicrochip />,
    title: "Hardware seleccionado",
    text: "Componentes, notebooks, periféricos y accesorios para gaming, trabajo y uso profesional.",
  },
  {
    icon: <FaComments />,
    title: "Asesoramiento personalizado",
    text: "Te ayudamos a elegir el hardware adecuado según tu presupuesto, necesidad y tipo de uso.",
  },
  {
    icon: <FaTools />,
    title: "Armado y mantenimiento",
    text: "Soluciones para armar, mantener y mejorar tus equipos, con atención cercana.",
  },
];

const About = () => {
  return (
    <section className="about-section" id="about">
      <div className="about-main">
        <div className="about-text">
          <span className="section-eyebrow">Sobre nosotros</span>
          <h2>
            Rendimiento, confianza y <span className="text-accent">atención cercana</span>
          </h2>
          <p>
            En PC Soluciones nos especializamos en la venta de componentes, notebooks, periféricos y
            accesorios para setups de trabajo, gaming y uso profesional.
          </p>
          <p>
            Brindamos asesoramiento personalizado para ayudarte a elegir el hardware adecuado según tu
            presupuesto, necesidad y tipo de uso. También ofrecemos soluciones vinculadas al armado,
            mantenimiento y mejora de equipos.
          </p>
        </div>

        <div className="about-logo">
          <div className="about-logo-ring">
            <img src={AboutImg} alt="PC Soluciones" />
          </div>
        </div>
      </div>

      <div className="about-features">
        {features.map((f) => (
          <article key={f.title} className="about-feature">
            <span className="about-feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default About;
