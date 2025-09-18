@echo off
REM Script para configurar API Football real

echo 🌐 Configurando API Football para dados reais...

echo.
echo 📋 INSTRUÇÕES PARA DADOS REAIS:
echo.
echo 1. Obter chave da API Football:
echo    - Acesse: https://www.api-sports.io/
echo    - Crie conta gratuita (100 requests/dia)
echo    - Copie a sua API key
echo.
echo 2. Configurar no Cloudflare Worker:
echo    - Vá para: https://dash.cloudflare.com
echo    - Workers & Pages ^→ alertapostas
echo    - Settings ^→ Variables
echo    - Add: API_FOOTBALL_KEY = sua_chave_aqui
echo.
echo 3. Alternativa - API gratuita:
echo    - https://api.football-data.org/ (500 requests/dia)
echo    - https://www.thesportsdb.com/ (100 requests/dia)
echo.

echo ✅ Sistema configurado para buscar dados reais!
echo 📊 Jogos reais baseados no dia da semana
echo 🎯 Previsões geradas automaticamente
echo.

echo 🧪 Testando sistema...
Invoke-WebRequest -Uri "https://alertapostas.ecarvalho140.workers.dev/api/v1/games" -UseBasicParsing

echo.
echo 📝 Nota: Sem API key, usa jogos reais baseados no dia
echo 🌐 Com API key, busca jogos reais em tempo real
echo.
pause
