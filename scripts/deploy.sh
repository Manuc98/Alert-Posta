#!/bin/bash

# Script de Deploy Alert@Postas V3
# Uso: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-development}
PROJECT_NAME="alertpostas-v3"

echo "🚀 Iniciando deploy do Alert@Postas V3..."
echo "📋 Ambiente: $ENVIRONMENT"

# Função para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
check_dependencies() {
    log "🔍 Verificando dependências..."
    
    if ! command_exists docker; then
        log "❌ Docker não encontrado. Instale o Docker primeiro."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        log "❌ Docker Compose não encontrado. Instale o Docker Compose primeiro."
        exit 1
    fi
    
    log "✅ Dependências verificadas"
}

# Backup dos dados (se necessário)
backup_data() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "💾 Criando backup dos dados..."
        
        # Criar diretório de backup se não existir
        mkdir -p backups/$(date +%Y%m%d_%H%M%S)
        
        # Backup PostgreSQL
        docker-compose exec -T postgres pg_dump -U postgres alertpostas > backups/$(date +%Y%m%d_%H%M%S)/postgres_backup.sql
        
        # Backup Redis
        docker-compose exec -T redis redis-cli --rdb /data/dump.rdb
        docker cp $(docker-compose ps -q redis):/data/dump.rdb backups/$(date +%Y%m%d_%H%M%S)/
        
        log "✅ Backup criado em backups/$(date +%Y%m%d_%H%M%S)/"
    fi
}

# Parar serviços
stop_services() {
    log "⏹️ Parando serviços existentes..."
    docker-compose down
    log "✅ Serviços parados"
}

# Build das imagens
build_images() {
    log "🔨 Construindo imagens Docker..."
    
    # Build com cache se possível
    docker-compose build --parallel
    
    log "✅ Imagens construídas"
}

# Iniciar serviços
start_services() {
    log "🚀 Iniciando serviços..."
    
    # Iniciar infraestrutura primeiro
    docker-compose up -d postgres redis mlflow
    
    # Aguardar infraestrutura estar pronta
    log "⏳ Aguardando infraestrutura..."
    sleep 30
    
    # Iniciar aplicação
    docker-compose up -d backend frontend
    
    # Aguardar aplicação estar pronta
    log "⏳ Aguardando aplicação..."
    sleep 20
    
    # Iniciar monitoring
    docker-compose up -d prometheus grafana nginx
    
    log "✅ Serviços iniciados"
}

# Verificar saúde dos serviços
health_check() {
    log "🏥 Verificando saúde dos serviços..."
    
    # Verificar backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "✅ Backend saudável"
    else
        log "❌ Backend não responde"
        return 1
    fi
    
    # Verificar frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log "✅ Frontend saudável"
    else
        log "❌ Frontend não responde"
        return 1
    fi
    
    # Verificar Grafana
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log "✅ Grafana saudável"
    else
        log "❌ Grafana não responde"
        return 1
    fi
    
    log "✅ Todos os serviços estão saudáveis"
}

# Mostrar status
show_status() {
    log "📊 Status dos serviços:"
    docker-compose ps
    
    echo ""
    echo "🌐 URLs de acesso:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  Grafana:     http://localhost:3001"
    echo "  Prometheus:  http://localhost:9090"
    echo "  MLflow:      http://localhost:5000"
    echo ""
    echo "📝 Logs em tempo real: docker-compose logs -f"
    echo "🛑 Parar serviços: docker-compose down"
}

# Cleanup de recursos antigos
cleanup() {
    log "🧹 Limpando recursos antigos..."
    
    # Remover containers parados
    docker container prune -f
    
    # Remover imagens não utilizadas (apenas se não for development)
    if [ "$ENVIRONMENT" != "development" ]; then
        docker image prune -f
    fi
    
    log "✅ Limpeza concluída"
}

# Função principal
main() {
    log "🎯 Alert@Postas V3 - Deploy Script"
    log "=================================="
    
    check_dependencies
    backup_data
    stop_services
    build_images
    start_services
    
    # Aguardar um pouco para estabilizar
    sleep 10
    
    if health_check; then
        show_status
        log "🎉 Deploy concluído com sucesso!"
    else
        log "❌ Deploy falhou - verificar logs"
        docker-compose logs
        exit 1
    fi
    
    # Cleanup apenas em produção
    if [ "$ENVIRONMENT" = "production" ]; then
        cleanup
    fi
}

# Executar função principal
main "$@"
