import './Admin.css'

const Admin = () => {
  return (
    <div className="admin">
      <div className="page-header">
        <h1>Painel de Administração</h1>
        <p>Ferramentas avançadas de gestão do sistema</p>
      </div>

      <div className="admin-sections">
        <div className="admin-section">
          <h2>Gestão de Utilizadores</h2>
          <div className="admin-actions">
            <button className="admin-btn">Ver Utilizadores</button>
            <button className="admin-btn">Adicionar Utilizador</button>
            <button className="admin-btn">Estatísticas</button>
          </div>
        </div>

        <div className="admin-section">
          <h2>Sistema</h2>
          <div className="admin-actions">
            <button className="admin-btn">Backup</button>
            <button className="admin-btn">Logs do Sistema</button>
            <button className="admin-btn">Monitorização</button>
          </div>
        </div>

        <div className="admin-section">
          <h2>API</h2>
          <div className="admin-actions">
            <button className="admin-btn">Testar APIs</button>
            <button className="admin-btn">Configurar Keys</button>
            <button className="admin-btn">Rate Limits</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
