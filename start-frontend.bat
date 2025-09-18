@echo off
REM Script para iniciar o frontend do Alert@Postas

echo 🚀 Iniciando frontend do Alert@Postas...

cd frontend

echo 📦 Instalando dependências...
npm install --force

echo 🌐 Iniciando servidor de desenvolvimento...
npm run dev

pause
