# Alert@Postas - Cloudflare Worker

## 🚀 Deploy para Cloudflare Workers

### 📋 Pré-requisitos

1. **Conta Cloudflare** (gratuita)
2. **Wrangler CLI** instalado
3. **Autenticação** configurada

### ⚙️ Configuração

#### 1. Instalar Wrangler
```bash
npm install -g wrangler
```

#### 2. Autenticar no Cloudflare
```bash
wrangler auth login
```

#### 3. Configurar Variáveis de Ambiente

No Cloudflare Dashboard ou via CLI:

```bash
# Configurar variáveis
wrangler secret put API_BASE_URL
wrangler secret put API_TOKEN
```

### 🆓 Deploy no Plano Gratuito

```bash
# Instalar dependências
npm install

# Deploy no plano gratuito
npm run deploy:free
```

**Configuração do plano gratuito:**
- ✅ Cron jobs a cada 10 minutos (workers)
- ✅ Cron jobs a cada 2 minutos (atualização site)
- ✅ Sem CPU limits (compatível com plano gratuito)
- ✅ 100.000 requests/dia grátis

### 💰 Deploy no Plano Pago

```bash
# Deploy no plano pago
npm run deploy:production
```

**Configuração do plano pago:**
- ✅ Cron jobs a cada 5 minutos (workers)
- ✅ Cron jobs a cada 1 minuto (atualização site)
- ✅ CPU limits configurados
- ✅ Requests ilimitados

### 🔧 Configuração Manual

#### Variáveis de Ambiente Necessárias:

```bash
# No Cloudflare Dashboard > Workers > Settings > Variables
API_BASE_URL = https://sua-api-backend.com
API_TOKEN = seu-token-de-autenticacao
ENVIRONMENT = production
```

#### Domínio Personalizado (Opcional):

```bash
# Adicionar domínio customizado
wrangler route add "alertapostas.com/*" alertapostas
```

### 📊 Endpoints Disponíveis

Após deploy, o worker estará disponível em:

```
https://alertapostas.your-subdomain.workers.dev
```

**Endpoints:**
- `GET /health` - Health check
- `GET /site/games` - Jogos ativos
- `GET /site/signals` - Sinais recentes
- `GET /site/stats` - Estatísticas
- `POST /site/update` - Atualização manual
- `POST /api/*` - Proxy para API principal

### 🔄 Cron Jobs Automáticos

O worker executa automaticamente:

1. **Busca dados** da API Football (a cada 10min no plano gratuito)
2. **Atualiza dados** do site (a cada 2min no plano gratuito)
3. **Cache inteligente** para performance máxima

### 🐛 Troubleshooting

#### Erro de Durable Objects:
```
New version of script does not export class 'BotState' which is depended on by existing Durable Objects
```
**Solução:** 
1. Execute `npm run deploy:clean` (usa novo nome)
2. Ou delete worker antigo: `wrangler delete alertapostas --force`
3. Use `deploy-clean.bat` (Windows) ou `deploy-clean.sh` (Linux/Mac)

#### Erro de CPU Limits:
```
CPU limits are not supported for the Free plan
```
**Solução:** Use `wrangler.free.toml` e `npm run deploy:free`

#### Erro de Autenticação:
```
Authentication required
```
**Solução:** Execute `wrangler auth login`

#### Erro de Variáveis:
```
API_BASE_URL not found
```
**Solução:** Configure as variáveis no Cloudflare Dashboard

### 📈 Monitoramento

Acesse o dashboard do Cloudflare para:
- 📊 **Analytics** de requests
- 🔍 **Logs** em tempo real
- ⚡ **Performance** metrics
- 🚨 **Alertas** de erro

### 🔄 Atualizações Automáticas

O worker se atualiza automaticamente via:
- **GitHub Actions** (deploy automático)
- **Webhooks** do backend
- **Cron jobs** internos

---

## ✅ Status do Deploy

- [ ] Wrangler instalado
- [ ] Autenticação configurada
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy executado
- [ ] Domínio configurado (opcional)
- [ ] Testes de endpoints realizados

**Worker URL:** `https://alertapostas.your-subdomain.workers.dev`
