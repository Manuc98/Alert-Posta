import './Logs.css'

const Logs = () => {
  return (
    <div className="logs">
      <div className="page-header">
        <h1>Logs do Sistema</h1>
        <p>Registos de atividade e erros do sistema</p>
      </div>

      <div className="logs-content">
        <div className="log-entry">
          <span className="log-time">19/09/2025 14:30:25</span>
          <span className="log-level info">INFO</span>
          <span className="log-message">Bot iniciado com sucesso</span>
        </div>
        <div className="log-entry">
          <span className="log-time">19/09/2025 14:29:15</span>
          <span className="log-level warning">WARN</span>
          <span className="log-message">API Football rate limit atingido</span>
        </div>
        <div className="log-entry">
          <span className="log-time">19/09/2025 14:28:45</span>
          <span className="log-level error">ERROR</span>
          <span className="log-message">Falha na conexão com Telegram</span>
        </div>
      </div>
    </div>
  )
}

export default Logs
