import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Envio, EnvioEvento, Pedido } from '../lib/types'

const siguienteEstado: Record<string, { estado: Envio['estado']; label: string; descripcion: string }> = {
  pendiente: { estado: 'en_transito', label: 'Marcar en tránsito', descripcion: 'El paquete salió de bodega' },
  en_transito: { estado: 'entregado', label: 'Marcar entregado', descripcion: 'El paquete fue entregado al cliente' },
}

export default function Envios() {
  const [envios, setEnvios] = useState<Envio[]>([])
  const [pedidosConfirmados, setPedidosConfirmados] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [pedidoId, setPedidoId] = useState('')
  const [direccion, setDireccion] = useState('')
  const [transportista, setTransportista] = useState('Interno')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [trackingEnvio, setTrackingEnvio] = useState<Envio | null>(null)
  const [eventos, setEventos] = useState<EnvioEvento[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [e, p] = await Promise.all([
      supabase.from('envios').select('*, pedidos(*)').order('created_at', { ascending: false }),
      supabase.from('pedidos').select('*').in('estado', ['confirmado', 'en_preparacion']),
    ])
    setEnvios(e.data ?? [])
    setPedidosConfirmados(p.data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase.rpc('fn_crear_envio', {
      p_pedido_id: pedidoId,
      p_direccion_destino: direccion.trim(),
      p_transportista: transportista.trim() || 'Interno',
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setPedidoId('')
    setDireccion('')
    setTransportista('Interno')
    setShowModal(false)
    load()
  }

  async function openTracking(envio: Envio) {
    setTrackingEnvio(envio)
    const { data } = await supabase
      .from('envio_eventos')
      .select('*')
      .eq('envio_id', envio.id)
      .order('created_at', { ascending: false })
    setEventos(data ?? [])
  }

  async function avanzarEstado() {
    if (!trackingEnvio) return
    const next = siguienteEstado[trackingEnvio.estado]
    if (!next) return
    const { error } = await supabase.rpc('fn_actualizar_envio_estado', {
      p_envio_id: trackingEnvio.id,
      p_nuevo_estado: next.estado,
      p_descripcion: next.descripcion,
      p_ubicacion: null,
    })
    if (!error) {
      const updated = { ...trackingEnvio, estado: next.estado }
      setTrackingEnvio(updated)
      openTracking(updated)
      load()
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Envíos</h1>
          <p className="subtitle">Genera envíos desde pedidos confirmados y da seguimiento a su estado.</p>
        </div>
        <button onClick={() => setShowModal(true)} disabled={pedidosConfirmados.length === 0}>
          + Nuevo envío
        </button>
      </div>

      {pedidosConfirmados.length === 0 && !loading && (
        <div className="config-warning">
          No hay pedidos confirmados listos para envío. Crea uno en la sección <strong>Pedidos</strong>.
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : envios.length === 0 ? (
        <div className="card empty-state">Aún no hay envíos.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tracking</th>
              <th>Pedido</th>
              <th>Transportista</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {envios.map((e) => (
              <tr key={e.id}>
                <td>{e.codigo_tracking}</td>
                <td>{e.pedidos?.codigo}</td>
                <td>{e.transportista}</td>
                <td>
                  <span className={'badge ' + e.estado}>{e.estado.replace('_', ' ')}</span>
                </td>
                <td>
                  <button className="secondary" onClick={() => openTracking(e)}>Ver tracking</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h1 style={{ fontSize: '1.2rem' }}>Nuevo envío</h1>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Pedido confirmado</label>
                <select required value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}>
                  <option value="">Selecciona un pedido</option>
                  {pedidosConfirmados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} — {p.cliente_nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Dirección de destino</label>
                <input required value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              </div>
              <div className="field">
                <label>Transportista</label>
                <input value={transportista} onChange={(e) => setTransportista(e.target.value)} />
              </div>
              <div className="actions-row">
                <button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Generar envío'}</button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trackingEnvio && (
        <div className="modal-backdrop" onClick={() => setTrackingEnvio(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h1 style={{ fontSize: '1.2rem' }}>Tracking — {trackingEnvio.codigo_tracking}</h1>
            <p className="subtitle">
              Destino: {trackingEnvio.direccion_destino} · Transportista: {trackingEnvio.transportista}
            </p>

            <div className="timeline">
              {eventos.map((ev) => (
                <div className="timeline-item" key={ev.id}>
                  <span className={'badge ' + ev.estado}>{ev.estado.replace('_', ' ')}</span>
                  <div>{ev.descripcion}</div>
                  {ev.ubicacion && <div className="timeline-time">{ev.ubicacion}</div>}
                  <div className="timeline-time">{new Date(ev.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="actions-row" style={{ marginTop: 16 }}>
              {siguienteEstado[trackingEnvio.estado] && (
                <button onClick={avanzarEstado}>{siguienteEstado[trackingEnvio.estado].label}</button>
              )}
              <button className="secondary" onClick={() => setTrackingEnvio(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
