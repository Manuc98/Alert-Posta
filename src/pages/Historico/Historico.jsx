import './Historico.css'

const Historico = () => {
  return (
    <div className="historico">
      <div className="page-header">
        <h1>Histórico de Performance</h1>
        <p>Análise detalhada dos resultados das apostas</p>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total de Sinais</h3>
          <p className="stat-value">1,247</p>
        </div>
        <div className="stat-card">
          <h3>Taxa de Sucesso</h3>
          <p className="stat-value">78.5%</p>
        </div>
        <div className="stat-card">
          <h3>Lucro Total</h3>
          <p className="stat-value">+€2,340</p>
        </div>
      </div>

      <div className="content-section">
        <h2>Últimos Resultados</h2>
        <div className="results-table">
          <div className="table-header">
            <span>Data</span>
            <span>Jogo</span>
            <span>Aposta</span>
            <span>Odds</span>
            <span>Resultado</span>
          </div>
          <div className="table-row">
            <span>19/09/2025</span>
            <span>Man Utd vs Liverpool</span>
            <span>Over 2.5</span>
            <span>1.85</span>
            <span className="success">✅ Ganho</span>
          </div>
          <div className="table-row">
            <span>18/09/2025</span>
            <span>Barcelona vs Real</span>
            <span>Barcelona Win</span>
            <span>2.10</span>
            <span className="loss">❌ Perdido</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Historico
