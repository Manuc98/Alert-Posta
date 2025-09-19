import { useState } from 'react'
import './BotControl.css'

const BotControl = () => {
  const [botStatus, setBotStatus] = useState('stopped')
  const [modules, setModules] = useState({
    overUnder: true,
    winner: true,
    valueBet: false,
    nextGoal: true,
    multiple: false
  })

  const toggleBot = () => {
    setBotStatus(botStatus === 'stopped' ? 'running' : 'stopped')
  }

  const toggleModule = (moduleName) => {
    setModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }))
  }

  return (
    <div className="bot-control">
      <div className="page-header">
        <h1>🤖 Controlo do Bot</h1>
        <p>Gerir o estado e módulos do sistema de apostas - Página Principal</p>
      </div>

      <div className="bot-status">
        <div className="status-card">
          <div className="status-info">
            <h3>Status do Bot</h3>
            <div className={`status-indicator ${botStatus}`}>
              {botStatus === 'running' ? '🟢 Ativo' : '🔴 Parado'}
            </div>
          </div>
          <button 
            className={`control-btn ${botStatus}`}
            onClick={toggleBot}
          >
            {botStatus === 'running' ? 'Parar Bot' : 'Iniciar Bot'}
          </button>
        </div>
      </div>

      <div className="modules-section">
        <h2>Módulos Ativos</h2>
        <div className="modules-grid">
          <div className="module-card">
            <div className="module-header">
              <h3>Over/Under</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={modules.overUnder}
                  onChange={() => toggleModule('overUnder')}
                />
                <span className="slider"></span>
              </label>
            </div>
            <p>Análise de apostas Over/Under</p>
          </div>

          <div className="module-card">
            <div className="module-header">
              <h3>Winner</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={modules.winner}
                  onChange={() => toggleModule('winner')}
                />
                <span className="slider"></span>
              </label>
            </div>
            <p>Análise de apostas no vencedor</p>
          </div>

          <div className="module-card">
            <div className="module-header">
              <h3>Value Bet</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={modules.valueBet}
                  onChange={() => toggleModule('valueBet')}
                />
                <span className="slider"></span>
              </label>
            </div>
            <p>Identificação de apostas com valor</p>
          </div>

          <div className="module-card">
            <div className="module-header">
              <h3>Next Goal</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={modules.nextGoal}
                  onChange={() => toggleModule('nextGoal')}
                />
                <span className="slider"></span>
              </label>
            </div>
            <p>Análise do próximo golo</p>
          </div>

          <div className="module-card">
            <div className="module-header">
              <h3>Multiple Bets</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={modules.multiple}
                  onChange={() => toggleModule('multiple')}
                />
                <span className="slider"></span>
              </label>
            </div>
            <p>Apostas múltiplas</p>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <h2>Ações</h2>
        <div className="actions-grid">
          <button className="action-btn primary">Analisar Jogos</button>
          <button className="action-btn secondary">Atualizar Dados</button>
          <button className="action-btn secondary">Testar Conexões</button>
        </div>
      </div>
    </div>
  )
}

export default BotControl
