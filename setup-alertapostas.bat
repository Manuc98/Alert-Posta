@echo off
REM Script de configuração automática do Alert@Postas V3

echo 🚀 Configurando Alert@Postas V3 automaticamente...

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado. Instale o Docker Desktop primeiro.
    pause
    exit /b 1
)

REM Verificar se Wrangler está instalado
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Instalando Wrangler...
    npm install -g wrangler
)

REM Fazer login no Cloudflare se necessário
echo 🔐 Verificando autenticação Cloudflare...
wrangler whoami >nul 2>&1
if errorlevel 1 (
    echo 🔑 Fazendo login no Cloudflare...
    wrangler auth login
)

REM Configurar variáveis de ambiente no Cloudflare Worker
echo 🔧 Configurando variáveis de ambiente...
echo Configurando API_BASE_URL...
wrangler secret put API_BASE_URL --name alertapostas
echo Configurando API_TOKEN...
wrangler secret put API_TOKEN --name alertapostas

REM Deploy do Cloudflare Worker
echo 🚀 Fazendo deploy do Cloudflare Worker...
wrangler deploy --config wrangler.simple.toml

REM Iniciar serviços Docker
echo 🐳 Iniciando serviços Docker...
docker-compose up -d postgres redis mlflow

REM Aguardar serviços ficarem prontos
echo ⏳ Aguardando serviços ficarem prontos...
timeout /t 30 /nobreak >nul

REM Iniciar backend
echo 🖥️ Iniciando backend...
docker-compose up -d backend

REM Aguardar backend ficar pronto
echo ⏳ Aguardando backend ficar pronto...
timeout /t 20 /nobreak >nul

REM Testar endpoints
echo 🧪 Testando endpoints...
echo Testando health check...
Invoke-WebRequest -Uri "https://alertapostas.ecarvalho140.workers.dev/health" -UseBasicParsing
echo Testando site/games...
Invoke-WebRequest -Uri "https://alertapostas.ecarvalho140.workers.dev/site/games" -UseBasicParsing

echo ✅ Configuração concluída!
echo 🌐 Cloudflare Worker: https://alertapostas.ecarvalho140.workers.dev
echo 🖥️ Backend: http://localhost:8000
echo 📊 Grafana: http://localhost:3000 (admin/admin)
echo 🔍 MLflow: http://localhost:5000
echo 📈 Prometheus: http://localhost:9090
echo.
echo 📋 Próximos passos:
echo 1. Configure as variáveis de ambiente no backend
echo 2. Acesse o dashboard em http://localhost:3000
echo 3. Configure o domínio personalizado se necessário
echo.
pause
