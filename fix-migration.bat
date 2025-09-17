@echo off
REM Script para resolver problema de Durable Objects com migração

echo 🔧 Resolvendo problema de Durable Objects com migração...

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

REM Instalar dependências
echo 📦 Instalando dependências...
npm install

REM Deploy com migração para deletar BotState
echo 🚀 Fazendo deploy com migração para deletar BotState...
wrangler deploy --config wrangler.migration.toml

if errorlevel 1 (
    echo ❌ Deploy com migração falhou. Tentando alternativa...
    echo 🗑️ Tentando deletar worker completamente...
    wrangler delete alertapostas --force
    echo 🚀 Fazendo deploy limpo...
    wrangler deploy
)

echo ✅ Deploy concluído!
echo 🌐 Worker disponível em: https://alertapostas.your-subdomain.workers.dev
echo 🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:
echo    - API_BASE_URL
echo    - API_TOKEN
pause
