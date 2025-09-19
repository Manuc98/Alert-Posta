#!/bin/bash
# Script para deploy em modo development (sem minificação)

echo "🚀 Deploy em modo DEVELOPMENT (sem minificação)..."
echo "📦 Arquivo: src/index-site.js"
echo "🌍 Worker: alertapostas-site"
echo ""

# Deploy sem minificação
npx wrangler deploy --no-minify

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Site: https://alertapostas.pt"
echo "🔧 Worker: https://alertapostas-site.ecarvalho140.workers.dev"
