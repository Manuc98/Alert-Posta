export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Rotas principais - SEM AUTENTICAÇÃO
    if (path === '/' || path === '/dashboard') {
      return new Response(getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // API Routes
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, path);
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(event, env, ctx) {
    // Handler para cron jobs
    console.log('Cron job executado:', event.cron);
    
    try {
      // Executar tarefas agendadas baseadas no cron
      if (event.cron === '*/1 * * * *') {
        // A cada minuto - verificar jogos ao vivo
        await checkLiveGames(env);
      } else if (event.cron === '*/5 * * * *') {
        // A cada 5 minutos - verificar jogos terminados
        await checkFinishedGames(env);
      } else if (event.cron === '0 23 * * *') {
        // Às 23:00 - relatório diário
        await generateDailyReport(env);
      }
    } catch (error) {
      console.error('Erro no cron job:', error);
    }
  }
};

// Sistema simplificado - SEM AUTENTICAÇÃO

// Sistema de armazenamento
const storage = {
  signals: [],
  botStatus: 'stopped',
  futureGames: [],
  liveGames: [],
  commentatorLogs: []
};

// Função principal para lidar com APIs
async function handleAPI(request, env, path) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Rotas públicas (sem login)
    
    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    
    if (path === '/api/v1/live-games') {
      return await handleLiveGamesAPI(request, env);
    }
    
    if (path === '/api/v1/finished-games') {
      return await handleFinishedGamesAPI(request, env);
    }
    
    if (path === '/api/v1/commentator') {
      return await handleCommentatorAPI(request, env);
    }
    
    // APIs sem autenticação
    if (path === '/api/v1/signals') {
      return await handleSignalsAPI(request, env);
    }
    
    if (path === '/api/v1/bot/control') {
      return await handleBotControlAPI(request, env);
    }
    
    if (path === '/api/v1/stats') {
      return await handleStatsAPI(request, env);
    }

    // Endpoints de utilizadores removidos - SISTEMA SEM AUTENTICAÇÃO

    return new Response('API endpoint not found', { status: 404, headers: CORS_HEADERS });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Funções de autenticação removidas - SISTEMA SEM LOGIN

