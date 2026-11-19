# Logistics MVP — Deployment example

🇬🇧 **English** · 🇪🇨 [Español](README.es.md)

> **Status: paused since 6 Nov 2026** (see [PLAN.md](PLAN.md)). It stays public and working.

A minimal logistics system (inventory, orders and shipments with tracking) designed as a **hands-on deployment
exercise**: the goal is not the code itself, but for any logistics student to take a real system from zero to running
on the internet, understanding every step. The app's interface is in Spanish.

Architecture:

```
┌─────────────────────┐        ┌───────────────────────────┐
│   Frontend (React)  │ <────> │  Supabase (PostgreSQL +   │
│   deployed on       │  HTTPS │  automatic REST API)       │
│   Vercel             │        │                            │
└─────────────────────┘        └───────────────────────────┘
```

There is no custom backend: Supabase exposes the database as a REST API automatically, and the business logic
(deducting stock, creating shipments, updating tracking) lives in SQL functions inside the database itself.

## Prerequisites

- Free account at [supabase.com](https://supabase.com)
- Free account at [vercel.com](https://vercel.com) (only for the final deployment)
- [Node.js](https://nodejs.org) 18 or later installed on your computer
- A GitHub account (recommended, to connect with Vercel)

## Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (choose a database password and keep it).
2. Wait for the project to finish provisioning (1–2 minutes).
3. Go to **SQL Editor** → **New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and press
   **Run**.
4. Repeat the same step with [`supabase/seed.sql`](supabase/seed.sql) to load sample products.
5. Go to **Project Settings** → **API** and copy:
   - **Project URL**
   - **anon public key**

## Step 2 — Run the frontend on your computer

```bash
cd frontend
npm install
cp .env.example .env
```

Open `.env` and paste the values you copied from Supabase:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see the dashboard with the 8 sample products. Try
creating an order and then generating a shipment from **Pedidos** (Orders) → **Envíos** (Shipments).

## Step 3 — Deploy to production (Vercel)

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Under **Root Directory** select `frontend`.
4. Under **Environment Variables** add the same two variables from step 2 (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`).
5. Press **Deploy**. In 1–2 minutes you will have a public URL like `https://your-project.vercel.app`.

Every time you `git push`, Vercel redeploys automatically. That is the real CI/CD flow you will see on any software
team.

## Project structure

```
logistica-mvp/
├── supabase/
│   ├── schema.sql     # tables, SQL functions and security (RLS)
│   └── seed.sql        # sample data
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Inventory, Orders, Shipments
│   │   ├── lib/         # Supabase client and TypeScript types
│   │   └── components/
│   ├── .env.example
│   └── vercel.json      # route configuration for Vercel
└── README.md
```

## Functional flow

1. **Inventory**: products are registered with stock and minimum stock.
2. **Orders**: you pick a customer and products; the SQL function `fn_crear_pedido` checks available stock and deducts
   it atomically.
3. **Shipments**: from a confirmed order a shipment is generated with a tracking code (`fn_crear_envio`).
4. **Tracking**: each shipment has a timeline of events; the "Mark in transit / delivered" button calls
   `fn_actualizar_envio_estado`, which records the event and, on reaching "delivered", closes the order.

## Security note

The Row Level Security policies in `schema.sql` leave the tables open (public read/write with the `anon` key) on
purpose, so the exercise works without implementing authentication. **This is intentional for a learning
environment and must never be used this way with real data.** In a production system each policy is restricted by
authenticated user or role.

## License

[MIT](LICENSE).
