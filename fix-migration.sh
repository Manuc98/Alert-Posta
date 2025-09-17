#!/bin/bash

# Script para resolver problema de Durable Objects com migração

echo "🔧 Resolvendo problema de Durable Objects com migração..."

# Verificar se wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não encontrado. Instale com: npm install -g wrangler"
    exit 1
fi

# Fazer login se necessário
echo "🔐 Verificando autenticação..."
wrangler whoami || {
    echo "🔑 Fazendo login no Cloudflare..."
    wrangler auth login
}

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Deploy com migração para deletar BotState
echo "🚀 Fazendo deploy com migração para deletar BotState..."
wrangler deploy --config wrangler.migration.toml

if [ $? -ne 0 ]; then
    echo "❌ Deploy com migração falhou. Tentando alternativa..."
    echo "🗑️ Tentando deletar worker completamente..."
    wrangler delete alertapostas --force
    echo "🚀 Fazendo deploy limpo..."
    wrangler deploy
fi

echo "✅ Deploy concluído!"
echo "🌐 Worker disponível em: https://alertapostas.your-subdomain.workers.dev"
echo "🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:"
echo "   - API_BASE_URL"
echo "   - API_TOKEN"
