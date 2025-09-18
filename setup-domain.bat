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
echo    - Clique em "alertapostas"
echo    - Settings ^→ Triggers ^→ Add Custom Domain
echo    - Digite: alertapostas.pt
echo.
echo 7. Configure DNS:
echo    Tipo: CNAME
echo    Nome: @
echo    Destino: alertapostas.ecarvalho140.workers.dev
echo    Proxy: Ativado (nuvem laranja)
echo.

echo ✅ Worker atualizado para aceitar alertapostas.pt
echo 🌐 URLs disponíveis:
echo    - https://alertapostas.pt
echo    - https://www.alertapostas.pt
echo    - https://alertapostas.ecarvalho140.workers.dev
echo.

echo 🧪 Testando worker atual...
Invoke-WebRequest -Uri "https://alertapostas.ecarvalho140.workers.dev/health" -UseBasicParsing

echo.
echo 📄 Documentação completa em: setup-domain.md
echo.
pause
