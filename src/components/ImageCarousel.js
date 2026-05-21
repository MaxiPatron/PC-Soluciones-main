import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import { Link } from "react-router-dom";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./ImageCarousel.css";

const ImageCarousel = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get(
          "https://api.unsplash.com/photos/random",
          {
            params: {
              count: 6,
              query: "gaming pc computer hardware",
              client_id: "g9hgZSpWnPtE0PGTVVUHnlBq0HnvcmPfyIwWcQKi5wo",
            },
          }
        );

        setImages(response.data);
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    fetchImages();
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    speed: 2500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4500,
    fade: true,
    arrows: false,
    pauseOnHover: false,
  };

  return (
    <section className="hero-carousel">
      <Slider {...settings}>
        {images.map((img) => (
          <div key={img.id} className="hero-slide">
            <img src={img.urls.regular} alt={img.alt_description || "PC hardware"} />
          </div>
        ))}
      </Slider>

      <div className="hero-overlay"></div>

      <div className="hero-content">
        <span className="hero-tag">Hardware • Servicio Técnico • Gaming</span>

        <h1>
          Armá tu PC ideal con <span>componentes seleccionados</span>
        </h1>

        <p>
          Venta de hardware, notebooks, periféricos y asesoramiento personalizado
          para que elijas lo mejor según tu presupuesto.
        </p>

        <div className="hero-actions">
          <Link to="/productos" className="hero-btn primary">
            Ver productos
          </Link>

          <a
            href="https://wa.me/5493510000000"
            target="_blank"
            rel="noreferrer"
            className="hero-btn secondary"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

export default ImageCarousel;