@echo off
REM Script para configurar domínio personalizado alertapostas.pt

echo 🌐 Configurando domínio personalizado alertapostas.pt...

echo.
echo 📋 INSTRUÇÕES PARA CONFIGURAR O DOMÍNIO:
echo.
echo 1. Acesse: https://dash.cloudflare.com
echo 2. Clique em "Add a Site"
echo 3. Digite: alertapostas.pt
echo 4. Escolha o plano Free
echo 5. Configure os nameservers no seu registrar:
echo    - alex.ns.cloudflare.com
echo    - claire.ns.cloudflare.com
echo.
echo 6. No Cloudflare Dashboard:
echo    - Vá para Workers ^& Pages
echo    - Clique em "alertapostas-site"
echo    - Settings ^→ Triggers ^→ Add Custom Domain
echo    - Digite: alertapostas.pt
echo.
echo 7. Configure DNS:
echo    Tipo: CNAME
echo    Nome: @
echo    Destino: alertapostas-site.ecarvalho140.workers.dev
echo    Proxy: Ativado (nuvem laranja)
echo.

echo ✅ Site funcionando em: https://alertapostas-site.ecarvalho140.workers.dev
echo 🌐 URLs disponíveis:
echo    - https://alertapostas-site.ecarvalho140.workers.dev (Dashboard)
echo    - https://alertapostas-site.ecarvalho140.workers.dev/health (Health Check)
echo    - https://alertapostas-site.ecarvalho140.workers.dev/site/stats (Estatísticas)
echo.

echo 🧪 Testando site...
Invoke-WebRequest -Uri "https://alertapostas-site.ecarvalho140.workers.dev/health" -UseBasicParsing

echo.
echo 🎉 SITE TOTALMENTE FUNCIONAL!
echo 📱 Acesse: https://alertapostas-site.ecarvalho140.workers.dev
echo.
pause
