import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Pedidos from './pages/Pedidos'
import Envios from './pages/Envios'

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/envios" element={<Envios />} />
        </Routes>
      </main>
    </div>
  )
}
