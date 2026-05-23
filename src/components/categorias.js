import React from "react";
import { Link } from "react-router-dom";
import "./CategoriasStyle.css";

const categorias = [
  { nombre: "Fuentes", slug: "fuentes", imagen: "/Fuente.jpg" },
  { nombre: "Gabinetes", slug: "gabinetes", imagen: "/Gabinete.jpg" },
  { nombre: "Tarjetas Gráficas", slug: "tarjetas-graficas", imagen: "/grafica.jpg" },
  { nombre: "Monitores", slug: "monitores", imagen: "/Monitor.jpg" },
  { nombre: "Motherboards", slug: "motherboards", imagen: "/mother.jpg" },
  { nombre: "Notebooks", slug: "notebooks", imagen: "/notebook.png" },
  { nombre: "Memoria RAM", slug: "memoria-ram", imagen: "/ram.jpg" },
  { nombre: "Microprocesadores", slug: "microprocesadores", imagen: "/Micro.jpg" },
  { nombre: "Almacenamiento", slug: "almacenamiento", imagen: "/ssd.jpg" },
  { nombre: "Impresoras", slug: "impresoras", imagen: "/impresoras.jpg" },
];

const Categorias = () => {
  return (
    <section className="categorias-section">
      <div className="categorias-header">
        <span className="categorias-tag">COMPONENTES • HARDWARE • GAMING</span>

        <h2>
          Explorá nuestras <span>categorías</span>
        </h2>

        <p>
          Encontrá hardware seleccionado para gaming, productividad,
          streaming y setups profesionales.
        </p>
      </div>

      <div className="categorias-grid">
        {categorias.map((categoria, index) => (
          <Link
            key={index}
            to={`/productos?categoria=${categoria.slug}`}
            className="categoria-card"
          >
            <img src={categoria.imagen} alt={categoria.nombre} />

            <div className="categoria-overlay"></div>

            <div className="categoria-content">
              <h3>{categoria.nombre}</h3>
              <span>Ver productos</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Categorias;