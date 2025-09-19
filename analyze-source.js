const fs = require('fs');

console.log('🔍 ANÁLISE COMPLETA DO ARQUIVO FONTE...');

try {
    const content = fs.readFileSync('src/index-site.js', 'utf8');
    const lines = content.split('\n');
    
    console.log(`📊 INFORMAÇÕES GERAIS:`);
    console.log(`   - Total de linhas: ${lines.length}`);
    console.log(`   - Total de caracteres: ${content.length}`);
    console.log(`   - Tamanho em bytes: ${Buffer.byteLength(content, 'utf8')}`);
    
    // Verificar caracteres problemáticos
    const problematicChars = [];
    const charMap = new Map();
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const charCode = char.charCodeAt(0);
        
        // Verificar caracteres não-ASCII
        if (charCode > 127) {
            problematicChars.push({
                position: i,
                char: char,
                charCode: charCode,
                line: content.substring(0, i).split('\n').length,
                hex: '0x' + charCode.toString(16).toUpperCase()
            });
            
            if (!charMap.has(char)) {
                charMap.set(char, 0);
            }
            charMap.set(char, charMap.get(char) + 1);
        }
    }
    
    console.log(`\n🚨 CARACTERES PROBLEMÁTICOS ENCONTRADOS: ${problematicChars.length}`);
    
    if (problematicChars.length > 0) {
        console.log(`\n📋 RESUMO DE CARACTERES PROBLEMÁTICOS:`);
        for (const [char, count] of charMap.entries()) {
            const charCode = char.charCodeAt(0);
            console.log(`   - '${char}' (${charCode}, ${'0x' + charCode.toString(16).toUpperCase()}): ${count} ocorrências`);
        }
        
        console.log(`\n📍 PRIMEIRAS 10 OCORRÊNCIAS:`);
        problematicChars.slice(0, 10).forEach((item, index) => {
            console.log(`   ${index + 1}. Linha ${item.line}, posição ${item.position}: '${item.char}' (${item.hex})`);
        });
        
        if (problematicChars.length > 10) {
            console.log(`   ... e mais ${problematicChars.length - 10} ocorrências`);
        }
    } else {
        console.log(`✅ NENHUM CARACTERE PROBLEMÁTICO ENCONTRADO!`);
    }
    
    // Verificar linhas específicas que podem estar causando problemas
    console.log(`\n🔍 VERIFICAÇÃO DE LINHAS SUSPEITAS:`);
    const suspiciousLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Verificar padrões suspeitos
        if (line.includes('Uncaught') || line.includes('SyntaxError') || 
            line.includes('Invalid or unexpected token')) {
            suspiciousLines.push({ lineNum, content: line.trim() });
        }
        
        // Verificar caracteres de controle
        if (line.includes('\r') || line.includes('\t') || line.includes('\v') || line.includes('\f')) {
            suspiciousLines.push({ 
                lineNum, 
                content: line.trim().substring(0, 100) + (line.length > 100 ? '...' : ''),
                reason: 'Contém caracteres de controle'
            });
        }
    }
    
    if (suspiciousLines.length > 0) {
        console.log(`   Encontradas ${suspiciousLines.length} linhas suspeitas:`);
        suspiciousLines.forEach(item => {
            console.log(`   Linha ${item.lineNum}: ${item.content}${item.reason ? ` (${item.reason})` : ''}`);
        });
    } else {
        console.log(`   ✅ Nenhuma linha suspeita encontrada`);
    }
    
} catch (error) {
    console.error('❌ Erro ao analisar arquivo:', error.message);
}
