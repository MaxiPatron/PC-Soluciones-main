import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import FilterSidebar from '../components/FilterSidebar';
import './ProductsPage.css';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedFilters, setSelectedFilters] = useState({});
    const [inStockOnly] = useState(false);

    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchQuery = queryParams.get('search');
        if (searchQuery) {
            setSearch(searchQuery);
        }
    }, [location.search]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('https://fakestoreapi.com/products');
                setProducts(response.data);
            } catch (error) {
                console.error('Error al obtener productos:', error);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        const applyFilters = () => {
            let filtered = products.filter((product) =>
                product.title.toLowerCase().includes(search.toLowerCase())
            );

            if (inStockOnly) {
                filtered = filtered.filter((product) => product.stock > 0);
            }

            setFilteredProducts(filtered);
        };

        applyFilters();
    }, [products, search, selectedFilters, inStockOnly]);

    const handleFilterChange = (category, variant) => {
        setSelectedFilters((prev) => ({ ...prev, [category]: variant }));
    };


    return (
        <div>
            <NavBar />
            <div className="products-page">
                <FilterSidebar onFilterChange={handleFilterChange} />
                <div className="products-container">
                    <h2>Todos los Productos</h2>
                    <div className="product-list">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <div key={product.id} className="product-card">
                                    <img src={product.image} alt={product.title} />
                                    <h3>{product.title}</h3>
                                    <p>${product.price}</p>
                                </div>
                            ))
                        ) : (
                            <p>No se encontraron productos</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
