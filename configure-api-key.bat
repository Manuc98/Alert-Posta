@echo off
REM Script para configurar API Football Key real

echo 🔑 Configurando API Football Key...

echo.
echo 📋 INSTRUÇÕES:
echo.
echo 1. Substitua "YOUR_API_FOOTBALL_KEY" pela sua chave real
echo 2. No arquivo wrangler.working.toml
echo 3. Linha 10: API_FOOTBALL_KEY = "sua_chave_aqui"
echo.

set /p api_key="Digite sua API Football Key: "

if "%api_key%"=="" (
    echo ❌ API Key não fornecida!
    pause
    exit /b 1
)

echo.
echo ✅ Configurando API Key: %api_key%

REM Substituir no arquivo de configuração
powershell -Command "(Get-Content wrangler.working.toml) -replace 'API_FOOTBALL_KEY = \".*\"', 'API_FOOTBALL_KEY = \"%api_key%\"' | Set-Content wrangler.working.toml"

echo.
echo 🚀 Fazendo deploy com API Key configurada...
wrangler deploy --config wrangler.working.toml

echo.
echo ✅ Deploy concluído!
echo 🌐 Testando API...
Invoke-WebRequest -Uri "https://alertapostas.ecarvalho140.workers.dev/api/v1/games" -UseBasicParsing

echo.
echo 🎯 Agora está a usar dados reais da API Football!
echo.
pause
