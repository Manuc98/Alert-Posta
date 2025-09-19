#!/bin/bash

# Script de Atualização Alert@Postas V3
# Atualiza o repositório e faz commit das alterações

set -e

echo "🔄 Atualizando Alert@Postas V3..."

# Obter timestamp atual
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
COMMIT_HASH=$(git rev-parse --short HEAD)

# Função para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verificar se há alterações
check_changes() {
    if [ -n "$(git status --porcelain)" ]; then
        log "📝 Alterações encontradas"
        return 0
    else
        log "✅ Nenhuma alteração para commitar"
        return 1
    fi
}

# Fazer commit das alterações
commit_changes() {
    log "💾 Fazendo commit das alterações..."
    
    git add .
    
    # Determinar tipo de commit baseado nas alterações
    if git diff --cached --name-only | grep -q "\.py$"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="feat: atualização do backend e módulos ML"
    elif git diff --cached --name-only | grep -q "frontend/"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="feat: atualização do frontend e UI"
    elif git diff --cached --name-only | grep -q "docker\|\.yml\|\.yaml"; then
        COMMIT_TYPE="chore"
        COMMIT_MSG="chore: atualização de configurações e deploy"
    elif git diff --cached --name-only | grep -q "\.md\|README"; then
        COMMIT_TYPE="docs"
        COMMIT_MSG="docs: atualização da documentação"
    else
        COMMIT_TYPE="feat"
        COMMIT_MSG="feat: atualização geral do sistema"
    fi
    
    # Adicionar informações extras
    COMMIT_MSG="$COMMIT_MSG
    
    📅 Timestamp: $TIMESTAMP
    🔗 Commit: $COMMIT_HASH
    🤖 Atualização automática via script"
    
    git commit -m "$COMMIT_MSG"
    log "✅ Commit realizado: $COMMIT_TYPE"
}

# Push para repositório remoto
push_changes() {
    log "🚀 Enviando alterações para o repositório..."
    
    git push origin main
    log "✅ Alterações enviadas com sucesso"
}

# Mostrar resumo
show_summary() {
    echo ""
    echo "📊 Resumo da Atualização:"
    echo "========================="
    echo "⏰ Timestamp: $TIMESTAMP"
    echo "🔗 Commit Hash: $COMMIT_HASH"
    echo "📁 Alterações:"
    git diff --stat HEAD~1
    echo ""
    echo "🌐 Repositório: https://github.com/Manuc98/Alert-Posta.git"
    echo "📝 Último commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
}

# Função principal
main() {
    log "🎯 Alert@Postas V3 - Script de Atualização"
    log "=========================================="
    
    if check_changes; then
        commit_changes
        push_changes
        show_summary
        log "🎉 Atualização concluída com sucesso!"
    else
        log "ℹ️ Nenhuma atualização necessária"
    fi
}

# Executar função principal
main "$@"
