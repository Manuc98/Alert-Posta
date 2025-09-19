import './Dashboard.css'

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard - Alert@Postas</h1>
        <p>Bem-vindo ao sistema de gestão de apostas</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-info">
            <h3>Status do Bot</h3>
            <p className="stat-value">Ativo</p>
            <span className="stat-status online">Online</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>Sinais Hoje</h3>
            <p className="stat-value">12</p>
            <span className="stat-change positive">+3 desde ontem</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Taxa de Sucesso</h3>
            <p className="stat-value">78%</p>
            <span className="stat-change positive">+2% esta semana</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <h3>Precisão</h3>
            <p className="stat-value">85%</p>
            <span className="stat-change positive">+1% este mês</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Sinais Recentes</h2>
          <div className="signals-list">
            <div className="signal-item">
              <div className="signal-info">
                <h4>Manchester United vs Liverpool</h4>
                <p>Over 2.5 Goals - 1.85</p>
              </div>
              <div className="signal-status success">✅ Ganho</div>
            </div>
            <div className="signal-item">
              <div className="signal-info">
                <h4>Barcelona vs Real Madrid</h4>
                <p>Barcelona Win - 2.10</p>
              </div>
              <div className="signal-status pending">⏳ Pendente</div>
            </div>
            <div className="signal-item">
              <div className="signal-info">
                <h4>Bayern Munich vs Dortmund</h4>
                <p>BTTS - 1.75</p>
              </div>
              <div className="signal-status loss">❌ Perdido</div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Ações Rápidas</h2>
          <div className="quick-actions">
            <button className="action-btn primary">Iniciar Bot</button>
            <button className="action-btn secondary">Ver Histórico</button>
            <button className="action-btn secondary">Configurações</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
