FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

    # Instalar dependências
    RUN npm install --omit=dev

# Copiar código da aplicação
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Comando para executar a aplicação
CMD ["npm", "start"]
