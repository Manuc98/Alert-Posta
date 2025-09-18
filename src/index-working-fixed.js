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

    // Rotas principais
    if (path === '/' || path === '/dashboard') {
      return new Response(getFixedDashboardHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // API de login
    if (path === '/api/v1/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        console.log('Login attempt:', { email, password });
        
        if (email === 'admin@alertapostas.pt' && password === 'Alert@Postas2025!') {
          const token = 'fixed-token-' + Date.now();
          console.log('Login successful');
          
          return new Response(JSON.stringify({ 
            success: true, 
            access_token: token,
            user: { 
              id: 'admin-1', 
              email: email,
              username: 'super_admin',
              full_name: 'Super Admin Alert@Postas',
              role: 'super_admin',
              is_active: true,
              is_verified: true
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        
        console.log('Login failed - invalid credentials');
        return new Response(JSON.stringify({ success: false, error: 'Credenciais inválidas' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro interno' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // API para jogos futuros (simplificada)
    if (path === '/api/v1/future-games' && request.method === 'GET') {
      try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const mockGames = [
          {
            id: 1,
            home_team: 'Real Madrid',
            away_team: 'Barcelona',
            league: 'La Liga',
            country: 'Espanha',
            date: tomorrow.toISOString(),
            status: 'NS'
          },
          {
            id: 2,
            home_team: 'Manchester City',
            away_team: 'Liverpool',
            league: 'Premier League',
            country: 'Inglaterra',
            date: tomorrow.toISOString(),
            status: 'NS'
          }
        ];

        return new Response(JSON.stringify(mockGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // API para jogos ao vivo (simplificada)
    if (path === '/api/v1/live-games' && request.method === 'GET') {
      try {
        const mockLiveGames = [
          {
            id: 3,
            home_team: 'PSG',
            away_team: 'Marseille',
            league: 'Ligue 1',
            country: 'França',
            date: new Date().toISOString(),
            status: 'LIVE',
            home_score: 1,
            away_score: 0,
            minute: 67
          }
        ];

        return new Response(JSON.stringify(mockLiveGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // API para comentador (simplificada)
    if (path === '/api/v1/commentator' && request.method === 'GET') {
      try {
        const logs = [
          { timestamp: new Date().toISOString(), message: '🎯 Sistema Alert@Postas iniciado com sucesso', type: 'success' },
          { timestamp: new Date().toISOString(), message: '👤 Utilizador autenticado: SUPER_ADMIN', type: 'info' },
          { timestamp: new Date().toISOString(), message: '🔍 Carregando dados do sistema...', type: 'info' }
        ];

        return new Response(JSON.stringify(logs), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }
};

function getFixedDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Dashboard Fixo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
</head>
<body class="bg-black min-h-screen">
    <!-- Modal de Login -->
    <div id="authModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="max-w-md w-full mx-4">
            <div class="bg-gray-800 rounded-lg shadow-xl p-8">
                <div class="text-center mb-6">
                    <h1 class="text-3xl font-bold text-blue-400">Alert@Postas</h1>
                    <p class="text-gray-400 mt-2">Sistema de Sinais Profissional</p>
                </div>
                
                <form id="loginForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2 text-white">Email</label>
                        <input type="email" id="email" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="admin@alertapostas.pt" required>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2 text-white">Password</label>
                        <input type="password" id="password" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="Alert@Postas2025!" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        🔐 Entrar no Sistema
                    </button>
                </form>
                
                <div class="mt-6 p-4 bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-300">
                        <strong>Credenciais Pré-preenchidas:</strong><br>
                        Email: admin@alertapostas.pt<br>
                        Password: Alert@Postas2025!
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Dashboard -->
    <div id="dashboard" class="hidden min-h-screen bg-black text-white">
        <!-- Header -->
        <header class="bg-gray-800 shadow-sm border-b border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <h1 class="text-xl font-bold text-blue-400">Alert@Postas - Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <span id="userRole" class="px-2 py-1 text-xs rounded-full bg-blue-600 text-white">SUPER_ADMIN</span>
                            <span id="userInfo" class="text-sm text-gray-300">admin@alertapostas.pt</span>
                        </div>
                        <button id="logoutBtn" class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm">
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Botões de Controlo -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 class="text-lg font-semibold mb-4">🤖 Controlo do Bot</h2>
                    <div class="space-y-3">
                        <button id="startBotBtn" class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                            ▶️ Iniciar Bot
                        </button>
                        <button id="stopBotBtn" class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">
                            ⏹️ Parar Bot
                        </button>
                        <button id="analyzeBtn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            🔍 Analisar Jogos
                        </button>
                        <div class="text-center">
                            <span class="text-sm text-gray-400">
                                Status: <span id="statusText" class="ml-2 text-yellow-400">Parado</span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Jogos ao Vivo -->
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

                <!-- Painel do Comentador -->
                <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold">📺 Painel do Comentador</h2>
                        <button id="refreshCommentator" class="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm">
                            🔄 Atualizar
                        </button>
                    </div>
                    <div id="commentator-logs" class="bg-black rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
                        <div class="text-gray-400">Carregando logs...</div>
                    </div>
                </div>
            </div>

            <!-- Jogos Futuros -->
            <div class="bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">📅 Jogos Futuros</h2>
                    <button id="refreshFutureGames" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm">
                        🔄 Atualizar
                    </button>
                </div>
                <div id="future-games-list" class="space-y-2 max-h-96 overflow-y-auto">
                    <div class="text-center text-gray-400 py-4">Carregando jogos futuros...</div>
                </div>
            </div>

            <!-- Sinais Enviados -->
            <div class="bg-gray-800 rounded-lg shadow-sm p-6">
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
        </main>
    </div>

    <script>
        let authToken = null;
        let currentUser = null;

        document.addEventListener('DOMContentLoaded', function() {
            console.log('Página carregada - versão fixa');
            setupEventListeners();
            loadLiveGames();
            loadFutureGames();
            loadCommentatorLogs();
        });

        function setupEventListeners() {
            console.log('Configurando event listeners');
            
            // Login
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    console.log('Formulário de login enviado');
                    
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    console.log('Tentando login com:', { email, password: '***' });
                    login(email, password);
                });
            }

            // Logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    console.log('Logout clicado');
                    logout();
                });
            }

            // Botões do bot
            const startBotBtn = document.getElementById('startBotBtn');
            if (startBotBtn) {
                startBotBtn.addEventListener('click', function() {
                    console.log('Iniciar bot clicado');
                    document.getElementById('statusText').textContent = 'Ativo';
                    document.getElementById('statusText').className = 'ml-2 text-green-400';
                    addCommentatorLog('🤖 Bot iniciado com sucesso', 'success');
                });
            }

            const stopBotBtn = document.getElementById('stopBotBtn');
            if (stopBotBtn) {
                stopBotBtn.addEventListener('click', function() {
                    console.log('Parar bot clicado');
                    document.getElementById('statusText').textContent = 'Parado';
                    document.getElementById('statusText').className = 'ml-2 text-yellow-400';
                    addCommentatorLog('⏹️ Bot parado', 'warning');
                });
            }

            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', function() {
                    console.log('Analisar jogos clicado');
                    addCommentatorLog('🔍 Analisando jogos disponíveis...', 'info');
                    setTimeout(() => {
                        addCommentatorLog('✅ Análise concluída - 3 jogos analisados', 'success');
                    }, 2000);
                });
            }

            // Botões de refresh
            const refreshLiveGames = document.getElementById('refreshLiveGames');
            if (refreshLiveGames) {
                refreshLiveGames.addEventListener('click', loadLiveGames);
            }

            const refreshFutureGames = document.getElementById('refreshFutureGames');
            if (refreshFutureGames) {
                refreshFutureGames.addEventListener('click', loadFutureGames);
            }

            const refreshCommentator = document.getElementById('refreshCommentator');
            if (refreshCommentator) {
                refreshCommentator.addEventListener('click', loadCommentatorLogs);
            }

            const clearSignals = document.getElementById('clearSignals');
            if (clearSignals) {
                clearSignals.addEventListener('click', function() {
                    document.getElementById('signals-list').innerHTML = '<div class="text-gray-400">Nenhum sinal enviado</div>';
                    addCommentatorLog('🗑️ Sinais limpos', 'info');
                });
            }
        }

        async function login(email, password) {
            try {
                console.log('Iniciando processo de login...');
                
                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                console.log('Resposta recebida:', response.status);
                
                if (!response.ok) {
                    throw new Error('Erro HTTP: ' + response.status);
                }
                
                const data = await response.json();
                console.log('Dados da resposta:', data);
                
                if (data.success) {
                    authToken = data.access_token;
                    currentUser = data.user;
                    
                    console.log('Login bem-sucedido!');
                    console.log('Token:', authToken);
                    console.log('Usuário:', currentUser);
                    
                    showDashboard();
                } else {
                    console.error('Login falhou:', data.error);
                    alert('❌ ' + data.error);
                }
            } catch (error) {
                console.error('Erro no login:', error);
                alert('❌ Erro no login: ' + error.message);
            }
        }

        function showDashboard() {
            console.log('Mostrando dashboard');
            
            document.getElementById('authModal').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            
            if (currentUser) {
                document.getElementById('userInfo').textContent = currentUser.email;
                document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
            }
        }

        function logout() {
            console.log('Fazendo logout');
            
            authToken = null;
            currentUser = null;
            
            document.getElementById('dashboard').classList.add('hidden');
            document.getElementById('authModal').classList.remove('hidden');
        }

        async function loadLiveGames() {
            try {
                const response = await fetch('/api/v1/live-games');
                const games = await response.json();
                displayLiveGames(games);
            } catch (error) {
                console.error('Erro ao carregar jogos ao vivo:', error);
                document.getElementById('live-games-list').innerHTML = '<div class="text-center text-red-400 py-4">Erro ao carregar jogos ao vivo</div>';
            }
        }

        async function loadFutureGames() {
            try {
                const response = await fetch('/api/v1/future-games');
                const games = await response.json();
                displayFutureGames(games);
            } catch (error) {
                console.error('Erro ao carregar jogos futuros:', error);
                document.getElementById('future-games-list').innerHTML = '<div class="text-center text-red-400 py-4">Erro ao carregar jogos futuros</div>';
            }
        }

        async function loadCommentatorLogs() {
            try {
                const response = await fetch('/api/v1/commentator');
                const logs = await response.json();
                displayCommentatorLogs(logs);
            } catch (error) {
                console.error('Erro ao carregar logs do comentador:', error);
                document.getElementById('commentator-logs').innerHTML = '<div class="text-gray-400">Erro ao carregar logs</div>';
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
                        '<div class="bg-red-600 text-white px-2 py-1 rounded text-xs">' + game.minute + "'</div>" +
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

        function displayFutureGames(games) {
            const container = document.getElementById('future-games-list');
            
            if (!games || games.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-8">' +
                    '<div class="text-4xl mb-2">📅</div>' +
                    '<p class="text-lg font-medium">Sem jogos futuros</p>' +
                    '<p class="text-sm">Não há jogos agendados</p>' +
                    '</div>';
                return;
            }

            const gamesHtml = games.map(game => {
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                
                return '<div class="p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700/70 transition-colors">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<div class="font-semibold text-sm text-white">' + game.home_team + ' vs ' + game.away_team + '</div>' +
                        '<div class="bg-blue-600 text-white px-2 py-1 rounded text-xs">FUTURO</div>' +
                    '</div>' +
                    '<div class="text-xs text-gray-300 mb-2">' + game.league + ' • ' + game.country + '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<div class="text-sm text-gray-400">' + gameDate + ' às ' + gameTime + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displayCommentatorLogs(logs) {
            const container = document.getElementById('commentator-logs');
            
            if (!logs || logs.length === 0) {
                container.innerHTML = '<div class="text-gray-400">Nenhum log disponível</div>';
                return;
            }

            const logsHtml = logs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString('pt-PT');
                const typeClass = log.type === 'success' ? 'text-green-400' : 
                                 log.type === 'warning' ? 'text-yellow-400' : 
                                 log.type === 'error' ? 'text-red-400' : 'text-blue-400';
                
                return '<div class="mb-1">' +
                    '<span class="text-gray-500">[' + time + ']</span> ' +
                    '<span class="' + typeClass + '">' + log.message + '</span>' +
                '</div>';
            }).join('');

            container.innerHTML = logsHtml;
        }

        function addCommentatorLog(message, type = 'info') {
            const container = document.getElementById('commentator-logs');
            const time = new Date().toLocaleTimeString('pt-PT');
            const typeClass = type === 'success' ? 'text-green-400' : 
                             type === 'warning' ? 'text-yellow-400' : 
                             type === 'error' ? 'text-red-400' : 'text-blue-400';
            
            const newLog = '<div class="mb-1">' +
                '<span class="text-gray-500">[' + time + ']</span> ' +
                '<span class="' + typeClass + '">' + message + '</span>' +
            '</div>';
            
            container.innerHTML = newLog + container.innerHTML;
        }
    </script>
</body>
</html>`;
}
