# Alert@Postas V3

Sistema completo de alertas de apostas desportivas com inteligência artificial auto-aprendente.

## 🎯 Características Principais

- **Frontend**: Next.js + TypeScript + Tailwind CSS + Radix UI
- **Backend**: FastAPI + Python + SQLAlchemy
- **Base de Dados**: PostgreSQL (produção) / SQLite (desenvolvimento)
- **Cache**: Redis
- **ML Pipeline**: MLflow + DVC + SHAP para explicabilidade
- **Observabilidade**: Prometheus + Grafana + Loki
- **Autenticação**: OAuth2 + JWT + RBAC
- **Deploy**: Docker Compose + Kubernetes + GitHub Actions CI/CD

## 🧠 Módulos de Previsão

1. **Vencedor (1X2)** - Gradient Boosted Trees + Ensemble NN
2. **Próximo Golo** - Seq2Seq (LSTM/Transformer)
3. **Over/Under Dinâmico** - Poisson Regression + Random Forest
4. **Múltiplas** - Estratégia customizada com Monte Carlo
5. **Value Betting** - Filtro final para sustentabilidade financeira

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/Manuc98/Alert-Posta.git
cd Alert-Posta

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# Subir serviços
docker-compose up -d

# Acessar aplicações
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Grafana: http://localhost:3001
```

### Produção

```bash
# Deploy automático via GitHub Actions
git push origin master

# Ou deploy manual
./scripts/deploy.sh
```

## 📊 Dashboard

- **Bot Control**: Start/Stop/Restart módulos
- **Games Management**: Lista jogos, toggles, bulk actions
- **Signals**: Histórico, export CSV/Excel
- **Models**: Ativar, rollback, retrain on-demand
- **Logs**: Real-time com filtros
- **KPIs**: Sinais hoje, accuracy 7d, ROI estimado
- **Telegram**: Mensagens customizáveis

## 🔧 API Endpoints

- `POST /api/v1/bot/restart` - Reiniciar bot
- `GET /api/v1/games` - Listar jogos
- `PATCH /api/v1/games/{id}` - Toggle análise
- `GET /api/v1/signals` - Listar sinais
- `POST /api/v1/models/activate` - Ativar modelo
- `POST /api/v1/models/retrain` - Retrain modelo
- `GET /api/v1/explain/{signal_id}` - Explicabilidade SHAP
- `GET /api/v1/metrics/kpis` - KPIs básicos

## 🔐 Segurança

- JWT + Refresh tokens
- RBAC (superadmin, admin, operator, client)
- Rate limiting
- Audit logs
- GDPR compliance
- Secrets via Vault/GitHub Secrets

## 📈 Observabilidade

- **Prometheus**: Métricas de performance
- **Grafana**: Dashboards e alertas
- **Loki**: Logs centralizados
- **Sentry**: Error tracking

## 🧪 Testes

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📝 Regras Operacionais

- ✅ Commits pequenos com Conventional Commits
- ✅ Branches: feat/, fix/ com PR obrigatório
- ✅ .gitignore sempre atualizado
- ✅ Backup antes de apagar dados
- ✅ Audit logs para eventos críticos
- ✅ Rotação de secrets se expostos

## 🤖 Integrações

- **API Football**: Dados de jogos e estatísticas
- **Telegram Bot**: Envio de alertas
- **MLflow**: Versionamento de modelos
- **Redis**: Cache e pub/sub

## 📋 TODO

- [ ] Integrar bot Telegram com mensagens customizáveis
- [ ] Configurar Prometheus, Grafana e sistema de logs
- [ ] Implementar testes E2E completos
- [ ] Configurar alertas de drift de modelos
- [ ] Implementar backup automático de dados

## 📄 Licença

Este projeto é propriedade privada. Todos os direitos reservados.

---

**Alert@Postas** - Sistema de Apostas Desportivas com IA