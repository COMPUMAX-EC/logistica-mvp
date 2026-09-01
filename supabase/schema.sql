-- =====================================================================
-- MVP Logística — Esquema de base de datos (Supabase / PostgreSQL)
-- =====================================================================
-- Cómo usar este archivo:
--   1. Entra a tu proyecto en https://supabase.com
--   2. Ve a "SQL Editor" -> "New query"
--   3. Pega todo este archivo y presiona "Run"
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabla: productos (inventario)
-- ---------------------------------------------------------------------
create table if not exists productos (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null unique,
  nombre        text not null,
  descripcion   text,
  precio        numeric(10, 2) not null check (precio >= 0),
  stock         integer not null default 0 check (stock >= 0),
  stock_minimo  integer not null default 5 check (stock_minimo >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: pedidos
-- ---------------------------------------------------------------------
create table if not exists pedidos (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,
  cliente_nombre text not null,
  cliente_email  text,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado')),
  total          numeric(10, 2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: pedido_items (detalle de cada pedido)
-- ---------------------------------------------------------------------
create table if not exists pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  producto_id     uuid not null references productos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null
);

-- ---------------------------------------------------------------------
-- Tabla: envios
-- ---------------------------------------------------------------------
create table if not exists envios (
  id                 uuid primary key default gen_random_uuid(),
  pedido_id          uuid not null references pedidos(id) on delete cascade,
  codigo_tracking    text not null unique,
  transportista      text not null default 'Interno',
  direccion_destino  text not null,
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'en_transito', 'entregado', 'incidencia')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: envio_eventos (historial de tracking)
-- ---------------------------------------------------------------------
create table if not exists envio_eventos (
  id           uuid primary key default gen_random_uuid(),
  envio_id     uuid not null references envios(id) on delete cascade,
  estado       text not null,
  descripcion  text not null,
  ubicacion    text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_pedido_items_pedido on pedido_items(pedido_id);
create index if not exists idx_envios_pedido on envios(pedido_id);
create index if not exists idx_envio_eventos_envio on envio_eventos(envio_id);

-- =====================================================================
-- Funciones (lógica de negocio dentro de la base de datos)
-- =====================================================================

-- ---------------------------------------------------------------------
-- fn_crear_pedido: crea un pedido completo de forma atómica.
--   - Verifica stock disponible de cada producto.
--   - Descuenta el stock.
--   - Crea el pedido y sus items.
--   - Si algo falla (ej. stock insuficiente), no se aplica nada.
--
-- Parámetro "items" es un arreglo JSON: [{"producto_id": "...", "cantidad": 2}, ...]
-- ---------------------------------------------------------------------
create or replace function fn_crear_pedido(
  p_cliente_nombre text,
  p_cliente_email  text,
  p_items          jsonb
)
returns table (pedido_id uuid, codigo text) as $$
declare
  v_pedido_id   uuid;
  v_codigo      text;
  v_total       numeric(10, 2) := 0;
  v_item        jsonb;
  v_producto    productos%rowtype;
  v_cantidad    integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  v_codigo := 'PED-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 5);

  insert into pedidos (codigo, cliente_nombre, cliente_email, estado, total)
  values (v_codigo, p_cliente_nombre, p_cliente_email, 'pendiente', 0)
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cantidad := (v_item->>'cantidad')::integer;

    select * into v_producto
    from productos
    where id = (v_item->>'producto_id')::uuid
    for update;

    if not found then
      raise exception 'Producto % no existe', (v_item->>'producto_id');
    end if;

    if v_producto.stock < v_cantidad then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_producto.nombre, v_producto.stock, v_cantidad;
    end if;

    update productos
      set stock = stock - v_cantidad, updated_at = now()
      where id = v_producto.id;

    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    values (v_pedido_id, v_producto.id, v_cantidad, v_producto.precio);

    v_total := v_total + (v_producto.precio * v_cantidad);
  end loop;

  update pedidos
    set total = v_total, estado = 'confirmado', updated_at = now()
    where id = v_pedido_id;

  return query select v_pedido_id, v_codigo;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- fn_crear_envio: genera un envío a partir de un pedido confirmado.
-- ---------------------------------------------------------------------
create or replace function fn_crear_envio(
  p_pedido_id         uuid,
  p_direccion_destino text,
  p_transportista     text default 'Interno'
)
returns table (envio_id uuid, codigo_tracking text) as $$
declare
  v_envio_id uuid;
  v_tracking text;
  v_estado   text;
begin
  select estado into v_estado from pedidos where id = p_pedido_id;

  if not found then
    raise exception 'Pedido no encontrado';
  end if;

  if v_estado not in ('confirmado', 'en_preparacion') then
    raise exception 'El pedido debe estar confirmado antes de generar un envío (estado actual: %)', v_estado;
  end if;

  v_tracking := 'TRK-' || upper(substr(md5(random()::text), 1, 10));

  insert into envios (pedido_id, codigo_tracking, transportista, direccion_destino, estado)
  values (p_pedido_id, v_tracking, p_transportista, p_direccion_destino, 'pendiente')
  returning id into v_envio_id;

  insert into envio_eventos (envio_id, estado, descripcion, ubicacion)
  values (v_envio_id, 'pendiente', 'Envío creado, esperando despacho', 'Bodega central');

  update pedidos set estado = 'enviado', updated_at = now() where id = p_pedido_id;

  return query select v_envio_id, v_tracking;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- fn_actualizar_envio_estado: avanza el estado de un envío y registra
-- el evento en el historial de tracking.
-- ---------------------------------------------------------------------
create or replace function fn_actualizar_envio_estado(
  p_envio_id    uuid,
  p_nuevo_estado text,
  p_descripcion  text,
  p_ubicacion    text default null
)
returns void as $$
begin
  update envios
    set estado = p_nuevo_estado, updated_at = now()
    where id = p_envio_id;

  if not found then
    raise exception 'Envío no encontrado';
  end if;

  insert into envio_eventos (envio_id, estado, descripcion, ubicacion)
  values (p_envio_id, p_nuevo_estado, p_descripcion, p_ubicacion);

  if p_nuevo_estado = 'entregado' then
    update pedidos
      set estado = 'entregado', updated_at = now()
      where id = (select pedido_id from envios where id = p_envio_id);
  end if;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- Seguridad: Row Level Security
-- =====================================================================
-- Este es un MVP educativo: dejamos las tablas abiertas a lectura/escritura
-- con la llave "anon" para que el flujo funcione sin necesidad de login.
-- NUNCA uses esta configuración con datos reales o en producción real:
-- en un sistema de verdad, cada política debe restringirse por usuario/rol.

alter table productos enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table envios enable row level security;
alter table envio_eventos enable row level security;

create policy "acceso_publico_lectura_productos" on productos for select using (true);
create policy "acceso_publico_escritura_productos" on productos for all using (true) with check (true);

create policy "acceso_publico_lectura_pedidos" on pedidos for select using (true);
create policy "acceso_publico_escritura_pedidos" on pedidos for all using (true) with check (true);

create policy "acceso_publico_lectura_pedido_items" on pedido_items for select using (true);
create policy "acceso_publico_escritura_pedido_items" on pedido_items for all using (true) with check (true);

create policy "acceso_publico_lectura_envios" on envios for select using (true);
create policy "acceso_publico_escritura_envios" on envios for all using (true) with check (true);

create policy "acceso_publico_lectura_envio_eventos" on envio_eventos for select using (true);
create policy "acceso_publico_escritura_envio_eventos" on envio_eventos for all using (true) with check (true);
