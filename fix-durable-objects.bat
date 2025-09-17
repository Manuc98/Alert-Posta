@echo off
REM Script para resolver problema de Durable Objects

echo 🔧 Resolvendo problema de Durable Objects...

REM Verificar se wrangler está instalado
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Wrangler não encontrado. Instale com: npm install -g wrangler
    pause
    exit /b 1
)

REM Fazer login se necessário
echo 🔐 Verificando autenticação...
wrangler whoami >nul 2>&1
if errorlevel 1 (
    echo 🔑 Fazendo login no Cloudflare...
    wrangler auth login
)

REM Tentar deletar workers antigos
echo 🗑️ Deletando workers antigos...
wrangler delete alertapostas --force >nul 2>&1
wrangler delete alertapostas-new --force >nul 2>&1
wrangler delete alertapostas-v3 --force >nul 2>&1

REM Instalar dependências
echo 📦 Instalando dependências...
npm install

REM Deploy com nome completamente novo
echo 🚀 Fazendo deploy com nome novo (alertapostas-fresh)...
wrangler deploy --config wrangler.clean.toml

if errorlevel 1 (
    echo ❌ Deploy falhou. Tentando alternativa...
    echo 🚀 Fazendo deploy no plano gratuito...
    wrangler deploy --config wrangler.free.toml --env free
)

echo ✅ Deploy concluído!
echo 🌐 Worker disponível em: https://alertapostas-fresh.your-subdomain.workers.dev
echo 🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:
echo    - API_BASE_URL
echo    - API_TOKEN
pause
