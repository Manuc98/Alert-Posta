#!/bin/bash

# Script para deploy limpo do Alert@Postas Worker
echo "🧹 Deploy limpo do Alert@Postas Worker..."

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

# Deletar worker antigo se existir
echo "🗑️ Tentando deletar worker antigo..."
wrangler delete alertapostas --force 2>/dev/null || echo "ℹ️ Worker antigo não encontrado ou já deletado"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Deploy com configuração limpa
echo "🚀 Fazendo deploy com configuração limpa..."
wrangler deploy --config wrangler.clean.toml

echo "✅ Deploy concluído!"
echo "🌐 Worker disponível em: https://alertapostas-v3.your-subdomain.workers.dev"
echo "🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:"
echo "   - API_BASE_URL"
echo "   - API_TOKEN"
