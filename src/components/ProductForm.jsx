import React, { useState, useEffect } from 'react'
import { supabase } from "../utils/supabaseClient";
import "./productForm.css"

const ProductForm = () => {
  const [producto, setProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    imagen_url: '',
    stock: '',
    categoria: '',
  })

  const [productos, setProductos] = useState([])

  const handleChange = (e) => {
    setProducto({ ...producto, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('Productos')
      .insert([producto])

    if (error) {
      alert('Error al cargar producto')
      console.error(error)
    } else {
      alert('Producto cargado correctamente')
      setProducto({
        nombre: '',
        descripcion: '',
        precio: '',
        imagen_url: '',
        stock: '',
        categoria: '',
      })
      fetchProductos()
    }
  }

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('Productos').select('*')
    if (!error) setProductos(data)
  }

  useEffect(() => {
    fetchProductos()
  }, [])

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Cargar Producto</h2>
      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Nombre</label>
          <input type="text" className="form-control" name="nombre" value={producto.nombre} onChange={handleChange} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Categoría</label>
          <input type="text" className="form-control" name="categoria" value={producto.categoria} onChange={handleChange} />
        </div>
        <div className="col-12">
          <label className="form-label">Descripción</label>
          <textarea className="form-control" name="descripcion" value={producto.descripcion} onChange={handleChange} rows="2"></textarea>
        </div>
        <div className="col-md-4">
          <label className="form-label">Precio</label>
          <input type="number" className="form-control" name="precio" value={producto.precio} onChange={handleChange} required />
        </div>
        <div className="col-md-4">
          <label className="form-label">Stock</label>
          <input type="number" className="form-control" name="stock" value={producto.stock} onChange={handleChange} required />
        </div>
        <div className="col-md-4">
          <label className="form-label">Imagen (URL)</label>
          <input type="text" className="form-control" name="imagen_url" value={producto.imagen_url} onChange={handleChange} />
        </div>
        <div className="col-12">
          <button type="submit" className="btn btn-primary">Cargar Producto</button>
        </div>
      </form>

      <hr className="my-5" />

      <h3>Productos Cargados</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-hover mt-3">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Categoría</th>
              <th>Imagen</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.id}>
                <td>{prod.nombre}</td>
                <td>${prod.precio}</td>
                <td>{prod.stock}</td>
                <td>{prod.categoria}</td>
                <td>
                  {prod.imagen_url && (
                    <img src={prod.imagen_url} alt={prod.nombre} width="60" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProductForm