import React from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";
import "./CategoriasStyle.css";

const categorias = [
    { nombre: "Fuentes", imagen: "/fuente.jpeg" },
    { nombre: "Gabinetes", imagen: "/Gabinete.png" },
    { nombre: "Tarjetas Gráficas", imagen: "/grafica.jpg" },
    { nombre: "Monitores", imagen: "/Monitor.jpg" },
    { nombre: "Motherboards", imagen: "/mother.jpg" },
    { nombre: "Notebooks", imagen: "/notebook.png" },
    { nombre: "Memorias RAM", imagen: "/ram.jpg" },
    { nombre: "Microprocesadores", imagen: "/Ryzen7.png" },
    { nombre: "Almacenamiento", imagen: "/ssd.jpg" },
    { nombre: "Impresoras", imagen: "/impresoras.jpg" },
];

const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    responsive: [
        {
            breakpoint: 1024,
            settings: {
                slidesToShow: 4,
            },
        },
        {
            breakpoint: 768,
            settings: {
                slidesToShow: 2,
            },
        },
        {
            breakpoint: 480,
            settings: {
                slidesToShow: 1,
            },
        },
    ],
};

const Categorias = () => {
    return (
        <div className="categorias-container">
            <h2>Explorá nuestras <span>categorías</span></h2>
            <div className="carousel-wrapper">
                <Slider {...settings} className="categorias-slider">
                    {categorias.map((categoria, index) => (
                        <div key={index} className="categoria-item">
                            <Link to={`/productos?categoria=${categoria.nombre}`}>
                                <img src={categoria.imagen} alt={categoria.nombre} />
                                <p>{categoria.nombre}</p>
                            </Link>
                        </div>
                    ))}
                </Slider>
            </div>
        </div>
    );
};

export default Categorias;