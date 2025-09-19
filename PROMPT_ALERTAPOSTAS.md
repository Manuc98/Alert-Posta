# PROMPT COMPLETO - Alert@Postas V3

## CONTEXTO DO PROJETO

**Nome do Bot:** Alert@Postas  
**Domínio Principal:** alertapostas.pt  
**Ambiente:** Produção (Cloudflare Workers)

## REGRAS FUNDAMENTAIS

### 1. COMUNICAÇÃO
- **SEMPRE responder em Português**
- **NUNCA remover funcionalidades já implementadas**
- **MODIFICAR arquivos existentes** em vez de criar novos
- **NUNCA deixar arquivos antigos** para trás
- **SEMPRE implementar no Git e no site** alertapostas.pt

### 2. SISTEMA DE LOGS
- **Formato obrigatório:** `YYYY-MM-DD HH:MM:SS [LEVEL] (betbot) | [module]`
- **Exemplo:** `2025-09-18 21:38:28 [INFO] (betbot) | api | Buscando jogos futuros`

### 3. DADOS E TESTES
- **NUNCA usar dados falsos/mock/exemplo**
- **SEMPRE usar dados reais** da API Football
- **NENHUM arquivo de teste** - apenas funcionalidades reais
- **NENHUMA simplificação** - implementação completa

## STACK TECNOLÓGICO

### Frontend
- Next.js (React) + TypeScript
- Tailwind CSS + Radix UI
- Modo escuro/claro

### Backend
- FastAPI (Python) + Uvicorn + type hints
- PostgreSQL (produção), SQLite (dev/test)
- Redis (cache + pub/sub)
- RabbitMQ (opcional)

### ML Pipeline
- MLflow + DVC
- S3/Minio para artifacts
- SHAP para explainability

### Observabilidade
- Prometheus + Grafana (métricas)
- Loki/ELK (logs)
- Sentry (erros)

### Auth & Security
- OAuth2 + JWT + Refresh tokens
- RBAC (superadmin, admin, operator, client)
- Rate limiting, CORS, audit logs

### Deploy
- Docker Compose (dev)
- Kubernetes (prod opcional)
- GitHub Actions CI/CD
- Cloudflare Workers (site principal)

## CONFIGURAÇÕES ATUAIS

### API Keys (REAIS)
```
API_FOOTBALL_KEY = "623ead667fb69f339d1e8f9a366de721"
TELEGRAM_TOKEN = "8031960776:AAFmB-UhPTfjYauD6PPkjQW2VTsngJ3AIU"
TELEGRAM_GROUP_ID = "-1002937302746"
```

### Workers Cloudflare
- **alertapostas-site** → alertapostas.pt (SEMPRE usar este)
- **alertapostas-no-auth** → alertapostas-no-auth.ecarvalho140.workers.dev
- **alertapostas** → alertapostas.ecarvalho140.workers.dev

### Configurações de Produção
```
SIGNAL_THRESHOLD = "85"
DAILY_REPORT_TIME = "23:59"
MAX_SIGNALS_PER_DAY = "50"
```

## FUNCIONALIDADES IMPLEMENTADAS

### Dashboard Principal
- **Controlo do Bot:** Iniciar/Parar/Analisar
- **Jogos ao Vivo:** Lista em tempo real
- **Calendário Horizontal:** Seleção de dias
- **Jogos Futuros:** Com filtros e seleção múltipla
- **Painel do Comentador:** Logs em tempo real
- **Sinais Enviados:** Histórico com status
- **Busca de Jogos:** Por equipas/ligas
- **Seleção Múltipla:** Checkboxes para jogos

### Sistema de Autenticação
- **REMOVIDO** do alertapostas.pt (conforme solicitado)
- **Mantido** nas outras versões

### API Endpoints
- `/api/v1/live-games` - Jogos ao vivo
- `/api/v1/future-games` - Jogos futuros
- `/api/v1/commentator` - Logs do sistema
- `/api/v1/bot/start` - Iniciar bot
- `/api/v1/bot/stop` - Parar bot
- `/api/v1/signals` - Sinais enviados
- `/api/v1/stats` - Estatísticas

