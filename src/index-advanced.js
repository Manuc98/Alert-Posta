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

    // Rotas principais
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
  }
};

// Função principal para lidar com APIs
async function handleAPI(request, env, path) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    
    if (path === '/api/v1/signals') {
      return await handleSignalsAPI(request, env);
    }
    
    if (path === '/api/v1/bot/control') {
      return await handleBotControlAPI(request, env);
    }
    
    if (path === '/api/v1/auth/login') {
      return await handleLoginAPI(request, env);
    }
    
    if (path === '/api/v1/users') {
      return await handleUsersAPI(request, env);
    }
    
    if (path === '/api/v1/signal-update') {
      return await handleSignalUpdateAPI(request, env);
    }
    
    if (path === '/api/v1/daily-report') {
      return await handleDailyReportAPI(request, env);
    }

    return new Response('API endpoint not found', { status: 404, headers: CORS_HEADERS });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Sistema de armazenamento de dados
class DataStorage {
  constructor() {
    this.signals = [];
    this.users = [
      {
        id: 'super-admin-1',
        email: 'admin@alertapostas.pt',
        password: 'admin123',
        role: 'super_admin',
        subscription: 'active',
        createdAt: new Date().toISOString()
      }
    ];
    this.botStatus = 'stopped';
    this.signalThreshold = 85; // Threshold padrão
  }

  // Sinais
  addSignal(signal) {
    signal.id = Date.now().toString();
    signal.status = 'pending';
    signal.createdAt = new Date().toISOString();
    signal.updatedAt = new Date().toISOString();
    this.signals.push(signal);
    return signal;
  }

  updateSignal(signalId, result, isWin) {
    const signal = this.signals.find(s => s.id === signalId);
    if (signal) {
      signal.result = result;
      signal.isWin = isWin;
      signal.status = isWin ? 'green' : 'red';
      signal.updatedAt = new Date().toISOString();
      signal.finalUpdate = `${isWin ? '✅ Green' : '❌ Red'} ⏰ ${new Date().toLocaleTimeString('pt-PT')}`;
    }
    return signal;
  }

