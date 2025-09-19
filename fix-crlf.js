const fs = require('fs');

console.log('Removendo caracteres \\r (CR) do arquivo...');

try {
    let content = fs.readFileSync('src/index-site.js', 'utf8');
    const originalLength = content.length;
    
    // Remover caracteres \r (carriage return)
    const crCount = (content.match(/\r/g) || []).length;
    content = content.replace(/\r/g, '');
    
    // Escrever arquivo corrigido
    fs.writeFileSync('src/index-site.js', content, 'utf8');
    
    console.log(`✅ Correção concluída:`);
    console.log(`   - Caracteres \\r removidos: ${crCount}`);
    console.log(`   - Tamanho original: ${originalLength} caracteres`);
    console.log(`   - Tamanho final: ${content.length} caracteres`);
    
} catch (error) {
    console.error('❌ Erro ao corrigir arquivo:', error.message);
}
