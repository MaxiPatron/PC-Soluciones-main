import "./FooterStyle.css";
import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaInstagram, FaMapMarkerAlt, FaWhatsapp } from "react-icons/fa";
import Logo from "../assets/LogoSinFondoa.png";
import { whatsappLink } from "../utils/store";

const categories = [
  { name: "Microprocesadores", slug: "microprocesadores" },
  { name: "Placas de video", slug: "tarjetas-graficas" },
  { name: "Motherboards", slug: "motherboards" },
  { name: "Memoria RAM", slug: "memoria-ram" },
  { name: "Almacenamiento", slug: "almacenamiento" },
  { name: "Notebooks", slug: "notebooks" },
];

const Footer = forwardRef((props, ref) => {
  return (
    <footer className="footer" ref={ref}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src={Logo} alt="" />
            <span>
              PC <strong>Soluciones</strong>
            </span>
          </Link>
          <p>
            Hardware, notebooks y periféricos con asesoramiento personalizado para que elijas lo mejor
            según tu presupuesto.
          </p>
          <div className="footer-social">
            <a href="https://www.instagram.com/vas_pc_soluciones/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
            <a href="mailto:pcsolucionesvas@gmail.com" aria-label="Email">
              <FaEnvelope />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Tienda</h4>
          <ul>
            <li><Link to="/productos">Todos los productos</Link></li>
            <li><Link to="/armar-pc">Armá tu PC</Link></li>
            <li><Link to="/carrito">Carrito</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Categorías</h4>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/productos?categoria=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contacto</h4>
          <ul className="footer-contact">
            <li>
              <FaMapMarkerAlt /> Córdoba, Argentina
            </li>
            <li>
              <FaWhatsapp />
              <a href={whatsappLink()} target="_blank" rel="noreferrer">+54 9 351 325-6553</a>
            </li>
            <li>
              <FaEnvelope />
              <a href="mailto:pcsolucionesvas@gmail.com">pcsolucionesvas@gmail.com</a>
            </li>
            <li>
              <FaInstagram />
              <a href="https://www.instagram.com/vas_pc_soluciones/" target="_blank" rel="noreferrer">
                @vas_pc_soluciones
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} PC Soluciones. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
});

export default Footer;
