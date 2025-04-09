import React, { useState, useEffect } from 'react'
import { supabase } from "../utils/supabaseClient";
import "./categoriaForm.css"
const CategoriaForm = () => {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categorias, setCategorias] = useState([])
  
    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!name) return alert('El nombre es obligatorio')
  
      const { error } = await supabase
        .from('categories')
        .insert([{ name, description }])
  
      if (error) {
        alert('Error al agregar categoría')
        console.error(error)
      } else {
        alert('Categoría agregada con éxito')
        setName('')
        setDescription('')
        fetchCategorias()
      }
    }
  
    const fetchCategorias = async () => {
      const { data, error } = await supabase.from('categories').select('*')
      if (!error) setCategorias(data)
    }
  
    useEffect(() => {
      fetchCategorias()
    }, [])
  
    return (
      <div className="container mt-5">
        <h2>Agregar Categoría</h2>
        <form onSubmit={handleSubmit} className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Descripción</label>
            <input
              type="text"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="col-12">
            <button className="btn btn-success" type="submit">
              Agregar Categoría
            </button>
          </div>
        </form>
  
        <h4>Categorías Existentes</h4>
        <ul className="list-group">
          {categorias.map((cat) => (
            <li key={cat.id} className="list-group-item">
              <strong>{cat.name}</strong> — {cat.description || 'Sin descripción'}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  export default CategoriaForm