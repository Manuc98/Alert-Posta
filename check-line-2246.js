const fs = require('fs');

console.log('Verificando linha 2246 especificamente...');

try {
    const content = fs.readFileSync('src/index-site.js', 'utf8');
    const lines = content.split('\n');
    
    if (lines[2245]) {
        console.log(`Linha 2246: ${JSON.stringify(lines[2245])}`);
        console.log(`Tamanho da linha: ${lines[2245].length} caracteres`);
        
        console.log('\nCaracteres individuais na linha 2246:');
        for (let i = 0; i < lines[2245].length; i++) {
            const char = lines[2245][i];
            const code = char.charCodeAt(0);
            console.log(`  ${i}: '${char}' (${code})`);
        }
        
        // Verificar se há caracteres problemáticos
        const problematic = [];
        for (let i = 0; i < lines[2245].length; i++) {
            const char = lines[2245][i];
            const code = char.charCodeAt(0);
            if (code > 127 || code < 32) {
                problematic.push({ pos: i, char, code });
            }
        }
        
        if (problematic.length > 0) {
            console.log('\nCaracteres problemáticos encontrados:');
            problematic.forEach(p => console.log(`  Posição ${p.pos}: '${p.char}' (${p.code})`));
        } else {
            console.log('\nNenhum caractere problemático encontrado na linha 2246');
        }
    } else {
        console.log('Linha 2246 não existe');
    }
    
} catch (error) {
    console.error('Erro:', error.message);
}
