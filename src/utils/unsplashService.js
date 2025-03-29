import axios from "axios";

const accessKey = "g9hgZSpWnPtE0PGTVVUHnlBq0HnvcmPfyIwWcQKi5wo";

const getTechImages = async (query = "technology", count = 10) => {
    try {
        const response = await axios.get(`https://api.unsplash.com/photos/random`, {
            params: {
                query,
                count,
                client_id: accessKey,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener imágenes de Unsplash:", error);
        return [];
    }
};

export default getTechImages;
