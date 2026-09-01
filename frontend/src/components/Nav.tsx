import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Panel', end: true },
  { to: '/inventario', label: 'Inventario' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/envios', label: 'Envíos' },
]

export default function Nav() {
  return (
    <header className="nav">
      <div className="nav-brand">📦 MVP Logística</div>
      <nav>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
