# MVP Logística — Ejemplo de despliegue

Sistema mínimo de logística (inventario, pedidos y envíos con tracking) pensado como
**ejercicio didáctico de despliegue**: la meta no es el código en sí, sino que cualquier
estudiante de logística pueda llevar un sistema real desde cero hasta funcionando en
internet, entendiendo cada paso.

Arquitectura:

```
┌─────────────────────┐        ┌───────────────────────────┐
│   Frontend (React)  │ <────> │  Supabase (PostgreSQL +   │
│   desplegado en     │  HTTPS │  API REST automática)      │
│   Vercel             │        │                            │
└─────────────────────┘        └───────────────────────────┘
```

No hay backend propio: Supabase expone la base de datos como API REST automáticamente,
y la lógica de negocio (descontar stock, crear envíos, actualizar tracking) vive en
funciones SQL dentro de la propia base de datos.

## Requisitos previos

- Cuenta gratuita en [supabase.com](https://supabase.com)
- Cuenta gratuita en [vercel.com](https://vercel.com) (solo para el despliegue final)
- [Node.js](https://nodejs.org) 18 o superior instalado en tu computador
- Una cuenta de GitHub (recomendado, para conectar con Vercel)

## Paso 1 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo (elige una
   contraseña de base de datos y guárdala).
2. Espera a que el proyecto termine de aprovisionarse (1-2 minutos).
3. Ve a **SQL Editor** → **New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.
4. Repite el mismo paso con [`supabase/seed.sql`](supabase/seed.sql) para cargar
   productos de ejemplo.
5. Ve a **Project Settings** → **API** y copia:
   - **Project URL**
   - **anon public key**

## Paso 2 — Ejecutar el frontend en tu computador

```bash
cd frontend
npm install
cp .env.example .env
```

Abre `.env` y pega los valores que copiaste de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Levanta el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). Deberías ver el panel con los
8 productos de ejemplo. Prueba crear un pedido y luego generar un envío desde la
sección **Pedidos** → **Envíos**.

## Paso 3 — Desplegar a producción (Vercel)

1. Sube esta carpeta a un repositorio de GitHub.
2. Entra a [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. En **Root Directory** selecciona `frontend`.
4. En **Environment Variables** agrega las mismas dos variables del paso 2
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Presiona **Deploy**. En 1-2 minutos tendrás una URL pública tipo
   `https://tu-proyecto.vercel.app`.

Cada vez que hagas `git push`, Vercel vuelve a desplegar automáticamente. Ese es el
flujo real de CI/CD que vas a ver en cualquier equipo de software.

## Estructura del proyecto

```
logistica-mvp/
├── supabase/
│   ├── schema.sql     # tablas, funciones SQL y seguridad (RLS)
│   └── seed.sql        # datos de ejemplo
├── frontend/
│   ├── src/
│   │   ├── pages/       # Panel, Inventario, Pedidos, Envíos
│   │   ├── lib/         # cliente de Supabase y tipos TypeScript
│   │   └── components/
│   ├── .env.example
│   └── vercel.json      # configuración de rutas para Vercel
└── README.md
```

## Flujo funcional

1. **Inventario**: se registran productos con stock y stock mínimo.
2. **Pedidos**: se elige un cliente y productos; la función SQL
   `fn_crear_pedido` valida el stock disponible y lo descuenta de forma atómica.
3. **Envíos**: desde un pedido confirmado se genera un envío con código de
   tracking (`fn_crear_envio`).
4. **Tracking**: cada envío tiene una línea de tiempo de eventos; el botón
   "Marcar en tránsito / entregado" llama a `fn_actualizar_envio_estado`, que
   registra el evento y, al llegar a "entregado", cierra el pedido.

## Nota de seguridad

Las políticas de Row Level Security en `schema.sql` dejan las tablas abiertas
(lectura/escritura pública con la llave `anon`) a propósito, para que el ejercicio
funcione sin necesidad de implementar autenticación. **Esto es intencional para
un entorno educativo y nunca debe usarse así con datos reales.** En un sistema de
producción cada política se restringe por usuario o rol autenticado.
