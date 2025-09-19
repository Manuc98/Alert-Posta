const fs = require('fs');

try {
    console.log('Analisando src/index-site.js...');
    const content = fs.readFileSync('src/index-site.js', 'utf8');
    const lines = content.split('\n');
    
    console.log(`Tamanho do arquivo: ${content.length} caracteres`);
    console.log(`Número de linhas: ${lines.length}`);
    
    // Verificar linha 2246
    if (lines[2245]) {
        console.log(`\nLinha 2246: ${JSON.stringify(lines[2245])}`);
        console.log(`Caracteres na linha 2246:`);
        for (let i = 0; i < lines[2245].length; i++) {
            const char = lines[2245][i];
            const code = char.charCodeAt(0);
            if (code > 127 || code < 32) {
                console.log(`  Posição ${i}: '${char}' (${code})`);
            }
        }
    }
    
    // Procurar caracteres problemáticos em todo o arquivo
    console.log('\nCaracteres especiais encontrados:');
    let foundSpecial = false;
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const code = char.charCodeAt(0);
        
        // Caracteres problemáticos: BOM, zero-width, aspas especiais, etc.
        if (code === 0xFEFF || // BOM
            code === 0x200B || // Zero-width space
            code === 0x200C || // Zero-width non-joiner
            code === 0x200D || // Zero-width joiner
            code === 0x2028 || // Line separator
            code === 0x2029 || // Paragraph separator
            code === 0x2018 || // Left single quotation mark
            code === 0x2019 || // Right single quotation mark
            code === 0x201C || // Left double quotation mark
            code === 0x201D || // Right double quotation mark
            code === 0x2013 || // En dash
            code === 0x2014 || // Em dash
            code === 0x2026 || // Horizontal ellipsis
            (code > 127 && code !== 0x00A0)) { // Non-ASCII except non-breaking space
            const lineNum = content.substring(0, i).split('\n').length;
            console.log(`  Posição ${i} (linha ${lineNum}): '${char}' (${code})`);
            foundSpecial = true;
        }
    }
    
    if (!foundSpecial) {
        console.log('  Nenhum caractere especial problemático encontrado');
    }
    
    // Tentar executar o arquivo
    console.log('\nTentando executar o arquivo...');
    try {
        require('./src/index-site.js');
        console.log('✅ Arquivo executado sem erros de sintaxe');
    } catch (error) {
        console.log('❌ Erro ao executar:', error.message);
        console.log('Stack trace:', error.stack);
    }
    
} catch (error) {
    console.error('Erro ao analisar arquivo:', error.message);
}
