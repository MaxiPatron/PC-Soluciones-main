import React from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import About from '../components/About'
import ImageCarousel from '../components/ImageCarousel'
import Categorias from '../components/categorias'
import FeaturedBrands from "../components/FeaturedBrands";

const Home = () => {
  return (
    <div>
      <NavBar />
      <ImageCarousel />
      <Categorias />
      <FeaturedBrands />
      <About />
      <Footer />
    </div>
  )
}
export default Home
