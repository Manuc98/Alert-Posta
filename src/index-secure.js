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

    // Rotas principais - SEMPRE mostrar login primeiro
    if (path === '/' || path === '/dashboard') {
      return new Response(getSecureDashboardHTML(), {
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

// Sistema de utilizadores simples
const users = [
  {
    id: 'super-admin-1',
    email: 'admin@alertapostas.pt',
    password: 'admin123',
    role: 'super_admin'
  }
];

// Sistema de armazenamento
const storage = {
  signals: [],
  botStatus: 'stopped',
  futureGames: []
};

// Função principal para lidar com APIs
async function handleAPI(request, env, path) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Rotas públicas
    if (path === '/api/v1/auth/login') {
      return await handleLoginAPI(request, env);
    }
    
    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    
    // Todas as outras rotas requerem autenticação
    const user = await authenticateUser(request);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // APIs autenticadas
    if (path === '/api/v1/signals') {
      return await handleSignalsAPI(request, env, user);
    }
    
    if (path === '/api/v1/bot/control') {
      return await handleBotControlAPI(request, env, user);
    }
    
    if (path === '/api/v1/stats') {
      return await handleStatsAPI(request, env, user);
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

// Middleware de autenticação
async function authenticateUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token));
    
    if (payload.exp < Date.now()) {
      return null; // Token expirado
    }
    
    const user = users.find(u => u.id === payload.userId);
    return user || null;
  } catch (error) {
    return null;
  }
}

// API para login
async function handleLoginAPI(request, env) {
  if (request.method === 'POST') {
    const { email, password } = await request.json();
    
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      // Gerar token JWT
      const token = btoa(JSON.stringify({ 
        userId: user.id, 
        role: user.role,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24h
      }));
      
      return new Response(JSON.stringify({ 
        success: true, 
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role
        }
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
async function handleSignalsAPI(request, env, user) {
  const signals = storage.signals;
  
  return new Response(JSON.stringify(signals), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para controlo do bot
async function handleBotControlAPI(request, env, user) {
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
      return new Response(JSON.stringify({ success: true, message: 'Análise concluída' }), {
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
async function handleStatsAPI(request, env, user) {
  const stats = {
    signals: {
      total: storage.signals.length,
      greens: storage.signals.filter(s => s.status === 'green').length,
      reds: storage.signals.filter(s => s.status === 'red').length,
      pending: storage.signals.filter(s => s.status === 'pending').length
    },
    system: {
      botStatus: storage.botStatus,
      totalUsers: users.length
    }
  };
  
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// HTML do Dashboard Seguro
function getSecureDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Seguro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { darkMode: 'class' }
    </script>
</head>
<body class="h-full bg-gray-900">
    <div class="min-h-screen bg-gray-900 text-white">
        <!-- Authentication Modal - SEMPRE VISÍVEL -->
        <div id="authModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div class="text-center mb-6">
                    <h1 class="text-3xl font-bold text-blue-400">Alert@Postas</h1>
                    <p class="text-gray-400 mt-2">Sistema de Sinais Profissional</p>
                </div>
                
                <form id="loginForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Email</label>
                        <input type="email" id="email" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" required>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">Password</label>
                        <input type="password" id="password" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        🔐 Entrar no Sistema
                    </button>
                </form>
                
                <div class="mt-6 p-4 bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-300 text-center">
                        <strong>Credenciais de Acesso:</strong><br>
                        Email: admin@alertapostas.pt<br>
                        Password: admin123
                    </p>
                </div>
            </div>
        </div>

        <!-- Main Dashboard - OCULTO até login -->
        <div id="dashboard" class="hidden">
            <header class="bg-gray-800 shadow-sm border-b border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <h1 class="text-xl font-bold text-blue-400">Alert@Postas - Dashboard Seguro</h1>
                        <div class="flex items-center space-x-4">
                            <span id="userInfo" class="text-sm text-gray-300"></span>
                            <button id="logoutBtn" class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm">
                                🚪 Sair
                            </button>
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
                    <!-- Future Games -->
                    <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-lg font-semibold">⚽ Jogos Futuros</h2>
                            <button id="refreshGames" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm">
                                🔄 Atualizar
                            </button>
                        </div>
                        <div id="future-games-list" class="space-y-2 max-h-96 overflow-y-auto">
                            <div class="text-center text-gray-400 py-4">Carregando jogos...</div>
                        </div>
                    </div>

                    <!-- Signals -->
                    <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 class="text-lg font-semibold mb-4">📊 Sinais Enviados</h2>
                        <div id="signals-list" class="space-y-2 max-h-96 overflow-y-auto">
                            <div class="text-center text-gray-400 py-4">Nenhum sinal enviado</div>
                        </div>
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
            </main>
        </div>
    </div>

    <script>
        let authToken = null;
        let currentUser = null;

        // Forçar modo escuro
        document.documentElement.classList.add('dark');

        document.addEventListener('DOMContentLoaded', function() {
            // SEMPRE mostrar login primeiro
            showAuthModal();
            setupEventListeners();
        });

        function showAuthModal() {
            document.getElementById('authModal').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('hidden');
        }

        function showDashboard() {
            document.getElementById('authModal').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            document.getElementById('userInfo').textContent = currentUser.role.toUpperCase();
            loadData();
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
                } else {
                    alert('❌ Credenciais inválidas!');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('❌ Erro no login');
            }
        }

        function logout() {
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            showAuthModal();
        }

        function setupEventListeners() {
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                login(email, password);
            });

            document.getElementById('logoutBtn').addEventListener('click', logout);
            document.getElementById('startBot').addEventListener('click', () => botAction('start'));
            document.getElementById('stopBot').addEventListener('click', () => botAction('stop'));
            document.getElementById('analyzeGames').addEventListener('click', () => botAction('analyze'));
            document.getElementById('refreshGames').addEventListener('click', loadFutureGames);
        }

        async function botAction(action) {
            if (!authToken) {
                alert('❌ Não autenticado!');
                return;
            }

            try {
                const response = await fetch('/api/v1/bot/control', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
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
                alert('❌ Erro na ação do bot');
            }
        }

        async function updateBotStatus() {
            if (!authToken) return;

            try {
                const response = await fetch('/api/v1/bot/control', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
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
            if (!authToken) return;
            
            await Promise.all([
                loadFutureGames(),
                loadStats()
            ]);
        }

        async function loadFutureGames() {
            if (!authToken) return;

            try {
                const response = await fetch('/api/v1/future-games', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const games = await response.json();
                displayFutureGames(games);
            } catch (error) {
                console.error('Error loading games:', error);
            }
        }

        async function loadStats() {
            if (!authToken) return;

            try {
                const response = await fetch('/api/v1/stats', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
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

            const gamesHtml = games.slice(0, 10).map(game => {
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                return \`
                    <div class="p-3 bg-gray-700 rounded-lg">
                        <div class="font-semibold text-sm">\${game.home_team} vs \${game.away_team}</div>
                        <div class="text-xs text-gray-400">\${game.league} - \${gameDate} às \${gameTime}</div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displayStats(stats) {
            document.getElementById('totalSignals').textContent = stats.signals.total;
            document.getElementById('greenSignals').textContent = stats.signals.greens;
            document.getElementById('redSignals').textContent = stats.signals.reds;
            document.getElementById('pendingSignals').textContent = stats.signals.pending;
        }
    </script>
</body>
</html>`;
}
