#!/bin/bash

# Script para forçar deploy completo do Alert@Postas Worker

echo "🚀 Forçando deploy completo do Alert@Postas Worker..."

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

# Tentar deletar worker completamente
echo "🗑️ Deletando worker completamente..."
wrangler delete alertapostas --force 2>/dev/null

# Aguardar um pouco para garantir que a deleção foi processada
echo "⏳ Aguardando processamento da deleção..."
sleep 5

# Deploy com configuração limpa
echo "🚀 Fazendo deploy limpo..."
wrangler deploy

if [ $? -ne 0 ]; then
    echo "❌ Deploy falhou. Tentando com migração..."
    wrangler deploy --config wrangler.migration.toml
fi

if [ $? -ne 0 ]; then
    echo "❌ Deploy com migração falhou. Tentando versão simples..."
    wrangler deploy --config wrangler.simple.toml
fi

if [ $? -ne 0 ]; then
    echo "❌ Deploy simples falhou. Tentando plano gratuito..."
    wrangler deploy --config wrangler.free.toml --env free
fi

echo "✅ Deploy concluído!"
echo "🌐 Worker disponível em: https://alertapostas.your-subdomain.workers.dev"
echo "🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:"
echo "   - API_BASE_URL"
echo "   - API_TOKEN"
