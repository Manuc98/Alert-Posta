import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import BotControl from './pages/BotControl/BotControl'
import Historico from './pages/Historico/Historico'
import Notificacoes from './pages/Notificacoes/Notificacoes'
import Logs from './pages/Logs/Logs'
import Subscricao from './pages/Subscricao/Subscricao'
import Admin from './pages/Admin/Admin'
import Configuracoes from './pages/Configuracoes/Configuracoes'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/bot-control" replace />} />
        <Route path="/bot-control" element={<BotControl />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/subscricao" element={<Subscricao />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  )
}

export default App
