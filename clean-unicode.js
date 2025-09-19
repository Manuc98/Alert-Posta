const fs = require('fs');

console.log('Limpando caracteres Unicode problemáticos...');

try {
    let content = fs.readFileSync('src/index-site.js', 'utf8');
    const originalLength = content.length;
    
    // Lista de caracteres problemáticos para remover
    const problematicChars = [
        // Emojis e símbolos Unicode
        /[\u{1F300}-\u{1F9FF}]/gu, // Emojis gerais
        /[\u{2600}-\u{26FF}]/gu,   // Símbolos diversos
        /[\u{2700}-\u{27BF}]/gu,   // Dingbats
        /[\u{1F680}-\u{1F6FF}]/gu, // Transporte e mapas
        /[\u{1F1E0}-\u{1F1FF}]/gu, // Bandeiras
        /[\u{1F900}-\u{1F9FF}]/gu, // Símbolos suplementares
        /[\u{1FA70}-\u{1FAFF}]/gu, // Símbolos e pictogramas estendidos
        /[\u{2190}-\u{21FF}]/gu,   // Setas
        /[\u{2B00}-\u{2BFF}]/gu,   // Símbolos diversos e setas
        /[\u{25A0}-\u{25FF}]/gu,   // Formas geométricas
        /[\u{00A0}]/gu,            // Non-breaking space
        /[\u{200B}-\u{200D}]/gu,   // Zero-width spaces
        /[\u{2028}-\u{2029}]/gu,   // Line/Paragraph separators
        /[\u{FEFF}]/gu,            // BOM
        // Caracteres de controle
        /[\u{0000}-\u{001F}]/gu,   // Controle ASCII
        /[\u{007F}-\u{009F}]/gu,   // Controle estendido
    ];
    
    let replacements = 0;
    
    // Remover caracteres problemáticos
    for (const pattern of problematicChars) {
        const matches = content.match(pattern);
        if (matches) {
            replacements += matches.length;
            content = content.replace(pattern, '');
        }
    }
    
    // Substituir caracteres acentuados por equivalentes ASCII
    const accentMap = {
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n',
        'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C', 'Ñ': 'N',
        'º': 'o', 'ª': 'a', '€': 'EUR'
    };
    
    for (const [char, replacement] of Object.entries(accentMap)) {
        const regex = new RegExp(char, 'g');
        const matches = content.match(regex);
        if (matches) {
            replacements += matches.length;
            content = content.replace(regex, replacement);
        }
    }
    
    // Escrever arquivo limpo
    fs.writeFileSync('src/index-site.js', content, 'utf8');
    
    console.log(`✅ Limpeza concluída:`);
    console.log(`   - Tamanho original: ${originalLength} caracteres`);
    console.log(`   - Tamanho final: ${content.length} caracteres`);
    console.log(`   - Caracteres removidos/substituídos: ${replacements}`);
    console.log(`   - Arquivo salvo: src/index-site.js`);
    
} catch (error) {
    console.error('❌ Erro ao limpar arquivo:', error.message);
}
