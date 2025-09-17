#!/bin/bash

# Script para resolver problema de Durable Objects

echo "🔧 Resolvendo problema de Durable Objects..."

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

# Tentar deletar workers antigos
echo "🗑️ Deletando workers antigos..."
wrangler delete alertapostas --force 2>/dev/null
wrangler delete alertapostas-new --force 2>/dev/null
wrangler delete alertapostas-v3 --force 2>/dev/null

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Deploy com nome completamente novo
echo "🚀 Fazendo deploy com nome novo (alertapostas-fresh)..."
wrangler deploy --config wrangler.clean.toml

if [ $? -ne 0 ]; then
    echo "❌ Deploy falhou. Tentando alternativa..."
    echo "🚀 Fazendo deploy no plano gratuito..."
    wrangler deploy --config wrangler.free.toml --env free
fi

echo "✅ Deploy concluído!"
echo "🌐 Worker disponível em: https://alertapostas-fresh.your-subdomain.workers.dev"
echo "🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:"
echo "   - API_BASE_URL"
echo "   - API_TOKEN"
