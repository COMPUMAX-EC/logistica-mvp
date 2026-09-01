import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Pedido, Producto } from '../lib/types'

interface ItemForm {
  producto_id: string
  cantidad: string
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [items, setItems] = useState<ItemForm[]>([{ producto_id: '', cantidad: '1' }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [pe, pr] = await Promise.all([
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      supabase.from('productos').select('*').order('nombre'),
    ])
    setPedidos(pe.data ?? [])
    setProductos(pr.data ?? [])
    setLoading(false)
  }

  function updateItem(idx: number, field: keyof ItemForm, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { producto_id: '', cantidad: '1' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const payloadItems = items
      .filter((it) => it.producto_id && Number(it.cantidad) > 0)
      .map((it) => ({ producto_id: it.producto_id, cantidad: Number(it.cantidad) }))

    if (payloadItems.length === 0) {
      setError('Agrega al menos un producto al pedido')
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('fn_crear_pedido', {
      p_cliente_nombre: clienteNombre.trim(),
      p_cliente_email: clienteEmail.trim() || null,
      p_items: payloadItems,
    })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setClienteNombre('')
    setClienteEmail('')
    setItems([{ producto_id: '', cantidad: '1' }])
    setShowModal(false)
    load()
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Pedidos</h1>
          <p className="subtitle">Crea pedidos de clientes; el stock se descuenta automáticamente.</p>
        </div>
        <button onClick={() => setShowModal(true)} disabled={productos.length === 0}>
          + Nuevo pedido
        </button>
      </div>

      {productos.length === 0 && !loading && (
        <div className="config-warning">
          No hay productos en inventario todavía. Ve a la sección <strong>Inventario</strong> para crear alguno antes
          de generar pedidos.
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : pedidos.length === 0 ? (
        <div className="card empty-state">Aún no hay pedidos.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.cliente_nombre}</td>
                <td>${Number(p.total).toFixed(2)}</td>
                <td>
                  <span className={'badge ' + p.estado}>{p.estado.replace('_', ' ')}</span>
                </td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h1 style={{ fontSize: '1.2rem' }}>Nuevo pedido</h1>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nombre del cliente</label>
                <input required value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
              </div>
              <div className="field">
                <label>Email del cliente (opcional)</label>
                <input type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
              </div>

              <label>Productos</label>
              {items.map((it, idx) => (
                <div className="item-row" key={idx}>
                  <div>
                    <select
                      required
                      value={it.producto_id}
                      onChange={(e) => updateItem(idx, 'producto_id', e.target.value)}
                    >
                      <option value="">Selecciona un producto</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock === 0}>
                          {p.nombre} (stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      required
                      type="number"
                      min="1"
                      value={it.cantidad}
                      onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                    />
                  </div>
                  <button type="button" className="secondary" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="secondary" onClick={addItem} style={{ marginBottom: 16 }}>
                + Agregar producto
              </button>

              <div className="actions-row">
                <button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear pedido'}</button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