  getSignals(filters = {}) {
    let filtered = this.signals;
    
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    
    if (filters.date) {
      filtered = filtered.filter(s => s.createdAt.startsWith(filters.date));
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Usuários
  getUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  createUser(userData) {
    const user = {
      id: Date.now().toString(),
      ...userData,
      role: userData.role || 'user_premium',
      subscription: userData.subscription || 'trial',
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  // Estatísticas
  getDailyStats(date = new Date().toISOString().split('T')[0]) {
    const dailySignals = this.getSignals({ date });
    const total = dailySignals.length;
    const greens = dailySignals.filter(s => s.status === 'green').length;
    const reds = dailySignals.filter(s => s.status === 'red').length;
    const pending = dailySignals.filter(s => s.status === 'pending').length;
    
    const accuracy = total > 0 ? ((greens / (greens + reds)) * 100).toFixed(1) : 0;
    
    // Breakdown por mercado
    const breakdown = {};
    dailySignals.forEach(signal => {
      if (!breakdown[signal.module]) {
        breakdown[signal.module] = { total: 0, greens: 0, reds: 0 };
      }
      breakdown[signal.module].total++;
      if (signal.status === 'green') breakdown[signal.module].greens++;
      if (signal.status === 'red') breakdown[signal.module].reds++;
    });
    
    return {
      total,
      greens,
      reds,
      pending,
      accuracy: parseFloat(accuracy),
      breakdown
    };
  }
}

// Instância global de armazenamento
const storage = new DataStorage();

// API para jogos futuros
async function handleFutureGamesAPI(request, env) {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const from = today.toISOString().split('T')[0];
    const to = next7Days.toISOString().split('T')[0];

    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?from=${from}&to=${to}&status=NS`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const data = await response.json();
    const futureGames = data.response ? data.response.map(fixture => ({
      id: fixture.fixture.id,
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      league: fixture.league.name,
      league_id: fixture.league.id,
      date: fixture.fixture.date,
      country: fixture.league.country
    })) : [];

    return new Response(JSON.stringify(futureGames), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Error fetching future games:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para sinais
async function handleSignalsAPI(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const date = url.searchParams.get('date');
  
  const signals = storage.getSignals({ status, date });
  
  return new Response(JSON.stringify(signals), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para controlo do bot
async function handleBotControlAPI(request, env) {
  if (request.method === 'POST') {
    const { action } = await request.json();
    
    if (action === 'start') {
      storage.botStatus = 'running';
      return new Response(JSON.stringify({ success: true, message: 'Bot iniciado com sucesso' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'stop') {
      storage.botStatus = 'stopped';
      return new Response(JSON.stringify({ success: true, message: 'Bot parado com sucesso' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'analyze') {
      // Simular análise sem enviar sinais
      return new Response(JSON.stringify({ success: true, message: 'Análise concluída (sem envio de sinais)' }), {
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

// API para login
async function handleLoginAPI(request, env) {
  if (request.method === 'POST') {
    const { email, password } = await request.json();
    
    const user = storage.getUserByEmail(email);
    if (user && user.password === password) {
      // Gerar token JWT simples
      const token = btoa(JSON.stringify({ 
        userId: user.id, 
        role: user.role,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24h
      }));
      
      return new Response(JSON.stringify({ 
        success: true, 
        token,
        user: { id: user.id, email: user.email, role: user.role }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    return new Response(JSON.stringify({ success: false, error: 'Credenciais inválidas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para atualização de sinais
async function handleSignalUpdateAPI(request, env) {
  if (request.method === 'POST') {
    const { signalId, result, isWin } = await request.json();
    
    const updatedSignal = storage.updateSignal(signalId, result, isWin);
    
    if (updatedSignal) {
      // Enviar atualização para Telegram
      await sendTelegramUpdate(updatedSignal, env);
      
      return new Response(JSON.stringify({ success: true, signal: updatedSignal }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    return new Response(JSON.stringify({ success: false, error: 'Sinal não encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para relatório diário
async function handleDailyReportAPI(request, env) {
  const stats = storage.getDailyStats();
  
  let reportMessage = `📊 *RELATÓRIO DIÁRIO ALERT@POSTAS*
${new Date().toLocaleDateString('pt-PT')}

🎯 *RESUMO GERAL:*
• Total de Sinais: ${stats.total}
• ✅ Greens: ${stats.greens}
• ❌ Reds: ${stats.reds}
• ⏳ Pendentes: ${stats.pending}
• 🎯 Taxa de Acerto: ${stats.accuracy}%

📈 *BREAKDOWN POR MERCADO:*`;

  for (const [module, moduleStats] of Object.entries(stats.breakdown)) {
    const moduleAccuracy = moduleStats.total > 0 ? 
      ((moduleStats.greens / (moduleStats.greens + moduleStats.reds)) * 100).toFixed(1) : 0;
    
    reportMessage += `\n• ${module}: ${moduleStats.greens}G/${moduleStats.reds}R (${moduleAccuracy}%)`;
  }

  reportMessage += `\n\n💪 *Confiança em si mesmo: ${stats.accuracy}%*`;

  await sendTelegramMessage(reportMessage, env);
  
  return new Response(JSON.stringify({ success: true, report: stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// Função para enviar atualização de sinal para Telegram
async function sendTelegramUpdate(signal, env) {
  const updateMessage = `🔄 *ATUALIZAÇÃO DE SINAL*

${signal.finalUpdate}

📊 *Detalhes:*
• Jogo: ${signal.home_team} vs ${signal.away_team}
• Mercado: ${signal.module}
• Previsão: ${signal.prediction}
• Confiança: ${signal.confidence}%`;

  await sendTelegramMessage(updateMessage, env);
}

// Função para enviar mensagem para Telegram
async function sendTelegramMessage(message, env) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_GROUP_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar para Telegram:', error);
    return false;
  }
}

// HTML do Dashboard
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Avançado</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }
                    }
                }
            }
        }
    </script>
</head>
<body class="h-full bg-gray-50 dark:bg-gray-900">
    <!-- Authentication Modal -->
    <div id="authModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Alert@Postas</h2>
            <form id="loginForm">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input type="email" id="email" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                    <input type="password" id="password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Entrar</button>
            </form>
        </div>
    </div>

    <!-- Main Dashboard -->
    <div id="dashboard" class="hidden min-h-screen bg-gray-50 dark:bg-gray-900">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Alert@Postas - Sistema Avançado</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button id="darkModeToggle" class="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                            </svg>
                        </button>
                        <span id="userInfo" class="text-sm text-gray-700 dark:text-gray-300"></span>
                        <button id="logoutBtn" class="text-sm text-red-600 hover:text-red-700">Sair</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Bot Controls -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Controlo do Bot</h2>
                <div class="flex flex-wrap gap-4">
                    <button id="startBot" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                        🚀 Iniciar Bot (Enviar Sinais)
                    </button>
                    <button id="stopBot" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        ⏹️ Parar Bot
                    </button>
                    <button id="analyzeGames" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        🔍 Analisar Jogos (Só Análise)
                    </button>
                    <span id="botStatus" class="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300">
                        Status: <span id="statusText">Parado</span>
                    </span>
                </div>
            </div>

            <!-- Signal Filters -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtros de Sinais</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Threshold de Confiança (%)</label>
                        <input type="number" id="confidenceThreshold" value="85" min="50" max="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                        <select id="signalStatusFilter" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                            <option value="">Todos</option>
                            <option value="pending">Pendentes</option>
                            <option value="green">Green</option>
                            <option value="red">Red</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mercado</label>
                        <select id="marketFilter" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                            <option value="">Todos</option>
                            <option value="Winner (1X2)">Winner (1X2)</option>
                            <option value="Next Goal">Next Goal</option>
                            <option value="Over/Under 2.5">Over/Under 2.5</option>
                            <option value="BTTS">BTTS</option>
                            <option value="Value Betting">Value Betting</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Future Games -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Jogos Futuros</h2>
                    <div class="flex gap-2">
                        <input type="text" id="gameSearch" placeholder="Pesquisar jogos..." class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                        <button id="refreshGames" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">🔄 Atualizar</button>
                    </div>
                </div>
                <div id="future-games-list" class="space-y-2">
                    <div class="text-center text-gray-500 dark:text-gray-400 py-4">Carregando jogos...</div>
                </div>
            </div>

            <!-- Signals -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sinais Enviados</h2>
                    <button id="refreshSignals" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">🔄 Atualizar</button>
                </div>
                <div id="signals-list" class="space-y-2">
                    <div class="text-center text-gray-500 dark:text-gray-400 py-4">Carregando sinais...</div>
                </div>
            </div>
        </main>
    </div>

    <script>
        // Global variables
        let authToken = null;
        let currentUser = null;
        let futureGames = [];
        let signals = [];

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            // Force dark mode
            document.documentElement.classList.add('dark');
            
            // Check authentication
            checkAuth();
            
            // Setup event listeners
            setupEventListeners();
        });

        // Authentication
        function checkAuth() {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token));
                    if (payload.exp > Date.now()) {
                        authToken = token;
                        currentUser = payload;
                        showDashboard();
                        loadData();
                    } else {
                        localStorage.removeItem('authToken');
                        showAuthModal();
                    }
                } catch (error) {
                    localStorage.removeItem('authToken');
                    showAuthModal();
                }
            } else {
                showAuthModal();
            }
        }

        function showAuthModal() {
            document.getElementById('authModal').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('hidden');
        }

        function showDashboard() {
            document.getElementById('authModal').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            document.getElementById('userInfo').textContent = currentUser.role.toUpperCase();
        }

        async function login(email, password) {
            try {
                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    authToken = data.token;
                    currentUser = data.user;
                    localStorage.setItem('authToken', authToken);
                    showDashboard();
                    loadData();
                } else {
                    alert('Credenciais inválidas');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Erro no login');
            }
        }

        function logout() {
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            showAuthModal();
        }

        // Event listeners
        function setupEventListeners() {
            // Login form
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                login(email, password);
            });

            // Logout
            document.getElementById('logoutBtn').addEventListener('click', logout);

            // Bot controls
            document.getElementById('startBot').addEventListener('click', () => botAction('start'));
            document.getElementById('stopBot').addEventListener('click', () => botAction('stop'));
            document.getElementById('analyzeGames').addEventListener('click', () => botAction('analyze'));

            // Refresh buttons
            document.getElementById('refreshGames').addEventListener('click', loadFutureGames);
            document.getElementById('refreshSignals').addEventListener('click', loadSignals);

            // Filters
            document.getElementById('signalStatusFilter').addEventListener('change', loadSignals);
            document.getElementById('marketFilter').addEventListener('change', loadSignals);
            document.getElementById('confidenceThreshold').addEventListener('change', updateThreshold);

            // Search
            document.getElementById('gameSearch').addEventListener('input', filterGames);

            // Dark mode toggle
            document.getElementById('darkModeToggle').addEventListener('click', function() {
                document.documentElement.classList.toggle('dark');
            });
        }

        // Bot actions
        async function botAction(action) {
            try {
                const response = await fetch('/api/v1/bot/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showNotification(data.message, 'success');
                    updateBotStatus();
                } else {
                    showNotification('Erro: ' + data.error, 'error');
                }
            } catch (error) {
                console.error('Bot action error:', error);
                showNotification('Erro na ação do bot', 'error');
            }
        }

        async function updateBotStatus() {
            try {
                const response = await fetch('/api/v1/bot/control');
                const data = await response.json();
                document.getElementById('statusText').textContent = data.status === 'running' ? 'Ativo' : 'Parado';
            } catch (error) {
                console.error('Status update error:', error);
            }
        }

        // Load data
        async function loadData() {
            await Promise.all([
                loadFutureGames(),
                loadSignals(),
                updateBotStatus()
            ]);
        }

        async function loadFutureGames() {
            try {
                const response = await fetch('/api/v1/future-games');
                futureGames = await response.json();
                displayFutureGames();
            } catch (error) {
                console.error('Error loading future games:', error);
                showNotification('Erro ao carregar jogos futuros', 'error');
            }
        }

        async function loadSignals() {
            try {
                const status = document.getElementById('signalStatusFilter').value;
                const url = status ? \`/api/v1/signals?status=\${status}\` : '/api/v1/signals';
                
                const response = await fetch(url);
                signals = await response.json();
                displaySignals();
            } catch (error) {
                console.error('Error loading signals:', error);
                showNotification('Erro ao carregar sinais', 'error');
            }
        }

        // Display functions
        function displayFutureGames() {
            const container = document.getElementById('future-games-list');
            
            if (futureGames.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">Sem jogos disponíveis</div>';
                return;
            }

            const gamesHtml = futureGames.map(game => {
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                return \`
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-900 dark:text-white">\${game.home_team} vs \${game.away_team}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">\${game.league} - \${gameDate} às \${gameTime}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="analyzeGame('\${game.id}')" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm">
                                🔍 Analisar
                            </button>
                        </div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displaySignals() {
            const container = document.getElementById('signals-list');
            
            if (signals.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum sinal encontrado</div>';
                return;
            }

            const signalsHtml = signals.map(signal => {
                const statusColor = signal.status === 'green' ? 'text-green-600' : 
                                  signal.status === 'red' ? 'text-red-600' : 'text-yellow-600';
                const statusIcon = signal.status === 'green' ? '✅' : 
                                 signal.status === 'red' ? '❌' : '⏳';
                
                return \`
                    <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex justify-between items-start mb-2">
                            <div class="font-semibold text-gray-900 dark:text-white">\${signal.home_team} vs \${signal.away_team}</div>
                            <span class="\${statusColor} font-medium">\${statusIcon} \${signal.status.toUpperCase()}</span>
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            \${signal.module} - \${signal.prediction} (\${signal.confidence}%)
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-500">
                            \${new Date(signal.createdAt).toLocaleString('pt-PT')}
                            \${signal.finalUpdate ? ' - ' + signal.finalUpdate : ''}
                        </div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = signalsHtml;
        }

        // Utility functions
        function filterGames() {
            const searchTerm = document.getElementById('gameSearch').value.toLowerCase();
            const filteredGames = futureGames.filter(game => 
                game.home_team.toLowerCase().includes(searchTerm) ||
                game.away_team.toLowerCase().includes(searchTerm) ||
                game.league.toLowerCase().includes(searchTerm)
            );
            
            const container = document.getElementById('future-games-list');
            if (filteredGames.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum jogo encontrado</div>';
                return;
            }

            const gamesHtml = filteredGames.map(game => {
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                return \`
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-900 dark:text-white">\${game.home_team} vs \${game.away_team}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">\${game.league} - \${gameDate} às \${gameTime}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="analyzeGame('\${game.id}')" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm">
                                🔍 Analisar
                            </button>
                        </div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = gamesHtml;
        }

        async function updateThreshold() {
            const threshold = document.getElementById('confidenceThreshold').value;
            // TODO: Implement threshold update
            showNotification(\`Threshold atualizado para \${threshold}%\`, 'info');
        }

        async function analyzeGame(gameId) {
            const game = futureGames.find(g => g.id.toString() === gameId.toString());
            if (!game) return;

            showNotification(\`Analisando \${game.home_team} vs \${game.away_team}...\`, 'info');
            
            // TODO: Implement game analysis
            // This would generate signals and send to Telegram
        }

        function showNotification(message, type = 'info') {
            // Simple notification - can be enhanced
            const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                info: 'bg-blue-500',
                warning: 'bg-yellow-500'
            };
            
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 \${colors[type]} text-white px-4 py-2 rounded-md shadow-lg z-50\`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    </script>
</body>
</html>`;
}
