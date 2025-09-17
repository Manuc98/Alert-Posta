@echo off
REM Script para deploy limpo do Alert@Postas Worker (Windows)

echo 🧹 Deploy limpo do Alert@Postas Worker...

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

REM Deletar worker antigo se existir
echo 🗑️ Tentando deletar worker antigo...
wrangler delete alertapostas --force >nul 2>&1
if errorlevel 1 (
    echo ℹ️ Worker antigo não encontrado ou já deletado
)

REM Instalar dependências
echo 📦 Instalando dependências...
npm install

REM Deploy com configuração limpa
echo 🚀 Fazendo deploy com configuração limpa...
wrangler deploy --config wrangler.clean.toml

echo ✅ Deploy concluído!
echo 🌐 Worker disponível em: https://alertapostas-v3.your-subdomain.workers.dev
echo 🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:
echo    - API_BASE_URL
echo    - API_TOKEN
pause
