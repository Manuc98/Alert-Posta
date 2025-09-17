# Alert@Postas V3

Sistema completo de previsões desportivas com IA, dashboard web e integração Telegram.

## Stack Tecnológica

### Frontend
- **Next.js 14** + TypeScript
- **Tailwind CSS** + Radix UI
- **Dark/Light mode** obrigatório
- Tema aesthetic clean (cinza, branco, preto suave)
- Gradientes: azul→roxo, verde→turquesa

### Backend
- **FastAPI** (Python) + Uvicorn
- **PostgreSQL** (produção) + SQLite (dev)
- **Redis** (cache + pub/sub)
- **MLflow** + DVC para ML pipeline
- **SHAP** para explicabilidade

### Observabilidade
- **Prometheus** + Grafana
- **Loki/ELK** para logs
- **Sentry** para erros

### Deploy
- **Docker Compose** (dev)
- **GitHub Actions** CI/CD
- **Wrangler** para deploy

## 5 Módulos de Previsão

1. **Vencedor (1X2)** - Gradient Boosted Trees + ensemble NN
2. **Próximo Golo** - Seq2Seq (LSTM/Transformer)
3. **Over/Under Dinâmico** - Poisson regressão bayesiana + Random Forest
4. **Múltiplas** - Combina previsões com Monte Carlo
5. **Value Betting** - Filtro final com EV positivo

## Estrutura do Projeto

```
├── frontend/          # Next.js dashboard
├── backend/           # FastAPI + ML modules
├── docker-compose.yml # Desenvolvimento
├── .github/workflows/ # CI/CD
└── docs/             # Documentação
```

## Quick Start

```bash
# Clone e setup
git clone https://github.com/Manuc98/Alert-Posta.git
cd Alert-Posta

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Deploy
npx wrangler deploy
```

## Integrações

- **API Football**: 623ead667fb69f339d1e8f9a366de721
- **Telegram Bot**: 8031960776:AAFmB-UhPTfj3YauD6PPkjQW2VTsngJ3AIU
- **Grupo ID**: -1002937302746

## Regras Operacionais

- ✅ Sempre responder em Português
- ✅ Modificar ficheiros existentes em vez de criar novos
- ✅ Logs: YYYY-MM-DD HH:MM:SS [LEVEL] (betbot) | [module]
- ❌ NUNCA ficheiros de teste ou mock data
- ❌ NUNCA simplificações - só produto final
- ❌ NUNCA deixar ficheiros antigos para trás

## Status

🚧 **Em Desenvolvimento** - MVP completo em progresso
