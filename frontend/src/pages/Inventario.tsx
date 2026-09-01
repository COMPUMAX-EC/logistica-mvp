import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Producto } from '../lib/types'

const emptyForm = { sku: '', nombre: '', descripcion: '', precio: '', stock: '', stock_minimo: '5' }

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('productos').select('*').order('nombre')
    if (!error) setProductos(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase.from('productos').insert({
      sku: form.sku.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio: Number(form.precio),
      stock: Number(form.stock),
      stock_minimo: Number(form.stock_minimo),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm(emptyForm)
    setShowModal(false)
    load()
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Inventario</h1>
          <p className="subtitle">Productos disponibles en bodega.</p>
        </div>
        <button onClick={() => setShowModal(true)}>+ Nuevo producto</button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : productos.length === 0 ? (
        <div className="card empty-state">
          No hay productos todavía. Ejecuta <code>supabase/seed.sql</code> o crea uno con el botón de arriba.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.nombre}</td>
                <td>${Number(p.precio).toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>
                  {p.stock <= p.stock_minimo ? (
                    <span className="badge incidencia">Stock bajo</span>
                  ) : (
                    <span className="badge entregado">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h1 style={{ fontSize: '1.2rem' }}>Nuevo producto</h1>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>SKU</label>
                <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field">
                <label>Nombre</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field">
                <label>Descripción</label>
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div className="field">
                <label>Precio</label>
                <input required type="number" min="0" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </div>
              <div className="field">
                <label>Stock inicial</label>
                <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="field">
                <label>Stock mínimo</label>
                <input required type="number" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
              <div className="actions-row">
                <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
