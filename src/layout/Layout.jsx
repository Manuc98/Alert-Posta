import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const menuItems = [
    { path: '/bot-control', label: 'Controlo do Bot', icon: '🤖' },
    { path: '/historico', label: 'Histórico', icon: '📊' },
    { path: '/notificacoes', label: 'Notificações', icon: '🔔' },
    { path: '/logs', label: 'Logs', icon: '📋' },
    { path: '/subscricao', label: 'Subscrição', icon: '💳' },
    { path: '/admin', label: 'Admin', icon: '👑' },
    { path: '/configuracoes', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="logo">Alert@Postas</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1 className="page-title">
              {location.pathname === '/bot-control' && <span className="home-indicator">🏠</span>}
              {menuItems.find(item => item.path === location.pathname)?.label || 'Controlo do Bot'}
            </h1>
          </div>
          
          <div className="topbar-right">
            <div className="user-info">
              <span className="user-name">Admin</span>
              <div className="user-avatar">👤</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