### Integração Telegram
- Envio automático de sinais
- Atualização de status (Green/Red)
- Relatórios diários às 23:59

### ML Modules (5 + Value Betting)
1. **Winner (1X2)** - Gradient Boosted Trees + ensemble NN
2. **Next Goal (1X2)** - Seq2Seq (LSTM/Transformer)
3. **Dynamic Over/Under** - Poisson regression + Random Forest
4. **Multiples** - Combina previsões, Monte Carlo para risco
5. **Value Betting** - Filtro final, só sinais com EV positivo

## PRIORIDADES DE LIGAS

### 1ª Prioridade (Principais)
- Champions League, Portugal, Inglaterra, França, Alemanha, Espanha, Itália
- Europa League, Conference League, Competições de Seleções

### 2ª Prioridade
- Brasil, Argentina, Colômbia, Holanda

## REGRAS OPERACIONAIS

### Commits
- Commits pequenos e convencionais (feat:, fix:, chore:)
- Branches: feat/, fix/
- PRs obrigatórios
- .gitignore sempre atualizado

### Backup & Segurança
- Backup de dados/logs antes de eliminar
- Rotação de secrets se expostos
- Logs de auditoria para eventos críticos

### Sistema de Usuários (RBAC)
- **Super Admin:** Acesso total (EU)
- **Developer:** Acesso elevado mas controlado
- **Client:** Acesso normal ao dashboard

## PROBLEMAS CONHECIDOS E SOLUÇÕES

### Cron Jobs
- **Erro:** "Handler does not export a scheduled() function"
- **Solução:** Remover seção `[triggers]` do wrangler.toml se não necessário

### API Football
- **Erro:** "The From/To/Status field need another parameter"
- **Solução:** Usar apenas `date` parameter, não `from/to`

### Template Literals
- **Erro:** "Invalid regular expression: missing /"
- **Solução:** Converter template literals em HTML para concatenação de strings

## COMANDOS POWERSHELL

### Deploy Principal
```powershell
wrangler deploy --config wrangler.site.toml
```

### Deploy Sem Auth
```powershell
wrangler deploy --config wrangler.no-auth.toml
```

### Deploy Working
```powershell
wrangler deploy --config wrangler.working.toml
```

## ARQUIVOS PRINCIPAIS

### Configuração
- `wrangler.site.toml` - Configuração do site principal
- `wrangler.no-auth.toml` - Configuração sem autenticação
- `wrangler.working.toml` - Configuração de trabalho

### Código
- `src/index-site.js` - Worker principal (alertapostas.pt)
- `src/index-no-auth.js` - Worker sem autenticação
- `src/index-working.js` - Worker com todas as funcionalidades

## ESTADO ATUAL

### Funcionando
- ✅ Dashboard completo no alertapostas.pt
- ✅ Jogos ao vivo (1 jogo encontrado)
- ✅ Sistema de logs em tempo real
- ✅ Botões de controlo funcionais
- ✅ Calendário horizontal
- ✅ Busca e seleção de jogos

### Problemas Identificados
- ❌ Jogos futuros: API retorna 0 resultados (erro nos parâmetros)
- ❌ Cron jobs: Erro de scheduled() function
- ❌ Sinais: Não estão a ser enviados para Telegram

### Próximos Passos
1. Corrigir API Football para jogos futuros
2. Implementar envio de sinais para Telegram
3. Adicionar relatórios diários automáticos
4. Sistema de usuários e permissões

## COMANDOS ÚTEIS

### Verificar Logs
```powershell
wrangler tail --config wrangler.site.toml
```

### Testar Localmente
```powershell
wrangler dev --config wrangler.site.toml
```

### Verificar Status
```powershell
wrangler whoami
```

---

**IMPORTANTE:** Este é um sistema de produção real. Todas as implementações devem ser funcionais e usar dados reais. O domínio principal é alertapostas.pt e deve funcionar SEM autenticação conforme solicitado pelo utilizador.
