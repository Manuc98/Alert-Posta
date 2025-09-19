# Alert@Postas - Cloudflare Worker

Este é o Cloudflare Worker que atua como proxy e cache para a API principal do Alert@Postas.

## 🚀 Funcionalidades

- **Proxy inteligente** para a API FastAPI principal
- **Cache automático** de respostas GET com TTL configurável
- **CORS configurado** para acesso web
- **Health check** endpoint
- **Cron jobs** para trigger de workers automáticos
- **Serving de assets** estáticos (opcional)

## 📁 Estrutura

```
├── src/
│   └── index.js          # Código principal do Worker
├── wrangler.toml         # Configuração do Cloudflare Worker
├── package.json          # Dependências e scripts
└── CLOUDFLARE_README.md  # Esta documentação
```

## ⚙️ Configuração

### 1. Configurar wrangler.toml

Edite o arquivo `wrangler.toml` e configure:

```toml
name = "alertapostas"
main = "src/index.js"
compatibility_date = "2025-09-17"

[env.production.vars]
ENVIRONMENT = "production"
API_BASE_URL = "https://sua-api-backend.com"
```

### 2. Configurar Variáveis de Ambiente

No Cloudflare Dashboard, adicione as seguintes variáveis:

- `API_BASE_URL`: URL da sua API FastAPI backend
- `API_TOKEN`: Token de autenticação para a API
- `CACHE_TTL`: Tempo de cache em segundos (padrão: 300)

### 3. Configurar R2 Storage (Opcional)

Para servir assets estáticos:

1. Crie um R2 bucket no Cloudflare
2. Configure o binding no `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "alertapostas-storage"
```

## 🛠️ Deploy

### Deploy Automático (GitHub Integration)

O deploy é automático quando conectado ao repositório Git:

1. Push para a branch `master`
2. Cloudflare automaticamente faz build e deploy
3. Worker fica disponível em `https://alertapostas.yourdomain.com`

### Deploy Manual

```bash
# Instalar dependências
npm install

# Deploy para produção
npm run deploy:production

# Ou deploy direto
npx wrangler deploy
```

## 📡 Endpoints

### Health Check
```
GET /health
```
Retorna status do worker e informações básicas.

### API Proxy
```
GET|POST|PUT|DELETE /api/v1/*
```
Proxy automático para a API principal com cache inteligente.

### Assets Estáticos
```
GET /static/*
```
Serve assets do R2 bucket (se configurado).

## 🔄 Cron Jobs

O worker inclui cron job configurado para trigger automático:

```toml
[[triggers]]
crons = ["*/5 * * * *"]  # A cada 5 minutos
```

Isso chama automaticamente:
```
POST /api/v1/workers/run/football_api
```

## 🏃‍♂️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo dev
npm run dev

# O worker estará disponível em http://localhost:8787
```

## 📊 Monitoramento

### Logs
- Acesse o Cloudflare Dashboard
- Vá para Workers & Pages > alertapostas
- Aba "Logs" para ver logs em tempo real

### Analytics
- Métricas automáticas no Cloudflare Dashboard
- Request count, error rate, response time

## 🔧 Configurações Avançadas

### Cache Personalizado
```javascript
const CACHE_TTL = 600; // 10 minutos
```

### CORS Customizado
```javascript
const ALLOWED_ORIGINS = [
  'https://alertapostas.com',
  'https://app.alertapostas.com'
];
```

### Rate Limiting
```toml
[limits]
cpu_ms = 50000  # 50 segundos de CPU por request
```

## 🚨 Troubleshooting

### Erro "Missing entry-point"
- Verifique se o arquivo `wrangler.toml` está configurado
- Confirme que `main = "src/index.js"` aponta para o arquivo correto

### Erro de CORS
- Verifique se `ALLOWED_ORIGINS` está configurado
- Confirme que o domínio está na lista

### Cache não funcionando
- Verifique se o método é GET
- Confirme que `CACHE_TTL` está configurado
- Verifique logs para cache hits/misses

## 📞 Suporte

Para suporte técnico:
- GitHub Issues: [Alert-Posta Issues](https://github.com/Manuc98/Alert-Posta/issues)
- Email: suporte@alertapostas.com

---

**Alert@Postas Cloudflare Worker v1.0.0**
