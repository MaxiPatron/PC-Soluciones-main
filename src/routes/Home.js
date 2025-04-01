import React, { useEffect } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import About from '../components/About'
import ImageCarousel from '../components/ImageCarousel'
import Categorias from '../components/categorias'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
const Home = () => {
  const navigate = useNavigate()

  useEffect(() =>{
    if(!supabase.auth.getUser()){
      navigate('Login');
    }
  }, [navigate]);

  return (
    <div>
      <NavBar />
      <ImageCarousel />
      <Categorias />
      <About />
      <Footer />
    </div>
  )
}
export default Home