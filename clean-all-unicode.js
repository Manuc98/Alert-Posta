const fs = require('fs');

console.log('🔧 LIMPANDO TODOS OS CARACTERES PROBLEMÁTICOS...');

try {
    let content = fs.readFileSync('src/index-site.js', 'utf8');
    const originalLength = content.length;
    let replacements = 0;
    
    // Mapeamento de caracteres acentuados para ASCII
    const accentMap = {
        // Caracteres acentuados
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
    
    // Substituir caracteres acentuados
    for (const [char, replacement] of Object.entries(accentMap)) {
        const regex = new RegExp(char, 'g');
        const matches = content.match(regex);
        if (matches) {
            replacements += matches.length;
            content = content.replace(regex, replacement);
        }
    }
    
    // Remover TODOS os emojis e símbolos Unicode problemáticos
    const unicodePatterns = [
        // Emojis gerais
        /[\u{1F300}-\u{1F9FF}]/gu,
        // Símbolos diversos
        /[\u{2600}-\u{26FF}]/gu,
        // Dingbats
        /[\u{2700}-\u{27BF}]/gu,
        // Transporte e mapas
        /[\u{1F680}-\u{1F6FF}]/gu,
        // Símbolos suplementares
        /[\u{1F900}-\u{1F9FF}]/gu,
        // Símbolos e pictogramas estendidos
        /[\u{1FA70}-\u{1FAFF}]/gu,
        // Setas
        /[\u{2190}-\u{21FF}]/gu,
        // Símbolos diversos e setas
        /[\u{2B00}-\u{2BFF}]/gu,
        // Formas geométricas
        /[\u{25A0}-\u{25FF}]/gu,
        // Caracteres de controle problemáticos
        /[\u{200B}-\u{200D}]/gu,   // Zero-width spaces
        /[\u{2028}-\u{2029}]/gu,   // Line/Paragraph separators
        /[\u{FEFF}]/gu,            // BOM
        /[\u{00A0}]/gu,            // Non-breaking space
        // Outros símbolos problemáticos
        /[\u{2026}]/gu,            // Horizontal ellipsis
        /[\u{2013}-\u{2014}]/gu,   // En/Em dash
        /[\u{2018}-\u{2019}]/gu,   // Smart quotes
        /[\u{201C}-\u{201D}]/gu,   // Smart double quotes
        /[\u{8734}]/gu,            // Infinity symbol
        /[\u{8226}]/gu,            // Bullet
        /[\u{9200}]/gu,            // Clock symbols
        /[\u{9203}]/gu,
        /[\u{9209}]/gu,
        /[\u{9209}\u{FE0F}]/gu,    // Stop button emoji
        /[\u{9881}\u{FE0F}]/gu,    // Gear emoji
        /[\u{8505}\u{FE0F}]/gu,    // Info emoji
        /[\u{9989}]/gu,            // Check mark
        /[\u{10060}]/gu,           // Cross mark
        /[\u{10005}]/gu,           // Heavy X
        /[\u{9992}\u{FE0F}]/gu,    // Airplane emoji
        /[\u{9876}\u{FE0F}]/gu,    // Crossed swords emoji
        /[\u{9917}]/gu,            // Soccer ball
        /[\u{8592}]/gu,            // Left arrow
        /[\u{8594}]/gu,            // Right arrow
    ];
    
    // Remover todos os padrões Unicode problemáticos
    for (const pattern of unicodePatterns) {
        const matches = content.match(pattern);
        if (matches) {
            replacements += matches.length;
            content = content.replace(pattern, '');
        }
    }
    
    // Escrever arquivo limpo
    fs.writeFileSync('src/index-site.js', content, 'utf8');
    
    console.log(`✅ LIMPEZA COMPLETA CONCLUÍDA:`);
    console.log(`   - Tamanho original: ${originalLength} caracteres`);
    console.log(`   - Tamanho final: ${content.length} caracteres`);
    console.log(`   - Caracteres removidos/substituídos: ${replacements}`);
    console.log(`   - Arquivo salvo: src/index-site.js`);
    
} catch (error) {
    console.error('❌ Erro ao limpar arquivo:', error.message);
}
