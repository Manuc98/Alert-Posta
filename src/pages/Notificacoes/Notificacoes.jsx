import './Notificacoes.css'

const Notificacoes = () => {
  return (
    <div className="notificacoes">
      <div className="page-header">
        <h1>Notificações</h1>
        <p>Gerir alertas e notificações do sistema</p>
      </div>

      <div className="notification-settings">
        <h2>Configurações de Notificação</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Notificar novos sinais
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Notificar resultados
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input type="checkbox" />
              Notificar erros do sistema
            </label>
          </div>
        </div>
      </div>

      <div className="recent-notifications">
        <h2>Notificações Recentes</h2>
        <div className="notification-list">
          <div className="notification-item">
            <div className="notification-icon">🔔</div>
            <div className="notification-content">
              <h4>Novo sinal disponível</h4>
              <p>Manchester United vs Liverpool - Over 2.5 Goals</p>
              <span className="notification-time">Há 5 minutos</span>
            </div>
          </div>
          <div className="notification-item">
            <div className="notification-icon">✅</div>
            <div className="notification-content">
              <h4>Sinal ganho</h4>
              <p>Barcelona vs Real Madrid - Barcelona Win</p>
              <span className="notification-time">Há 1 hora</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Notificacoes
