// Script para diagnosticar problema de carregamento de jogos
// Execute este script para identificar o problema

const debugGames = async () => {
  const baseUrl = 'https://alertapostas.pt'; // URL do site em produção
  
  console.log('🔍 Iniciando diagnóstico do problema de carregamento de jogos...');
  
  try {
    // Teste 1: Debug endpoint
    console.log('\n📡 Testando endpoint de debug...');
    const debugResponse = await fetch(`${baseUrl}/api/debug-games?date=2025-09-19`);
    console.log(`Status: ${debugResponse.status} ${debugResponse.statusText}`);
    
    const debugData = await debugResponse.json();
    console.log('Debug Info:', JSON.stringify(debugData, null, 2));
    
    // Teste 2: Endpoint normal de jogos
    console.log('\n🎮 Testando endpoint normal de jogos...');
    const gamesResponse = await fetch(`${baseUrl}/api/games?date=2025-09-19`);
    console.log(`Status: ${gamesResponse.status} ${gamesResponse.statusText}`);
    
    const gamesData = await gamesResponse.json();
    console.log(`Jogos encontrados: ${gamesData.length}`);
    
    // Teste 3: Verificar headers de erro
    const apiError = gamesResponse.headers.get('X-API-FOOTBALL-ERROR');
    if (apiError) {
      console.log(`⚠️ API-Football Error: ${apiError}`);
    }
    
    // Teste 4: Testar com data diferente
    console.log('\n📅 Testando com data de ontem...');
    const yesterdayResponse = await fetch(`${baseUrl}/api/games?date=2025-09-18`);
    console.log(`Status: ${yesterdayResponse.status} ${yesterdayResponse.statusText}`);
    
    const yesterdayData = await yesterdayResponse.json();
    console.log(`Jogos de ontem: ${yesterdayData.length}`);
    
    // Resumo do diagnóstico
    console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
    console.log(`- Debug endpoint: ${debugResponse.ok ? '✅ OK' : '❌ ERRO'}`);
    console.log(`- Endpoint jogos hoje: ${gamesResponse.ok ? '✅ OK' : '❌ ERRO'}`);
    console.log(`- Endpoint jogos ontem: ${yesterdayResponse.ok ? '✅ OK' : '❌ ERRO'}`);
    console.log(`- Jogos hoje: ${Array.isArray(gamesData) ? gamesData.length : 'ERRO'}`);
    console.log(`- Jogos ontem: ${Array.isArray(yesterdayData) ? yesterdayData.length : 'ERRO'}`);
    
    if (apiError) {
      console.log(`\n🚨 PROBLEMA IDENTIFICADO: ${apiError}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
  }
};

// Executar diagnóstico
debugGames();
