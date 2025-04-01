import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
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
                            count: 5, 
                            query: "computers",
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
        speed: 2000,
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000, // Ahora el cambio será cada 5 segundos
        cssEase: "linear",
        arrows: false, // Esto oculta las flechas de navegación
    };
    return (
        <div className="carousel-container">
            <Slider {...settings}>
                {images.map((img) => (
                    <div key={img.id} className="carousel-slide">
                        <img src={img.urls.regular} alt={img.alt_description} />
                    </div>
                ))}
            </Slider>
        </div>
    );
};

export default ImageCarousel;