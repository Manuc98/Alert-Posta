@echo off
echo 🚀 Configurando Alert@Postas V3...

echo 📦 Verificando Docker...
docker --version

echo 🔧 Iniciando serviços...
docker-compose up -d postgres redis

echo ⏳ Aguardando serviços...
timeout /t 10 /nobreak

echo 🖥️ Iniciando backend...
docker-compose up -d backend

echo ✅ Configuração concluída!
echo 🌐 Worker: https://alertapostas.ecarvalho140.workers.dev
echo 🖥️ Backend: http://localhost:8000

pause
