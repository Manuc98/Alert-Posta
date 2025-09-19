import './Configuracoes.css'

const Configuracoes = () => {
  return (
    <div className="configuracoes">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Personalizar o comportamento do sistema</p>
      </div>

      <div className="config-sections">
        <div className="config-section">
          <h2>API Football</h2>
          <div className="config-item">
            <label>API Key:</label>
            <input type="password" placeholder="Insira a sua API key" />
          </div>
          <div className="config-item">
            <label>Rate Limit:</label>
            <select>
              <option>100 requests/min</option>
              <option>200 requests/min</option>
              <option>500 requests/min</option>
            </select>
          </div>
        </div>

        <div className="config-section">
          <h2>Telegram</h2>
          <div className="config-item">
            <label>Bot Token:</label>
            <input type="password" placeholder="Insira o token do bot" />
          </div>
          <div className="config-item">
            <label>Chat ID:</label>
            <input type="text" placeholder="ID do chat/grupo" />
          </div>
        </div>

        <div className="config-section">
          <h2>Preferências</h2>
          <div className="config-item">
            <label>
              <input type="checkbox" defaultChecked />
              Modo escuro
            </label>
          </div>
          <div className="config-item">
            <label>
              <input type="checkbox" defaultChecked />
              Notificações push
            </label>
          </div>
          <div className="config-item">
            <label>
              <input type="checkbox" />
              Auto-refresh
            </label>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button className="save-btn">Guardar Configurações</button>
        <button className="reset-btn">Resetar</button>
      </div>
    </div>
  )
}

export default Configuracoes
