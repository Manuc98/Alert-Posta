const fs = require('fs');

console.log('Limpando caracteres específicos problemáticos...');

try {
    let content = fs.readFileSync('src/index-site.js', 'utf8');
    const originalLength = content.length;
    
    // Remover apenas caracteres que causam problemas no browser
    const problematicChars = [
        /\u200B/g,  // Zero-width space
        /\u200C/g,  // Zero-width non-joiner  
        /\u200D/g,  // Zero-width joiner
        /\u2028/g,  // Line separator
        /\u2029/g,  // Paragraph separator
        /\uFEFF/g,  // BOM
    ];
    
    let replacements = 0;
    
    for (const pattern of problematicChars) {
        const matches = content.match(pattern);
        if (matches) {
            replacements += matches.length;
            content = content.replace(pattern, '');
        }
    }
    
    // Escrever arquivo limpo
    fs.writeFileSync('src/index-site.js', content, 'utf8');
    
    console.log(`✅ Limpeza seletiva concluída:`);
    console.log(`   - Tamanho original: ${originalLength} caracteres`);
    console.log(`   - Tamanho final: ${content.length} caracteres`);
    console.log(`   - Caracteres problemáticos removidos: ${replacements}`);
    console.log(`   - Arquivo salvo: src/index-site.js`);
    
} catch (error) {
    console.error('❌ Erro ao limpar arquivo:', error.message);
}
