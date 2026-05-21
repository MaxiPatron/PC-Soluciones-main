import React from "react";
import { Link } from "react-router-dom";
import "./CategoriasStyle.css";

const categorias = [
  { nombre: "Fuentes", imagen: "/Fuente.jpg" },
  { nombre: "Gabinetes", imagen: "/Gabinete.jpg" },
  { nombre: "Tarjetas Gráficas", imagen: "/grafica.jpg" },
  { nombre: "Monitores", imagen: "/Monitor.jpg" },
  { nombre: "Motherboards", imagen: "/mother.jpg" },
  { nombre: "Notebooks", imagen: "/notebook.png" },
  { nombre: "Memorias RAM", imagen: "/ram.jpg" },
  { nombre: "Microprocesadores", imagen: "/Micro.jpg" },
  { nombre: "Almacenamiento", imagen: "/ssd.jpg" },
  { nombre: "Impresoras", imagen: "/impresoras.jpg" },
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
            to={`/productos?categoria=${categoria.nombre}`}
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