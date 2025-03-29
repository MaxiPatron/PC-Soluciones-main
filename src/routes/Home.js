import React from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import About from '../components/About'
import ImageCarousel from '../components/ImageCarousel'
const Home = () => {
  return (
    <div>
      <NavBar />
      <ImageCarousel />
      <About />
      <Footer />
    </div>
  )
}
export default Home