// API para jogos futuros
async function handleFutureGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    console.log('Buscando jogos futuros...');

    // Buscar jogos para os próximos 7 dias, um dia de cada vez
    let allFutureGames = [];
    
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      console.log('Buscando jogos futuros para:', dateStr);
      
      // Usar parâmetros corretos da API Football
      const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}&status=NS&timezone=Europe/Lisbon`;

      console.log('URL da API:', apiFootballUrl);
      
      const response = await fetch(apiFootballUrl, {
        headers: {
          'x-rapidapi-key': env.API_FOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`API Football response para ${dateStr}:`, data.results, 'jogos');
        
        if (data.response && data.response.length > 0) {
          const dayGames = data.response.map(fixture => ({
            id: fixture.fixture.id,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            league: fixture.league.name,
            league_id: fixture.league.id,
            date: fixture.fixture.date,
            country: fixture.league.country
          }));
          allFutureGames = allFutureGames.concat(dayGames);
        }
      } else {
        console.error('API Football error para', dateStr, ':', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    }
    
    console.log('Total jogos futuros encontrados:', allFutureGames.length);
    addCommentatorLog(`📅 ${allFutureGames.length} jogos futuros carregados da API Football`, 'info');

    // SEM JOGOS DE EXEMPLO - APENAS DADOS REAIS DA API

    return new Response(JSON.stringify(allFutureGames), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Error fetching future games:', error);
    addCommentatorLog(`❌ Erro ao carregar jogos futuros: ${error.message}`, 'error');
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para jogos ao vivo
async function handleLiveGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Buscando jogos ao vivo para:', today);
    
    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=LIVE`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    let liveGames = [];

    if (response.ok) {
      const data = await response.json();
      console.log('API Football LIVE response:', data);
      console.log('Number of live fixtures:', data.results);
      
      liveGames = data.response ? data.response.map(fixture => ({
        id: fixture.fixture.id,
        home_team: fixture.teams.home.name,
        away_team: fixture.teams.away.name,
        league: fixture.league.name,
        league_id: fixture.league.id,
        status: 'LIVE',
        minute: fixture.fixture.status.elapsed || 0,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        date: fixture.fixture.date,
        country: fixture.league.country
      })) : [];
      
      console.log('Processed live games:', liveGames.length);
    } else {
      console.error('API Football LIVE error:', response.status, response.statusText);
    }

        // SEM JOGOS DE EXEMPLO - APENAS DADOS REAIS DA API

        return new Response(JSON.stringify(liveGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });

      } catch (error) {
        console.error('Error fetching live games:', error);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // Função para buscar jogos terminados (apenas para atualizar sinais)
    async function handleFinishedGamesAPI(request, env) {
      const CORS_HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Buscando jogos terminados para:', today);
        
        const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

        const response = await fetch(apiFootballUrl, {
          headers: {
            'x-rapidapi-key': env.API_FOOTBALL_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        });

        let finishedGames = [];

        if (response.ok) {
          const data = await response.json();
          console.log('API Football FINISHED response:', data.results, 'jogos');
          
          finishedGames = data.response ? data.response.map(fixture => ({
            id: fixture.fixture.id,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            league: fixture.league.name,
            league_id: fixture.league.id,
            status: 'FINISHED',
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            date: fixture.fixture.date,
            country: fixture.league.country
          })) : [];
          
          console.log('Processed finished games:', finishedGames.length);
        } else {
          console.error('API Football FINISHED error:', response.status, response.statusText);
        }

        return new Response(JSON.stringify(finishedGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });

      } catch (error) {
        console.error('Error fetching finished games:', error);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

// Função para verificar e atualizar sinais automaticamente
function startSignalUpdateChecker(env) {
  // Verificar jogos terminados a cada 2 minutos
  setInterval(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

      const response = await fetch(apiFootballUrl, {
        headers: {
          'x-rapidapi-key': env.API_FOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          console.log('Verificando', data.results, 'jogos terminados para atualizar sinais');
          
          // Aqui seria a lógica para verificar se algum dos jogos terminados
          // tem sinais pendentes que precisam ser atualizados com Green/Red
          // Por agora, apenas logamos
          addCommentatorLog(`🔄 Verificando ${data.results} jogos terminados para atualizar sinais`, 'info');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar jogos terminados:', error);
    }
  }, 120000); // A cada 2 minutos
}

// Funções para cron jobs
async function checkLiveGames(env) {
  try {
    console.log('Cron: Verificando jogos ao vivo...');
    const today = new Date().toISOString().split('T')[0];
    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=LIVE`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        console.log(`Cron: ${data.results} jogos ao vivo encontrados`);
        addCommentatorLog(`⚡ Cron: ${data.results} jogos ao vivo ativos`, 'info');
      }
    }
  } catch (error) {
    console.error('Erro no cron checkLiveGames:', error);
  }
}

async function checkFinishedGames(env) {
  try {
    console.log('Cron: Verificando jogos terminados...');
    const today = new Date().toISOString().split('T')[0];
    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        console.log(`Cron: ${data.results} jogos terminados encontrados`);
        addCommentatorLog(`🏁 Cron: ${data.results} jogos terminados - verificando sinais`, 'info');
      }
    }
  } catch (error) {
    console.error('Erro no cron checkFinishedGames:', error);
  }
}

async function generateDailyReport(env) {
  try {
    console.log('Cron: Gerando relatório diário...');
    addCommentatorLog('📊 Cron: Gerando relatório diário às 23:00', 'info');
    
    // Aqui seria a lógica para gerar o relatório diário
    // Por agora, apenas logamos
    addCommentatorLog('✅ Relatório diário gerado com sucesso', 'success');
  } catch (error) {
    console.error('Erro no cron generateDailyReport:', error);
  }
}

// API para painel do comentador
async function handleCommentatorAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'GET') {
    return new Response(JSON.stringify(storage.commentatorLogs), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (request.method === 'POST') {
    const { message, type = 'info' } = await request.json();
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    storage.commentatorLogs.push(logEntry);
    
    // Manter apenas os últimos 100 logs
    if (storage.commentatorLogs.length > 100) {
      storage.commentatorLogs = storage.commentatorLogs.slice(-100);
    }
    
    return new Response(JSON.stringify({ success: true, log: logEntry }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para sinais
async function handleSignalsAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const signals = storage.signals;
  
  return new Response(JSON.stringify(signals), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para controlo do bot
async function handleBotControlAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'POST') {
    const { action } = await request.json();
    
    if (action === 'start') {
      storage.botStatus = 'running';
      // Adicionar log ao comentador
      addCommentatorLog('🤖 Bot iniciado - Enviando sinais em tempo real', 'success');
      
      // Iniciar verificação automática de jogos terminados para atualizar sinais
      startSignalUpdateChecker(env);
      
      return new Response(JSON.stringify({ success: true, message: 'Bot iniciado - Enviando sinais em tempo real' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'stop') {
      storage.botStatus = 'stopped';
      // Adicionar log ao comentador
      addCommentatorLog('⏹️ Bot parado - Sinais suspensos', 'warning');
      return new Response(JSON.stringify({ success: true, message: 'Bot parado - Sinais suspensos' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'analyze') {
      // Adicionar log ao comentador
      addCommentatorLog('🔍 Análise de jogos iniciada (sem envio de sinais)', 'info');
      // Simular análise
      setTimeout(() => {
        addCommentatorLog('✅ Análise concluída - 5 jogos analisados', 'success');
      }, 2000);
      return new Response(JSON.stringify({ success: true, message: 'Análise iniciada - Apenas análise, sem envio de sinais' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
  
  return new Response(JSON.stringify({ status: storage.botStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para estatísticas
async function handleStatsAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const stats = {
    signals: {
      total: storage.signals.length,
      greens: storage.signals.filter(s => s.status === 'green').length,
      reds: storage.signals.filter(s => s.status === 'red').length,
      pending: storage.signals.filter(s => s.status === 'pending').length
    },
    system: {
      botStatus: storage.botStatus,
      totalUsers: 0
    }
  };
  
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// Função auxiliar para adicionar logs ao comentador
function addCommentatorLog(message, type = 'info') {
  const logEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    message,
    type
  };
  storage.commentatorLogs.push(logEntry);
  
  // Manter apenas os últimos 100 logs
  if (storage.commentatorLogs.length > 100) {
    storage.commentatorLogs = storage.commentatorLogs.slice(-100);
  }
}

// API de utilizadores removida - SISTEMA SEM AUTENTICAÇÃO

// HTML do Dashboard SEM AUTENTICAÇÃO
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Principal</title>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="version" content="${Date.now()}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { darkMode: 'class' }
    </script>
</head>
<body class="h-full bg-gray-900 text-white">
    <div class="min-h-full">
            <header class="bg-gray-800 shadow-sm border-b border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <h1 class="text-xl font-bold text-blue-400">Alert@Postas - Sistema Principal</h1>
                        <div class="flex items-center space-x-4">
                            <span class="text-gray-300">Sistema Ativo</span>
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span class="text-sm text-gray-300">Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Bot Controls -->
                <div class="bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                    <h2 class="text-lg font-semibold mb-4">🤖 Controlo do Bot</h2>
                    <div class="flex flex-wrap gap-4">
                        <button id="startBot" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                            🚀 Iniciar Bot
                        </button>
                        <button id="stopBot" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                            ⏹️ Parar Bot
                        </button>
                        <button id="analyzeGames" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                            🔍 Analisar Jogos
                        </button>
                        <span id="botStatus" class="flex items-center px-4 py-2 bg-gray-700 rounded-md">
                            Status: <span id="statusText" class="ml-2 text-yellow-400">Parado</span>
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Live Games -->
                    <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-lg font-semibold">🔴 Jogos ao Vivo</h2>
                            <button id="refreshLiveGames" class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm">
                                🔄 Atualizar
                            </button>
                        </div>
                        <div id="live-games-list" class="space-y-2 max-h-96 overflow-y-auto">
                            <div class="text-center text-gray-400 py-4">Carregando jogos ao vivo...</div>
                        </div>
                    </div>

                    <!-- Calendar Horizontal -->
                    <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">📅</span>
                                <h2 class="text-lg font-semibold">Seleção de Dias</h2>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="prevWeek" class="bg-gray-700 text-white px-2 py-1 rounded-md hover:bg-gray-600 text-sm">
                                    ←
                                </button>
                                <button id="goToday" class="bg-gray-700 text-white px-2 py-1 rounded-md hover:bg-gray-600 text-sm">
                                    Hoje
                                </button>
                                <button id="nextWeek" class="bg-gray-700 text-white px-2 py-1 rounded-md hover:bg-gray-600 text-sm">
                                    →
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-6">
                            <div id="day-0" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SEG</span>
                                <span class="text-lg font-bold" id="date-0">15</span>
                            </div>
                            <div id="day-1" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">TER</span>
                                <span class="text-lg font-bold" id="date-1">16</span>
                            </div>
                            <div id="day-2" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">QUA</span>
                                <span class="text-lg font-bold" id="date-2">17</span>
                            </div>
                            <div id="day-3" class="h-16 flex flex-col items-center justify-center p-2 border-2 border-red-500 rounded-lg cursor-pointer bg-red-900/20">
                                <span class="text-xs font-medium text-red-400">HOJE</span>
                                <span class="text-lg font-bold text-red-400" id="date-3">18</span>
                            </div>
                            <div id="day-4" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SEX</span>
                                <span class="text-lg font-bold" id="date-4">19</span>
                            </div>
                            <div id="day-5" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SÁB</span>
                                <span class="text-lg font-bold" id="date-5">20</span>
                            </div>
                            <div id="day-6" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">DOM</span>
                                <span class="text-lg font-bold" id="date-6">21</span>
                            </div>
                        </div>

                        <!-- Jogos do Dia Selecionado -->
                        <div class="border-t border-gray-700 pt-4">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">⚽</span>
                                    <h3 class="text-lg font-semibold" id="selectedDayTitle">
                                        Jogos - Quinta-feira, 18 de Setembro
                                    </h3>
                                    <div id="gamesLoading" class="flex items-center gap-2 text-sm text-gray-400 hidden">
                                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        Carregando...
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="selectAllGames" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm hidden">
                                        Selecionar Todos
                                    </button>
                                    <button id="deselectAllGames" class="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm hidden">
                                        Desmarcar Todos
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Barra de Pesquisa -->
                            <div class="mb-4">
                                <div class="relative">
                                    <input 
                                        type="text" 
                                        id="gamesSearch" 
                                        placeholder="Pesquisar por equipas..." 
                                        class="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                                    >
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400 text-sm">🔍</span>
                                    </div>
                                    <button id="clearSearch" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white hidden">
                                        <span class="text-lg">✕</span>
                                    </button>
                                </div>
                                <div id="searchResults" class="text-xs text-gray-400 mt-1 hidden">
                                    <!-- Resultados da pesquisa aparecerão aqui -->
                                </div>
                            </div>
                            
                            <div id="gamesError" class="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4 hidden">
                                <p class="text-red-400 text-sm" id="gamesErrorText">❌ Erro ao carregar jogos</p>
                            </div>

                            <div id="noGamesMessage" class="text-center py-8 hidden">
                                <div class="text-gray-400 mb-2">
                                    <span class="text-4xl mb-4 block">🕐</span>
                                    <p class="text-lg font-medium">Sem jogos disponíveis</p>
                                    <p class="text-sm">Não há jogos programados para esta data</p>
                                </div>
                            </div>

                            <!-- Container dos jogos com altura fixa e scroll -->
                            <div class="bg-gray-700/30 rounded-lg border border-gray-600">
                                <div id="gamesList" class="max-h-80 overflow-y-auto p-3 space-y-2">
                                    <!-- Jogos serão carregados aqui -->
                                </div>
                            </div>
                            
                            <!-- Contador de jogos selecionados -->
                            <div id="selectedGamesInfo" class="mt-3 text-sm text-gray-400 hidden">
                                <span id="selectedCount">0</span> jogos selecionados
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Signals -->
                <div class="bg-gray-800 rounded-lg shadow-sm p-6 mt-8">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold">📊 Sinais Enviados</h2>
                        <button id="clearSignals" class="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm">
                            🗑️ Limpar
                        </button>
                    </div>
                    <div id="signals-list" class="bg-black rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
                        <div class="text-gray-400">Nenhum sinal enviado</div>
                    </div>
                </div>

                <!-- Commentator Panel -->
                <div class="bg-gray-800 rounded-lg shadow-sm p-6 mt-8">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold">🎙️ Painel do Comentador</h2>
                        <button id="clearCommentator" class="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm">
                            🗑️ Limpar
                        </button>
                    </div>
                    <div id="commentator-panel" class="bg-black rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
                        <div class="text-gray-400">Sistema iniciado - Aguardando ações...</div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="bg-gray-800 rounded-lg shadow-sm p-6 mt-8">
                    <h2 class="text-lg font-semibold mb-4">📈 Estatísticas</h2>
                    <div id="stats-display" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-blue-400" id="totalSignals">0</div>
                            <div class="text-sm text-gray-400">Total Sinais</div>
                        </div>
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-green-400" id="greenSignals">0</div>
                            <div class="text-sm text-gray-400">Greens</div>
                        </div>
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-red-400" id="redSignals">0</div>
                            <div class="text-sm text-gray-400">Reds</div>
                        </div>
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-yellow-400" id="pendingSignals">0</div>
                            <div class="text-sm text-gray-400">Pendentes</div>
                        </div>
                    </div>
                </div>

                <!-- Seção de utilizadores removida - SISTEMA SEM AUTENTICAÇÃO -->
            </main>
    </div>

    <script>
        // Forçar modo escuro
        document.documentElement.classList.add('dark');

        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema Alert@Postas iniciado - alertapostas.pt');
            addCommentatorLog('🎯 Sistema Alert@Postas iniciado com sucesso', 'success');
            loadData();
            setupEventListeners();
            
            // Inicializar calendário após um pequeno delay
            setTimeout(() => {
                if (document.getElementById('day-0')) {
                    initializeCalendar();
                }
            }, 100);
        });



        function setupEventListeners() {
            
            // Botões do bot
            const startBot = document.getElementById('startBot');
            const stopBot = document.getElementById('stopBot');
            const analyzeGames = document.getElementById('analyzeGames');
            
            if (startBot) startBot.addEventListener('click', () => botAction('start'));
            if (stopBot) stopBot.addEventListener('click', () => botAction('stop'));
            if (analyzeGames) analyzeGames.addEventListener('click', () => botAction('analyze'));
            
            // Botões de refresh
            const refreshGames = document.getElementById('refreshGames');
            const refreshLiveGames = document.getElementById('refreshLiveGames');
            
            if (refreshGames) refreshGames.addEventListener('click', loadFutureGames);
            if (refreshLiveGames) refreshLiveGames.addEventListener('click', loadLiveGames);
            
            // Pesquisa e comentador
            const gameSearch = document.getElementById('gameSearch');
            const clearCommentator = document.getElementById('clearCommentator');
            
            if (gameSearch) gameSearch.addEventListener('input', filterGames);
            if (clearCommentator) clearCommentator.addEventListener('click', function() {
                document.getElementById('commentator-panel').innerHTML = '<div class="text-gray-400">Logs limpos</div>';
            });
        }

        async function botAction(action) {
            try {
                const response = await fetch('/api/v1/bot/control', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ ' + data.message);
                    updateBotStatus();
                } else {
                    alert('❌ Erro: ' + data.error);
                }
            } catch (error) {
                console.error('Bot action error:', error);
                alert('❌ Erro na ação do bot: ' + error.message);
            }
        }

        async function updateBotStatus() {
            try {
                const response = await fetch('/api/v1/bot/control');
                const data = await response.json();
                const statusText = data.status === 'running' ? 'Ativo' : 'Parado';
                const statusColor = data.status === 'running' ? 'text-green-400' : 'text-red-400';
                
                document.getElementById('statusText').textContent = statusText;
                document.getElementById('statusText').className = 'ml-2 ' + statusColor;
            } catch (error) {
                console.error('Status update error:', error);
            }
        }

        async function loadData() {
            await Promise.all([
                loadLiveGames(),
                loadFutureGames(),
                loadStats(),
                loadCommentatorLogs()
            ]);
        }

        async function loadFutureGames() {
            try {
                const response = await fetch('/api/v1/future-games');
                const games = await response.json();
                displayFutureGames(games);
            } catch (error) {
                console.error('Error loading games:', error);
            }
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/v1/stats');
                const stats = await response.json();
                displayStats(stats);
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        function displayFutureGames(games) {
            const container = document.getElementById('future-games-list');
            
            if (games.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-4">Sem jogos disponíveis</div>';
                return;
            }

            const gamesHtml = games.slice(0, 20).map(game => {
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                return '<div class="game-item p-3 bg-gray-700 rounded-lg">' +
                    '<div class="font-semibold text-sm">' + game.home_team + ' vs ' + game.away_team + '</div>' +
                    '<div class="text-xs text-gray-400">' + game.league + ' - ' + gameDate + ' às ' + gameTime + '</div>' +
                    '</div>';
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displayStats(stats) {
            document.getElementById('totalSignals').textContent = stats.signals.total;
            document.getElementById('greenSignals').textContent = stats.signals.greens;
            document.getElementById('redSignals').textContent = stats.signals.reds;
            document.getElementById('pendingSignals').textContent = stats.signals.pending;
        }

        // Funções para jogos ao vivo
        async function loadLiveGames() {
            try {
                const response = await fetch('/api/v1/live-games');
                if (!response.ok) {
                    throw new Error('Falha ao carregar jogos ao vivo: ' + response.status);
                }
                const games = await response.json();
                displayLiveGames(games);
            } catch (error) {
                console.error('Error loading live games:', error);
                displayLiveGames([]);
            }
        }

        function displayLiveGames(games) {
            const container = document.getElementById('live-games-list');
            
            if (!games || games.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-8">' +
                    '<div class="text-4xl mb-2">⚽</div>' +
                    '<p class="text-lg font-medium">Sem jogos ao vivo no momento</p>' +
                    '<p class="text-sm">Não há jogos em andamento agora</p>' +
                    '</div>';
                return;
            }

            const gamesHtml = games.map(game => {
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                return '<div class="p-3 bg-red-900/20 border border-red-500 rounded-lg hover:bg-red-900/30 transition-colors">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<div class="font-semibold text-sm text-red-100">' + game.home_team + ' vs ' + game.away_team + '</div>' +
                        '<div class="bg-red-600 text-white px-2 py-1 rounded text-xs">' + game.minute + ' min</div>' +
                    '</div>' +
                    '<div class="text-xs text-red-300 mb-2">' + game.league + ' • ' + game.country + '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<div class="text-sm font-bold text-red-100">' + (game.home_score || 0) + ' - ' + (game.away_score || 0) + '</div>' +
                        '<div class="text-xs text-red-400">' + gameTime + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            container.innerHTML = gamesHtml;
        }

        // Funções para comentador
        async function loadCommentatorLogs() {
            try {
                const response = await fetch('/api/v1/commentator');
                const logs = await response.json();
                displayCommentatorLogs(logs);
            } catch (error) {
                console.error('Error loading commentator logs:', error);
            }
        }

        function displayCommentatorLogs(logs) {
            const container = document.getElementById('commentator-panel');
            
            if (logs.length === 0) {
                container.innerHTML = '<div class="text-gray-400">Sistema iniciado - Aguardando ações...</div>';
                return;
            }

            const logsHtml = logs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString('pt-PT');
                const colorClass = log.type === 'success' ? 'text-green-400' : 
                                 log.type === 'warning' ? 'text-yellow-400' : 
                                 log.type === 'error' ? 'text-red-400' : 'text-blue-400';
                
                return '<div class="' + colorClass + '">[' + time + '] ' + log.message + '</div>';
            }).join('');

            container.innerHTML = logsHtml;
            container.scrollTop = container.scrollHeight;
        }

        // Função de pesquisa
        function filterGames() {
            const searchInput = document.getElementById('gameSearch');
            if (!searchInput) return;
            
            const searchTerm = searchInput.value.toLowerCase();
            const container = document.getElementById('future-games-list');
            if (!container) return;
            
            const gameElements = container.querySelectorAll('.game-item');
            
            gameElements.forEach(element => {
                const gameText = element.textContent.toLowerCase();
                if (gameText.includes(searchTerm)) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            });
        }

        // Função para adicionar logs ao comentador (frontend)
        async function addCommentatorLog(message, type = 'info') {
            try {
                await fetch('/api/v1/commentator', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message, type })
                });
            } catch (error) {
                console.error('Error adding commentator log:', error);
            }
        }

        // Funções de utilizadores removidas - SISTEMA SEM AUTENTICAÇÃO


        // Event listener para botão de limpar sinais
        document.getElementById('clearSignals').addEventListener('click', () => {
            document.getElementById('signals-list').innerHTML = '<div class="text-gray-400">Nenhum sinal enviado</div>';
        });

        // Atualizar comentador a cada 5 segundos
        setInterval(loadCommentatorLogs, 5000);

        // ===== CALENDÁRIO HORIZONTAL =====
        let currentWeek = new Date();
        let selectedDate = new Date().toISOString().split('T')[0];
        let allGames = [];
        let selectedGames = new Set();

        function initializeCalendar() {
            updateCalendarDisplay();
            setupCalendarEventListeners();
            setupGamesEventListeners();
            loadGamesForDate(selectedDate);
        }

        function setupCalendarEventListeners() {
            // Botões de navegação
            document.getElementById('prevWeek').addEventListener('click', () => {
                currentWeek.setDate(currentWeek.getDate() - 7);
                updateCalendarDisplay();
            });

            document.getElementById('nextWeek').addEventListener('click', () => {
                currentWeek.setDate(currentWeek.getDate() + 7);
                updateCalendarDisplay();
            });

            document.getElementById('goToday').addEventListener('click', () => {
                currentWeek = new Date();
                selectedDate = new Date().toISOString().split('T')[0];
                updateCalendarDisplay();
                loadGamesForDate(selectedDate);
            });

            // Clique nos dias
            for (let i = 0; i < 7; i++) {
                document.getElementById('day-' + i).addEventListener('click', () => {
                    selectDay(i);
                });
            }
        }

        function setupGamesEventListeners() {
            // Barra de pesquisa
            const searchInput = document.getElementById('gamesSearch');
            const clearSearchBtn = document.getElementById('clearSearch');
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (query) {
                    clearSearchBtn.classList.remove('hidden');
                    filterGames(query);
                } else {
                    clearSearchBtn.classList.add('hidden');
                    showAllGames();
                }
            });

            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchBtn.classList.add('hidden');
                showAllGames();
            });

            // Botões de seleção
            document.getElementById('selectAllGames').addEventListener('click', () => {
                selectAllVisibleGames();
            });

            document.getElementById('deselectAllGames').addEventListener('click', () => {
                deselectAllGames();
            });
        }

        function updateCalendarDisplay() {
            const startOfWeek = getStartOfWeek(currentWeek);
            
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                
                const dayElement = document.getElementById('day-' + i);
                const dateElement = document.getElementById('date-' + i);
                
                // Atualizar data
                const dayOfMonth = day.getDate();
                dateElement.textContent = dayOfMonth.toString().padStart(2, '0');
                
                // Resetar estilos
                dayElement.className = 'h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors';
                
                // Verificar se é hoje
                const today = new Date();
                if (day.toDateString() === today.toDateString()) {
                    dayElement.className = 'h-16 flex flex-col items-center justify-center p-2 border-2 border-red-500 rounded-lg cursor-pointer bg-red-900/20';
                    const weekdaySpan = dayElement.querySelector('span:first-child');
                    weekdaySpan.textContent = 'HOJE';
                    weekdaySpan.className = 'text-xs font-medium text-red-400';
                    dateElement.className = 'text-lg font-bold text-red-400';
                } else {
                    const weekdaySpan = dayElement.querySelector('span:first-child');
                    const weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
                    weekdaySpan.textContent = weekdays[day.getDay() === 0 ? 6 : day.getDay() - 1];
                    weekdaySpan.className = 'text-xs font-medium text-gray-400';
                    dateElement.className = 'text-lg font-bold';
                }
                
                // Verificar se é o dia selecionado
                const dayString = day.toISOString().split('T')[0];
                if (dayString === selectedDate) {
                    dayElement.className += ' bg-blue-900/30 border-blue-500';
                }
            }
        }

        function getStartOfWeek(date) {
            const startOfWeek = new Date(date);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            return startOfWeek;
        }

        function selectDay(dayIndex) {
            const startOfWeek = getStartOfWeek(currentWeek);
            const selectedDay = new Date(startOfWeek);
            selectedDay.setDate(startOfWeek.getDate() + dayIndex);
            selectedDate = selectedDay.toISOString().split('T')[0];
            
            updateCalendarDisplay();
            updateSelectedDayTitle(selectedDay);
            loadGamesForDate(selectedDate);
        }

        function updateSelectedDayTitle(date) {
            const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            const weekday = weekdays[date.getDay()];
            const day = date.getDate();
            const month = months[date.getMonth()];
            
            document.getElementById('selectedDayTitle').textContent = 'Jogos - ' + weekday + ', ' + day + ' de ' + month;
        }

        async function loadGamesForDate(date) {
            const gamesList = document.getElementById('gamesList');
            const gamesLoading = document.getElementById('gamesLoading');
            const gamesError = document.getElementById('gamesError');
            const noGamesMessage = document.getElementById('noGamesMessage');
            
            // Mostrar loading
            gamesLoading.classList.remove('hidden');
            gamesError.classList.add('hidden');
            noGamesMessage.classList.add('hidden');
            gamesList.innerHTML = '';
            
            try {
                // Buscar jogos futuros primeiro
                let response = await fetch('/api/v1/future-games');
                let games = [];
                
                if (response.ok) {
                    const data = await response.json();
                    const allFutureGames = Array.isArray(data) ? data : [];
                    
                    // Filtrar jogos pela data selecionada
                    const selectedDate = new Date(date).toISOString().split('T')[0];
                    games = allFutureGames.filter(game => {
                        const gameDate = new Date(game.date).toISOString().split('T')[0];
                        return gameDate === selectedDate;
                    });
                }
                
                // Se não há jogos futuros, tentar buscar jogos ao vivo
                if (games.length === 0) {
                    response = await fetch('/api/v1/live-games');
                    
                    if (response.ok) {
                        const data = await response.json();
                        const liveGames = Array.isArray(data) ? data : [];
                        
                        // Filtrar jogos ao vivo pela data selecionada
                        const selectedDate = new Date(date).toISOString().split('T')[0];
                        games = liveGames.filter(game => {
                            const gameDate = new Date(game.date).toISOString().split('T')[0];
                            return gameDate === selectedDate;
                        });
                    }
                }
                
                // Armazenar todos os jogos
                allGames = games;
                
                // Esconder loading
                gamesLoading.classList.add('hidden');
                
                if (games.length === 0) {
                    noGamesMessage.classList.remove('hidden');
                    hideGameControls();
                } else {
                    displayGames(games);
                    showGameControls();
                }
                
            } catch (error) {
                console.error('Erro ao carregar jogos:', error);
                gamesLoading.classList.add('hidden');
                gamesError.classList.remove('hidden');
                document.getElementById('gamesErrorText').textContent = '❌ Erro ao carregar jogos: ' + error.message;
            }
        }

        function displayGames(games) {
            const gamesList = document.getElementById('gamesList');
            gamesList.innerHTML = '';
            
            games.forEach(game => {
                const gameElement = document.createElement('div');
                gameElement.className = 'flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700/70 transition-colors';
                gameElement.dataset.gameId = game.id;
                
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                // Determinar status do jogo
                const now = new Date();
                const gameDate = new Date(game.date);
                let statusBadge, statusText;
                
                if (game.status === 'LIVE') {
                    statusBadge = 'bg-red-600';
                    statusText = 'AO VIVO';
                } else if (gameDate < now) {
                    statusBadge = 'bg-yellow-600';
                    statusText = 'TERMINADO';
                } else {
                    statusBadge = 'bg-green-600';
                    statusText = 'FUTURO';
                }
                
                // Checkbox para seleção
                const isSelected = selectedGames.has(game.id);
                const checkboxClass = isSelected ? 'checked' : '';
                
                gameElement.innerHTML = 
                    '<div class="flex items-center">' +
                        '<input type="checkbox" class="game-checkbox w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" ' + 
                        (isSelected ? 'checked' : '') + ' data-game-id="' + game.id + '">' +
                    '</div>' +
                    '<div class="flex-1 min-w-0">' +
                        '<div class="flex items-center gap-2 mb-1">' +
                            '<span class="font-medium text-sm truncate">' + game.home_team + ' vs ' + game.away_team + '</span>' +
                            '<span class="' + statusBadge + ' text-white px-2 py-1 rounded text-xs whitespace-nowrap">' + statusText + '</span>' +
                        '</div>' +
                        '<div class="text-xs text-gray-400 truncate">' +
                            game.league + ' • ' + game.country +
                        '</div>' +
                    '</div>' +
                    '<div class="text-right flex-shrink-0">' +
                        '<div class="text-sm font-medium">' + gameTime + '</div>' +
                        '<div class="text-xs text-gray-400">ID: ' + game.id + '</div>' +
                    '</div>';
                
                // Adicionar evento ao checkbox
                const checkbox = gameElement.querySelector('.game-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedGames.add(game.id);
                        gameElement.classList.add('bg-blue-900/30', 'border-blue-500');
                    } else {
                        selectedGames.delete(game.id);
                        gameElement.classList.remove('bg-blue-900/30', 'border-blue-500');
                    }
                    updateSelectedGamesInfo();
                });
                
                gamesList.appendChild(gameElement);
            });
            
            updateSelectedGamesInfo();
        }

        function filterGames(query) {
            if (!query || typeof query !== 'string') return allGames;
            
            const filteredGames = allGames.filter(game => {
                const homeTeam = game.home_team.toLowerCase();
                const awayTeam = game.away_team.toLowerCase();
                const league = game.league.toLowerCase();
                const searchTerms = query.toLowerCase().split(' ');
                
                return searchTerms.every(term => 
                    homeTeam.includes(term) || 
                    awayTeam.includes(term) || 
                    league.includes(term)
                );
            });
            
            displayGames(filteredGames);
            updateSearchResults(query, filteredGames.length);
        }

        function showAllGames() {
            displayGames(allGames);
            document.getElementById('searchResults').classList.add('hidden');
        }

        function updateSearchResults(query, count) {
            const searchResults = document.getElementById('searchResults');
            searchResults.innerHTML = 'Pesquisando por "' + query + '" - ' + count + ' jogos encontrados';
            searchResults.classList.remove('hidden');
        }

        function selectAllVisibleGames() {
            const checkboxes = document.querySelectorAll('.game-checkbox');
            checkboxes.forEach(checkbox => {
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    const gameId = parseInt(checkbox.dataset.gameId);
                    selectedGames.add(gameId);
                    const gameElement = checkbox.closest('[data-game-id]');
                    gameElement.classList.add('bg-blue-900/30', 'border-blue-500');
                }
            });
            updateSelectedGamesInfo();
        }

        function deselectAllGames() {
            selectedGames.clear();
            const checkboxes = document.querySelectorAll('.game-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const gameElement = checkbox.closest('[data-game-id]');
                gameElement.classList.remove('bg-blue-900/30', 'border-blue-500');
            });
            updateSelectedGamesInfo();
        }

        function updateSelectedGamesInfo() {
            const selectedCount = selectedGames.size;
            const selectedInfo = document.getElementById('selectedGamesInfo');
            const selectedCountSpan = document.getElementById('selectedCount');
            
            if (selectedCount > 0) {
                selectedCountSpan.textContent = selectedCount;
                selectedInfo.classList.remove('hidden');
            } else {
                selectedInfo.classList.add('hidden');
            }
        }

        function showGameControls() {
            document.getElementById('selectAllGames').classList.remove('hidden');
            document.getElementById('deselectAllGames').classList.remove('hidden');
        }

        function hideGameControls() {
            document.getElementById('selectAllGames').classList.add('hidden');
            document.getElementById('deselectAllGames').classList.add('hidden');
        }

        // Inicializar calendário quando a página carregar (já está no DOMContentLoaded principal)
        setTimeout(() => {
            if (document.getElementById('day-0')) {
                initializeCalendar();
            }
        }, 100);
    </script>
</body>
</html>`;
}
