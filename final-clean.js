const fs = require('fs');

console.log('🔧 LIMPEZA FINAL DOS CARACTERES RESTANTES...');

try {
    let content = fs.readFileSync('src/index-site.js', 'utf8');
    const originalLength = content.length;
    let replacements = 0;
    
    // Remover caracteres específicos restantes
    const specificChars = [
        // Símbolos de relógio
        { pattern: /⏰/g, replacement: '[TEMPO]' },
        { pattern: /⏳/g, replacement: '[AGUARDANDO]' },
        { pattern: /⏹/g, replacement: '[PARAR]' },
        // Símbolos de informação
        { pattern: /ℹ/g, replacement: '[INFO]' },
        // Símbolos matemáticos
        { pattern: /∞/g, replacement: 'INFINITO' },
        { pattern: /•/g, replacement: '-' },
        // Símbolos de pontos
        { pattern: /••••••••••••••••/g, replacement: '****************' },
    ];
    
    for (const { pattern, replacement } of specificChars) {
        const matches = content.match(pattern);
        if (matches) {
            replacements += matches.length;
            content = content.replace(pattern, replacement);
        }
    }
    
    // Escrever arquivo limpo
    fs.writeFileSync('src/index-site.js', content, 'utf8');
    
    console.log(`✅ LIMPEZA FINAL CONCLUÍDA:`);
    console.log(`   - Tamanho original: ${originalLength} caracteres`);
    console.log(`   - Tamanho final: ${content.length} caracteres`);
    console.log(`   - Caracteres removidos/substituídos: ${replacements}`);
    console.log(`   - Arquivo salvo: src/index-site.js`);
    
} catch (error) {
    console.error('❌ Erro ao limpar arquivo:', error.message);
}
