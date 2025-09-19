import './Subscricao.css'

const Subscricao = () => {
  return (
    <div className="subscricao">
      <div className="page-header">
        <h1>Subscrição</h1>
        <p>Gerir a sua subscrição e planos</p>
      </div>

      <div className="current-plan">
        <h2>Plano Atual</h2>
        <div className="plan-card premium">
          <h3>Premium</h3>
          <p>€29.99/mês</p>
          <span className="status active">Ativo</span>
        </div>
      </div>

      <div className="available-plans">
        <h2>Planos Disponíveis</h2>
        <div className="plans-grid">
          <div className="plan-card">
            <h3>Básico</h3>
            <p className="price">€9.99/mês</p>
            <ul>
              <li>Sinais limitados</li>
              <li>Suporte básico</li>
            </ul>
            <button className="plan-btn">Escolher</button>
          </div>
          <div className="plan-card featured">
            <h3>Premium</h3>
            <p className="price">€29.99/mês</p>
            <ul>
              <li>Sinais ilimitados</li>
              <li>Suporte prioritário</li>
              <li>Análises avançadas</li>
            </ul>
            <button className="plan-btn primary">Atual</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscricao
