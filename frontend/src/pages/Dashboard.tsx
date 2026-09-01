import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Producto, Pedido, Envio } from '../lib/types'

export default function Dashboard() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(true)
  const [configOk, setConfigOk] = useState(true)

  useEffect(() => {
    setConfigOk(Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [p, pe, e] = await Promise.all([
      supabase.from('productos').select('*'),
      supabase.from('pedidos').select('*'),
      supabase.from('envios').select('*'),
    ])
    setProductos(p.data ?? [])
    setPedidos(pe.data ?? [])
    setEnvios(e.data ?? [])
    setLoading(false)
  }

  const stockBajo = productos.filter((p) => p.stock <= p.stock_minimo)
  const pedidosPendientes = pedidos.filter((p) => ['pendiente', 'confirmado', 'en_preparacion'].includes(p.estado))
  const enviosEnTransito = envios.filter((e) => e.estado === 'en_transito' || e.estado === 'pendiente')
  const totalVentas = pedidos.reduce((acc, p) => acc + Number(p.total), 0)

  return (
    <div>
      <h1>Panel general</h1>
      <p className="subtitle">Resumen rápido del estado del sistema.</p>

      {!configOk && (
        <div className="config-warning">
          ⚠️ No se detectan las credenciales de Supabase. Copia <code>frontend/.env.example</code> a{' '}
          <code>frontend/.env</code> y completa <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, luego reinicia el servidor.
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid">
          <div className="card">
            <div className="stat-label">Productos en inventario</div>
            <div className="stat-value">{productos.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">Stock bajo mínimo</div>
            <div className={'stat-value' + (stockBajo.length ? ' warn' : ' ok')}>{stockBajo.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">Pedidos activos</div>
            <div className="stat-value">{pedidosPendientes.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">Envíos en curso</div>
            <div className="stat-value">{enviosEnTransito.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">Ventas totales</div>
            <div className="stat-value ok">${totalVentas.toFixed(2)}</div>
          </div>
        </div>
      )}

      {stockBajo.length > 0 && (
        <>
          <div className="section-header">
            <h1 style={{ fontSize: '1.1rem' }}>Productos con stock bajo</h1>
          </div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              {stockBajo.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td>{p.stock}</td>
                  <td>{p.stock_minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
