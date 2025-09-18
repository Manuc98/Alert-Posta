#!/bin/bash

# Script de configuração automática do Alert@Postas V3

echo "🚀 Configurando Alert@Postas V3 automaticamente..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Verificar se Wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "📦 Instalando Wrangler..."
    npm install -g wrangler
fi

# Fazer login no Cloudflare se necessário
echo "🔐 Verificando autenticação Cloudflare..."
wrangler whoami || {
    echo "🔑 Fazendo login no Cloudflare..."
    wrangler auth login
}

# Configurar variáveis de ambiente no Cloudflare Worker
echo "🔧 Configurando variáveis de ambiente..."
echo "Configurando API_BASE_URL..."
wrangler secret put API_BASE_URL --name alertapostas
echo "Configurando API_TOKEN..."
wrangler secret put API_TOKEN --name alertapostas

# Deploy do Cloudflare Worker
echo "🚀 Fazendo deploy do Cloudflare Worker..."
wrangler deploy --config wrangler.simple.toml

# Iniciar serviços Docker
echo "🐳 Iniciando serviços Docker..."
docker-compose up -d postgres redis mlflow

# Aguardar serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 30

# Iniciar backend
echo "🖥️ Iniciando backend..."
docker-compose up -d backend

# Aguardar backend ficar pronto
echo "⏳ Aguardando backend ficar pronto..."
sleep 20

# Testar endpoints
echo "🧪 Testando endpoints..."
echo "Testando health check..."
curl -s https://alertapostas.ecarvalho140.workers.dev/health
echo "Testando site/games..."
curl -s https://alertapostas.ecarvalho140.workers.dev/site/games

echo "✅ Configuração concluída!"
echo "🌐 Cloudflare Worker: https://alertapostas.ecarvalho140.workers.dev"
echo "🖥️ Backend: http://localhost:8000"
echo "📊 Grafana: http://localhost:3000 (admin/admin)"
echo "🔍 MLflow: http://localhost:5000"
echo "📈 Prometheus: http://localhost:9090"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no backend"
echo "2. Acesse o dashboard em http://localhost:3000"
echo "3. Configure o domínio personalizado se necessário"
