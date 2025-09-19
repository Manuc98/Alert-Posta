// Teste robusto dos endpoints principais
// Este arquivo será usado para validar os endpoints durante o diagnóstico

const testEndpoints = async () => {
  const baseUrl = 'http://localhost:8787'; // Cloudflare Workers local
  
  console.log('🧪 Iniciando testes robustos dos endpoints...');
  
  try {
    // Teste 1: GET /api/games?date=2025-09-19
    console.log('\n📡 Testando GET /api/games?date=2025-09-19');
    const gamesResponse = await fetch(`${baseUrl}/api/games?date=2025-09-19`);
    console.log(`Status: ${gamesResponse.status} ${gamesResponse.statusText}`);
    console.log(`Headers:`, Object.fromEntries(gamesResponse.headers.entries()));
    
    // Verificar header de erro da API-Football
    const apiError = gamesResponse.headers.get('X-API-FOOTBALL-ERROR');
    if (apiError) {
      console.log(`⚠️ API-Football Error: ${apiError}`);
    }
    
    const gamesData = await gamesResponse.json();
    console.log(`Jogos encontrados: ${gamesData.length}`);
    console.log(`Tipo de resposta: ${Array.isArray(gamesData) ? 'Array' : typeof gamesData}`);
    
    // Teste 2: POST /api/start-bot
    console.log('\n🤖 Testando POST /api/start-bot');
    const startResponse = await fetch(`${baseUrl}/api/start-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${startResponse.status} ${startResponse.statusText}`);
    
    const startData = await startResponse.json();
    console.log(`Resposta:`, startData);
    
    // Validar estrutura da resposta
    if (startData.success && startData.status === 'running') {
      console.log('✅ Estrutura da resposta start-bot está correta');
    } else {
      console.log('❌ Estrutura da resposta start-bot está incorreta');
    }
    
    // Teste 3: POST /api/stop-bot
    console.log('\n🛑 Testando POST /api/stop-bot');
    const stopResponse = await fetch(`${baseUrl}/api/stop-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${stopResponse.status} ${stopResponse.statusText}`);
    
    const stopData = await stopResponse.json();
    console.log(`Resposta:`, stopData);
    
    // Validar estrutura da resposta
    if (stopData.success && stopData.status === 'stopped') {
      console.log('✅ Estrutura da resposta stop-bot está correta');
    } else {
      console.log('❌ Estrutura da resposta stop-bot está incorreta');
    }
    
    // Teste 4: POST /api/analyze-games
    console.log('\n🔍 Testando POST /api/analyze-games');
    const analyzeResponse = await fetch(`${baseUrl}/api/analyze-games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${analyzeResponse.status} ${analyzeResponse.statusText}`);
    
    const analyzeData = await analyzeResponse.json();
    console.log(`Resposta:`, analyzeData);
    
    // Validar estrutura da resposta
    if (analyzeData.success && analyzeData.status === 'completed') {
      console.log('✅ Estrutura da resposta analyze-games está correta');
    } else {
      console.log('❌ Estrutura da resposta analyze-games está incorreta');
    }
    
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
