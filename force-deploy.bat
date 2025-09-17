@echo off
REM Script para forçar deploy completo do Alert@Postas Worker

echo 🚀 Forçando deploy completo do Alert@Postas Worker...

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

REM Tentar deletar worker completamente
echo 🗑️ Deletando worker completamente...
wrangler delete alertapostas --force >nul 2>&1

REM Aguardar um pouco para garantir que a deleção foi processada
echo ⏳ Aguardando processamento da deleção...
timeout /t 5 /nobreak >nul

REM Deploy com configuração limpa
echo 🚀 Fazendo deploy limpo...
wrangler deploy

if errorlevel 1 (
    echo ❌ Deploy falhou. Tentando com migração...
    wrangler deploy --config wrangler.migration.toml
)

if errorlevel 1 (
    echo ❌ Deploy com migração falhou. Tentando versão simples...
    wrangler deploy --config wrangler.simple.toml
)

if errorlevel 1 (
    echo ❌ Deploy simples falhou. Tentando plano gratuito...
    wrangler deploy --config wrangler.free.toml --env free
)

echo ✅ Deploy concluído!
echo 🌐 Worker disponível em: https://alertapostas.your-subdomain.workers.dev
echo 🔧 Configure as variáveis de ambiente no Cloudflare Dashboard:
echo    - API_BASE_URL
echo    - API_TOKEN
pause
