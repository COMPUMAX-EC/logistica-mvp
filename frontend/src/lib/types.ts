export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado'

export type EstadoEnvio = 'pendiente' | 'en_transito' | 'entregado' | 'incidencia'

export interface Producto {
  id: string
  sku: string
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  stock_minimo: number
  created_at: string
  updated_at: string
}

export interface Pedido {
  id: string
  codigo: string
  cliente_nombre: string
  cliente_email: string | null
  estado: EstadoPedido
  total: number
  created_at: string
  updated_at: string
}

export interface PedidoItem {
  id: string
  pedido_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  productos?: Producto
}

export interface Envio {
  id: string
  pedido_id: string
  codigo_tracking: string
  transportista: string
  direccion_destino: string
  estado: EstadoEnvio
  created_at: string
  updated_at: string
  pedidos?: Pedido
}

export interface EnvioEvento {
  id: string
  envio_id: string
  estado: string
  descripcion: string
  ubicacion: string | null
  created_at: string
}
