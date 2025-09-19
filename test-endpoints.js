// Teste simples dos endpoints principais
// Este arquivo será usado para validar os endpoints durante o diagnóstico

const testEndpoints = async () => {
  const baseUrl = 'http://localhost:8787'; // Cloudflare Workers local
  
  console.log('🧪 Iniciando testes dos endpoints...');
  
  try {
    // Teste 1: GET /api/games?date=2025-09-19
    console.log('\n📡 Testando GET /api/games?date=2025-09-19');
    const gamesResponse = await fetch(`${baseUrl}/api/games?date=2025-09-19`);
    console.log(`Status: ${gamesResponse.status} ${gamesResponse.statusText}`);
    console.log(`Headers:`, Object.fromEntries(gamesResponse.headers.entries()));
    
    const gamesData = await gamesResponse.json();
    console.log(`Jogos encontrados: ${gamesData.length}`);
    
    // Teste 2: POST /api/start-bot
    console.log('\n🤖 Testando POST /api/start-bot');
    const startResponse = await fetch(`${baseUrl}/api/start-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${startResponse.status} ${startResponse.statusText}`);
    
    const startData = await startResponse.json();
    console.log(`Resposta:`, startData);
    
    // Teste 3: POST /api/stop-bot
    console.log('\n🛑 Testando POST /api/stop-bot');
    const stopResponse = await fetch(`${baseUrl}/api/stop-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${stopResponse.status} ${stopResponse.statusText}`);
    
    const stopData = await stopResponse.json();
    console.log(`Resposta:`, stopData);
    
    console.log('\n✅ Testes concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
};

// Executar testes se chamado diretamente
if (typeof window === 'undefined') {
  testEndpoints();
}

module.exports = { testEndpoints };
