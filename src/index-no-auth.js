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

// Função para verificar jogos ao vivo
async function checkLiveGames(env) {
  try {
    console.log('Verificando jogos ao vivo...');
    // Implementar lógica de verificação de jogos ao vivo
  } catch (error) {
    console.error('Erro ao verificar jogos ao vivo:', error);
  }
}

// Função para verificar jogos terminados
async function checkFinishedGames(env) {
  try {
    console.log('Verificando jogos terminados...');
    // Implementar lógica de verificação de jogos terminados
  } catch (error) {
    console.error('Erro ao verificar jogos terminados:', error);
  }
}

// Função para gerar relatório diário
async function generateDailyReport(env) {
  try {
    console.log('Gerando relatório diário...');
    // Implementar lógica de relatório diário
  } catch (error) {
    console.error('Erro ao gerar relatório diário:', error);
  }
}

// Função principal para lidar com APIs
async function handleAPI(request, env, path) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Rotas públicas da API
    if (path === '/api/v1/live-games') {
      return await handleLiveGamesAPI(request, env);
    }
    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    if (path === '/api/v1/commentator') {
      return await handleCommentatorAPI(request, env);
    }
    if (path === '/api/v1/bot/start') {
      return await handleBotStartAPI(request, env);
    }
    if (path === '/api/v1/bot/stop') {
      return await handleBotStopAPI(request, env);
    }
    if (path === '/api/v1/bot/status') {
      return await handleBotStatusAPI(request, env);
    }
    if (path === '/api/v1/telegram/send') {
      return await handleTelegramSendAPI(request, env);
    }

    return new Response(JSON.stringify({ success: false, error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Erro na API:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para jogos ao vivo
async function handleLiveGamesAPI(request, env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Buscando jogos ao vivo para:', today);
    
    const apiUrl = 'https://v3.football.api-sports.io/fixtures?date=' + today + '&status=LIVE';
    const response = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': env.API_FOOTBALL_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    const data = await response.json();
    console.log('API Football LIVE response:', data);

    if (data.errors && data.errors.length > 0) {
      console.error('Erros da API Football:', data.errors);
      return new Response(JSON.stringify({ success: false, error: 'Erro na API Football', details: data.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const liveGames = data.response || [];
    console.log('Number of live fixtures:', liveGames.length);

    // Processar jogos
    const processedGames = liveGames.map(game => ({
      id: game.fixture.id,
      homeTeam: game.teams.home.name,
      awayTeam: game.teams.away.name,
      league: game.league.name,
      status: 'AO VIVO',
      time: game.fixture.status.elapsed ? game.fixture.status.elapsed + '\'' : '0\'',
      score: (game.goals.home || 0) + '-' + (game.goals.away || 0),
      date: game.fixture.date
    }));

    console.log('Processed live games:', processedGames.length);

    return new Response(JSON.stringify({ success: true, games: processedGames }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Erro ao buscar jogos ao vivo:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para jogos futuros
async function handleFutureGamesAPI(request, env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('Buscando jogos futuros de:', today, 'até:', nextWeek);
    
    const apiUrl = 'https://v3.football.api-sports.io/fixtures?from=' + today + '&to=' + nextWeek + '&status=NS';
    const response = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': env.API_FOOTBALL_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    const data = await response.json();
    console.log('API Football response:', data);

    if (data.errors && data.errors.length > 0) {
      console.error('Erros da API Football:', data.errors);
      return new Response(JSON.stringify({ success: false, error: 'Erro na API Football', details: data.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const futureGames = data.response || [];
    console.log('Number of fixtures:', futureGames.length);

    // Processar jogos
    const processedGames = futureGames.map(game => ({
      id: game.fixture.id,
      homeTeam: game.teams.home.name,
      awayTeam: game.teams.away.name,
      league: game.league.name,
      status: 'FUTURO',
      time: new Date(game.fixture.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      date: game.fixture.date
    }));

    console.log('Processed future games:', processedGames.length);

    return new Response(JSON.stringify({ success: true, games: processedGames }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Erro ao buscar jogos futuros:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para painel do comentador
async function handleCommentatorAPI(request, env) {
  try {
    // Retornar logs do sistema
    const logs = [
      { timestamp: new Date().toISOString(), message: '🎯 Sistema Alert@Postas iniciado', type: 'success' },
      { timestamp: new Date().toISOString(), message: '🔍 Verificando jogos disponíveis...', type: 'info' },
      { timestamp: new Date().toISOString(), message: '✅ API Football conectada', type: 'success' }
    ];

    return new Response(JSON.stringify({ success: true, logs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Erro no painel do comentador:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para iniciar bot
async function handleBotStartAPI(request, env) {
  try {
    console.log('Bot iniciado via API');
    return new Response(JSON.stringify({ success: true, message: 'Bot iniciado com sucesso' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para parar bot
async function handleBotStopAPI(request, env) {
  try {
    console.log('Bot parado via API');
    return new Response(JSON.stringify({ success: true, message: 'Bot parado com sucesso' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para status do bot
async function handleBotStatusAPI(request, env) {
  try {
    return new Response(JSON.stringify({ 
      success: true, 
      status: 'running',
      message: 'Bot ativo e funcionando' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para enviar mensagem Telegram
async function handleTelegramSendAPI(request, env) {
  try {
    const { message } = await request.json();
    
    const telegramUrl = 'https://api.telegram.org/bot' + env.TELEGRAM_TOKEN + '/sendMessage';
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_GROUP_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      return new Response(JSON.stringify({ success: true, message: 'Mensagem enviada com sucesso' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    } else {
      throw new Error(result.description || 'Erro ao enviar mensagem');
    }

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// HTML do Dashboard SEM AUTENTICAÇÃO
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Sem Autenticação</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
        .kpi-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .gradient-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .status-active { color: #10b981; }
        .status-inactive { color: #ef4444; }
        .status-error { color: #f59e0b; }
    </style>
</head>
<body class="h-full bg-gray-900 text-white">
    <div class="min-h-full">
        <!-- Header -->
        <header class="bg-gray-800 shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-6">
                    <div class="flex items-center">
                        <h1 class="text-3xl font-bold text-blue-400">Alert@Postas</h1>
                        <span class="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded-full">Sistema Ativo</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-gray-300">Sistema Sem Autenticação</span>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span class="text-sm text-gray-300">Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="kpi-card p-6 rounded-lg text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-200 text-sm">Jogos ao Vivo</p>
                            <p class="text-3xl font-bold" id="liveGamesCount">0</p>
                        </div>
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i data-lucide="activity" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card p-6 rounded-lg text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-200 text-sm">Jogos Futuros</p>
                            <p class="text-3xl font-bold" id="futureGamesCount">0</p>
                        </div>
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i data-lucide="calendar" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card p-6 rounded-lg text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-200 text-sm">Bot Status</p>
                            <p class="text-lg font-bold status-active" id="botStatus">Ativo</p>
                        </div>
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i data-lucide="bot" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card p-6 rounded-lg text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-200 text-sm">Última Atualização</p>
                            <p class="text-sm font-bold" id="lastUpdate">Agora</p>
                        </div>
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i data-lucide="clock" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bot Controls -->
            <div class="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 class="text-xl font-bold mb-4">Controlo do Bot</h2>
                <div class="flex space-x-4">
                    <button id="startBotBtn" class="gradient-btn text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                        <i data-lucide="play" class="w-5 h-5 inline mr-2"></i>
                        Iniciar Bot
                    </button>
                    <button id="stopBotBtn" class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                        <i data-lucide="square" class="w-5 h-5 inline mr-2"></i>
                        Parar Bot
                    </button>
                    <button id="refreshBtn" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <i data-lucide="refresh-cw" class="w-5 h-5 inline mr-2"></i>
                        Atualizar Dados
                    </button>
                </div>
            </div>

            <!-- Games Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Jogos ao Vivo -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold">Jogos ao Vivo</h2>
                        <span class="px-3 py-1 bg-red-600 text-white text-sm rounded-full">AO VIVO</span>
                    </div>
                    <div id="liveGames" class="space-y-3 max-h-80 overflow-y-auto">
                        <div class="text-center text-gray-400 py-8">
                            <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
                            <p>Carregando jogos ao vivo...</p>
                        </div>
                    </div>
                </div>

                <!-- Jogos Futuros -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold">Jogos Futuros</h2>
                        <span class="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">PRÓXIMOS</span>
                    </div>
                    <div id="futureGames" class="space-y-3 max-h-80 overflow-y-auto">
                        <div class="text-center text-gray-400 py-8">
                            <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
                            <p>Carregando jogos futuros...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Painel do Comentador -->
            <div class="bg-gray-800 rounded-lg p-6 mt-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold">Painel do Comentador</h2>
                    <button id="clearLogsBtn" class="text-red-400 hover:text-red-300 text-sm">
                        <i data-lucide="trash-2" class="w-4 h-4 inline mr-1"></i>
                        Limpar Logs
                    </button>
                </div>
                <div id="commentatorLogs" class="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div class="text-green-400 text-sm">
                        <span class="text-gray-500">[${new Date().toLocaleString('pt-PT')}]</span>
                        🎯 Sistema Alert@Postas iniciado sem autenticação
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        // Inicializar ícones Lucide
        lucide.createIcons();

        // Variáveis globais
        let botStatus = 'running';
        let liveGames = [];
        let futureGames = [];

        // Carregar dados iniciais
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema Alert@Postas iniciado (sem autenticação)');
            loadData();
            setupEventListeners();
            
            // Atualizar dados a cada 30 segundos
            setInterval(loadData, 30000);
        });

        // Configurar event listeners
        function setupEventListeners() {
            document.getElementById('startBotBtn').addEventListener('click', startBot);
            document.getElementById('stopBotBtn').addEventListener('click', stopBot);
            document.getElementById('refreshBtn').addEventListener('click', loadData);
            document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
        }

        // Carregar dados
        async function loadData() {
            try {
                await Promise.all([
                    loadLiveGames(),
                    loadFutureGames(),
                    loadCommentatorLogs()
                ]);
                updateLastUpdate();
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                addCommentatorLog('❌ Erro ao carregar dados: ' + error.message, 'error');
            }
        }

        // Carregar jogos ao vivo
        async function loadLiveGames() {
            try {
                const response = await fetch('/api/v1/live-games');
                const data = await response.json();
                
                if (data.success) {
                    liveGames = data.games;
                    displayLiveGames();
                    document.getElementById('liveGamesCount').textContent = liveGames.length;
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Erro ao carregar jogos ao vivo:', error);
                document.getElementById('liveGames').innerHTML = 
                    '<div class="text-center text-red-400 py-8">' +
                        '<i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>' +
                        '<p>Erro ao carregar jogos ao vivo</p>' +
                        '<p class="text-sm">' + error.message + '</p>' +
                    '</div>';
                lucide.createIcons();
            }
        }

        // Carregar jogos futuros
        async function loadFutureGames() {
            try {
                const response = await fetch('/api/v1/future-games');
                const data = await response.json();
                
                if (data.success) {
                    futureGames = data.games;
                    displayFutureGames();
                    document.getElementById('futureGamesCount').textContent = futureGames.length;
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Erro ao carregar jogos futuros:', error);
                document.getElementById('futureGames').innerHTML = 
                    '<div class="text-center text-red-400 py-8">' +
                        '<i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>' +
                        '<p>Erro ao carregar jogos futuros</p>' +
                        '<p class="text-sm">' + error.message + '</p>' +
                    '</div>';
                lucide.createIcons();
            }
        }

        // Carregar logs do comentador
        async function loadCommentatorLogs() {
            try {
                const response = await fetch('/api/v1/commentator');
                const data = await response.json();
                
                if (data.success && data.logs) {
                    const logsContainer = document.getElementById('commentatorLogs');
                    logsContainer.innerHTML = '';
                    
                    data.logs.forEach(log => {
                        addLogEntry(log.message, log.type);
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar logs:', error);
            }
        }

        // Exibir jogos ao vivo
        function displayLiveGames() {
            const container = document.getElementById('liveGames');
            
            if (liveGames.length === 0) {
                container.innerHTML = 
                    '<div class="text-center text-gray-400 py-8">' +
                        '<i data-lucide="activity" class="w-8 h-8 mx-auto mb-2"></i>' +
                        '<p>Sem jogos ao vivo no momento</p>' +
                    '</div>';
            } else {
                container.innerHTML = liveGames.map(game => 
                    '<div class="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">' +
                        '<div class="flex items-center justify-between mb-2">' +
                            '<span class="text-xs text-gray-400">' + game.league + '</span>' +
                            '<span class="px-2 py-1 bg-red-600 text-white text-xs rounded">' + game.time + '</span>' +
                        '</div>' +
                        '<div class="flex items-center justify-between">' +
                            '<div class="flex-1">' +
                                '<p class="font-medium">' + game.homeTeam + '</p>' +
                                '<p class="text-sm text-gray-400">vs</p>' +
                                '<p class="font-medium">' + game.awayTeam + '</p>' +
                            '</div>' +
                            '<div class="text-center">' +
                                '<p class="text-2xl font-bold">' + game.score + '</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                ).join('');
            }
            
            lucide.createIcons();
        }

        // Exibir jogos futuros
        function displayFutureGames() {
            const container = document.getElementById('futureGames');
            
            if (futureGames.length === 0) {
                container.innerHTML = 
                    '<div class="text-center text-gray-400 py-8">' +
                        '<i data-lucide="calendar" class="w-8 h-8 mx-auto mb-2"></i>' +
                        '<p>Sem jogos futuros disponíveis</p>' +
                    '</div>';
            } else {
                container.innerHTML = futureGames.slice(0, 10).map(game => 
                    '<div class="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">' +
                        '<div class="flex items-center justify-between mb-2">' +
                            '<span class="text-xs text-gray-400">' + game.league + '</span>' +
                            '<span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">' + game.time + '</span>' +
                        '</div>' +
                        '<div class="flex items-center justify-between">' +
                            '<div class="flex-1">' +
                                '<p class="font-medium">' + game.homeTeam + '</p>' +
                                '<p class="text-sm text-gray-400">vs</p>' +
                                '<p class="font-medium">' + game.awayTeam + '</p>' +
                            '</div>' +
                            '<div class="text-center">' +
                                '<p class="text-sm text-gray-400">Futuro</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                ).join('');
            }
            
            lucide.createIcons();
        }

        // Iniciar bot
        async function startBot() {
            try {
                const response = await fetch('/api/v1/bot/start', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    botStatus = 'running';
                    document.getElementById('botStatus').textContent = 'Ativo';
                    document.getElementById('botStatus').className = 'text-lg font-bold status-active';
                    addCommentatorLog('🤖 Bot iniciado com sucesso', 'success');
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                addCommentatorLog('❌ Erro ao iniciar bot: ' + error.message, 'error');
            }
        }

        // Parar bot
        async function stopBot() {
            try {
                const response = await fetch('/api/v1/bot/stop', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    botStatus = 'stopped';
                    document.getElementById('botStatus').textContent = 'Parado';
                    document.getElementById('botStatus').className = 'text-lg font-bold status-inactive';
                    addCommentatorLog('⏹️ Bot parado com sucesso', 'warning');
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                addCommentatorLog('❌ Erro ao parar bot: ' + error.message, 'error');
            }
        }

        // Adicionar log ao comentador
        function addCommentatorLog(message, type = 'info') {
            const container = document.getElementById('commentatorLogs');
            const timestamp = new Date().toLocaleString('pt-PT');
            const typeClass = type === 'success' ? 'text-green-400' : 
                             type === 'error' ? 'text-red-400' : 
                             type === 'warning' ? 'text-yellow-400' : 'text-blue-400';
            
            const logEntry = document.createElement('div');
            logEntry.className = 'text-sm ' + typeClass + ' mb-1';
            logEntry.innerHTML = '<span class="text-gray-500">[' + timestamp + ']</span> ' + message;
            
            container.appendChild(logEntry);
            container.scrollTop = container.scrollHeight;
        }

        // Limpar logs
        function clearLogs() {
            document.getElementById('commentatorLogs').innerHTML = 
                '<div class="text-green-400 text-sm">' +
                    '<span class="text-gray-500">[' + new Date().toLocaleString('pt-PT') + ']</span>' +
                    ' 🧹 Logs limpos' +
                '</div>';
        }

        // Atualizar última atualização
        function updateLastUpdate() {
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('pt-PT');
        }
    </script>
</body>
</html>`;
}
