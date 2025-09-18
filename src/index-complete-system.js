import { RBACSystem, UserManager, SubscriptionManager } from './rbac-system.js';

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

// Instâncias globais
const userManager = new UserManager();
const rbac = new RBACSystem();
const subscriptionManager = new SubscriptionManager();

// Sistema de armazenamento de dados
class DataStorage {
  constructor() {
    this.signals = [];
    this.botStatus = 'stopped';
    this.signalThreshold = 85;
    this.dailyReports = [];
  }

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
    
    if (filters.userId) {
      filtered = filtered.filter(s => s.userId === filters.userId);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getDailyStats(date = new Date().toISOString().split('T')[0]) {
    const dailySignals = this.getSignals({ date });
    const total = dailySignals.length;
    const greens = dailySignals.filter(s => s.status === 'green').length;
    const reds = dailySignals.filter(s => s.status === 'red').length;
    const pending = dailySignals.filter(s => s.status === 'pending').length;
    
    const accuracy = total > 0 ? ((greens / (greens + reds)) * 100).toFixed(1) : 0;
    
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

const storage = new DataStorage();

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
    
    const user = userManager.getUserById(payload.userId);
    return user && user.isActive ? user : null;
  } catch (error) {
    return null;
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
    // Rotas públicas
    if (path === '/api/v1/auth/login') {
      return await handleLoginAPI(request, env);
    }
    
    if (path === '/api/v1/auth/register') {
      return await handleRegisterAPI(request, env);
    }
    
    // Rotas que requerem autenticação
    const user = await authenticateUser(request);
    if (!user && !path.includes('/auth/')) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // APIs autenticadas
    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    
    if (path === '/api/v1/signals') {
      return await handleSignalsAPI(request, env, user);
    }
    
    if (path === '/api/v1/bot/control') {
      return await handleBotControlAPI(request, env, user);
    }
    
    if (path === '/api/v1/users') {
      return await handleUsersAPI(request, env, user);
    }
    
    if (path === '/api/v1/user/profile') {
      return await handleUserProfileAPI(request, env, user);
    }
    
    if (path === '/api/v1/subscription') {
      return await handleSubscriptionAPI(request, env, user);
    }
    
    if (path === '/api/v1/signal-update') {
      return await handleSignalUpdateAPI(request, env, user);
    }
    
    if (path === '/api/v1/daily-report') {
      return await handleDailyReportAPI(request, env, user);
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

// API para login
async function handleLoginAPI(request, env) {
  if (request.method === 'POST') {
    const { email, password } = await request.json();
    
    const user = userManager.getUserByEmail(email);
    if (user && user.password === password && user.isActive) {
      // Atualizar último login
      userManager.updateUser(user.id, { lastLogin: new Date().toISOString() });
      
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
          role: user.role,
          subscription: user.subscription,
          subscriptionExpiry: user.subscriptionExpiry
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

// API para registo
async function handleRegisterAPI(request, env) {
  if (request.method === 'POST') {
    const { email, password, name } = await request.json();
    
    // Verificar se email já existe
    if (userManager.getUserByEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Email já registado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    // Criar utilizador
    const user = userManager.createUser({
      email,
      password,
      name,
      role: 'user_trial',
      subscription: 'trial'
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Conta criada com sucesso',
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        subscription: user.subscription
      }
    }), {
      status: 201,
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

// API para sinais (com filtros por utilizador)
async function handleSignalsAPI(request, env, user) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const date = url.searchParams.get('date');
  
  let filters = { status, date };
  
  // Utilizadores normais só veem os próprios sinais
  if (!rbac.hasPermission(user.role, 'signals.read')) {
    filters.userId = user.id;
  }
  
  const signals = storage.getSignals(filters);
  
  return new Response(JSON.stringify(signals), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para controlo do bot (apenas admins)
async function handleBotControlAPI(request, env, user) {
  if (!rbac.canControlBot(user.role)) {
    return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
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

// API para gestão de utilizadores (apenas admins)
async function handleUsersAPI(request, env, user) {
  if (!rbac.canManageUsers(user.role)) {
    return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'GET') {
    const users = userManager.getAllUsers();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'POST') {
    const userData = await request.json();
    const newUser = userManager.createUser(userData);
    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'PUT') {
    const { id, ...updates } = await request.json();
    const updatedUser = userManager.updateUser(id, updates);
    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'DELETE') {
    const { id } = await request.json();
    const deletedUser = userManager.deleteUser(id);
    return new Response(JSON.stringify({ success: true, user: deletedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para perfil do utilizador
async function handleUserProfileAPI(request, env, user) {
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription,
      subscriptionExpiry: user.subscriptionExpiry,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'PUT') {
    const updates = await request.json();
    const updatedUser = userManager.updateUser(user.id, updates);
    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para subscrições
async function handleSubscriptionAPI(request, env, user) {
  if (request.method === 'GET') {
    const plan = subscriptionManager.getPlan(user.subscription);
    const upgradeOptions = subscriptionManager.getUpgradeOptions(user.subscription);
    
    return new Response(JSON.stringify({
      current: {
        plan: user.subscription,
        ...plan,
        expiry: user.subscriptionExpiry,
        isValid: userManager.isSubscriptionValid(user)
      },
      upgrades: upgradeOptions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  if (request.method === 'POST') {
    const { plan } = await request.json();
    const expiry = subscriptionManager.calculateExpiry(plan);
    const updatedUser = userManager.updateSubscription(user.id, plan, expiry);
    
    return new Response(JSON.stringify({ 
      success: true, 
      user: updatedUser 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para atualização de sinais
async function handleSignalUpdateAPI(request, env, user) {
  if (request.method === 'POST') {
    const { signalId, result, isWin } = await request.json();
    
    const updatedSignal = storage.updateSignal(signalId, result, isWin);
    
    if (updatedSignal) {
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

// API para relatório diário (apenas admins)
async function handleDailyReportAPI(request, env, user) {
  if (!rbac.canViewReports(user.role)) {
    return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
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

// API para estatísticas
async function handleStatsAPI(request, env, user) {
  let stats;
  
  if (rbac.hasPermission(user.role, 'reports.full')) {
    // Admin vê todas as estatísticas
    stats = {
      signals: storage.getDailyStats(),
      users: userManager.getUserStats(),
      system: {
        botStatus: storage.botStatus,
        threshold: storage.signalThreshold,
        totalSignals: storage.signals.length
      }
    };
  } else {
    // Utilizador vê apenas as próprias
    const userSignals = storage.getSignals({ userId: user.id });
    stats = {
      signals: {
        total: userSignals.length,
        greens: userSignals.filter(s => s.status === 'green').length,
        reds: userSignals.filter(s => s.status === 'red').length,
        pending: userSignals.filter(s => s.status === 'pending').length
      },
      subscription: {
        plan: user.subscription,
        isValid: userManager.isSubscriptionValid(user)
      }
    };
  }
  
  return new Response(JSON.stringify(stats), {
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

// HTML do Dashboard (versão simplificada para não exceder limite)
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Completo</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="h-full bg-gray-900">
    <div class="min-h-screen bg-gray-900 text-white">
        <header class="bg-gray-800 shadow-sm border-b border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <h1 class="text-xl font-bold">Alert@Postas - Sistema Completo</h1>
                    <div id="userControls" class="flex items-center space-x-4">
                        <span id="userInfo" class="text-sm text-gray-300"></span>
                        <button id="logoutBtn" class="text-sm text-red-400 hover:text-red-300">Sair</button>
                    </div>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div id="authSection" class="hidden">
                <div class="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md mx-auto">
                    <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
                    <form id="loginForm">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Email</label>
                            <input type="email" id="email" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" required>
                        </div>
                        <div class="mb-6">
                            <label class="block text-sm font-medium mb-2">Password</label>
                            <input type="password" id="password" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" required>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Entrar</button>
                    </form>
                    <p class="text-center text-sm text-gray-400 mt-4">
                        Super Admin: admin@alertapostas.pt / admin123
                    </p>
                </div>
            </div>

            <div id="dashboardSection" class="hidden">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Bot Controls -->
                    <div class="lg:col-span-3 bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 class="text-lg font-semibold mb-4">Controlo do Bot</h2>
                        <div class="flex flex-wrap gap-4">
                            <button id="startBot" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">🚀 Iniciar Bot</button>
                            <button id="stopBot" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">⏹️ Parar Bot</button>
                            <button id="analyzeGames" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">🔍 Analisar</button>
                            <span id="botStatus" class="flex items-center px-4 py-2 bg-gray-700 rounded-md">
                                Status: <span id="statusText">Parado</span>
                            </span>
                        </div>
                    </div>

                    <!-- Future Games -->
                    <div class="lg:col-span-2 bg-gray-800 rounded-lg shadow-sm p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-lg font-semibold">Jogos Futuros</h2>
                            <button id="refreshGames" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">🔄 Atualizar</button>
                        </div>
                        <div id="future-games-list" class="space-y-2">
                            <div class="text-center text-gray-400 py-4">Carregando...</div>
                        </div>
                    </div>

                    <!-- Signals -->
                    <div class="bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 class="text-lg font-semibold mb-4">Sinais Recentes</h2>
                        <div id="signals-list" class="space-y-2">
                            <div class="text-center text-gray-400 py-4">Carregando...</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        let authToken = null;
        let currentUser = null;

        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            setupEventListeners();
        });

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
                        showAuth();
                    }
                } catch (error) {
                    showAuth();
                }
            } else {
                showAuth();
            }
        }

        function showAuth() {
            document.getElementById('authSection').classList.remove('hidden');
            document.getElementById('dashboardSection').classList.add('hidden');
        }

        function showDashboard() {
            document.getElementById('authSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
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
            showAuth();
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
                    alert(data.message);
                    updateBotStatus();
                } else {
                    alert('Erro: ' + data.error);
                }
            } catch (error) {
                console.error('Bot action error:', error);
                alert('Erro na ação do bot');
            }
        }

        async function updateBotStatus() {
            try {
                const response = await fetch('/api/v1/bot/control', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const data = await response.json();
                document.getElementById('statusText').textContent = data.status === 'running' ? 'Ativo' : 'Parado';
            } catch (error) {
                console.error('Status update error:', error);
            }
        }

        async function loadData() {
            await Promise.all([
                loadFutureGames(),
                loadSignals(),
                updateBotStatus()
            ]);
        }

        async function loadFutureGames() {
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

        async function loadSignals() {
            try {
                const response = await fetch('/api/v1/signals', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const signals = await response.json();
                displaySignals(signals);
            } catch (error) {
                console.error('Error loading signals:', error);
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
                        <div class="font-semibold">\${game.home_team} vs \${game.away_team}</div>
                        <div class="text-sm text-gray-400">\${game.league} - \${gameDate} às \${gameTime}</div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displaySignals(signals) {
            const container = document.getElementById('signals-list');
            
            if (signals.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-4">Nenhum sinal</div>';
                return;
            }

            const signalsHtml = signals.slice(0, 5).map(signal => {
                const statusColor = signal.status === 'green' ? 'text-green-400' : 
                                  signal.status === 'red' ? 'text-red-400' : 'text-yellow-400';
                const statusIcon = signal.status === 'green' ? '✅' : 
                                 signal.status === 'red' ? '❌' : '⏳';
                
                return \`
                    <div class="p-3 bg-gray-700 rounded-lg">
                        <div class="flex justify-between items-start mb-1">
                            <div class="font-semibold text-sm">\${signal.home_team} vs \${signal.away_team}</div>
                            <span class="\${statusColor} text-xs">\${statusIcon} \${signal.status}</span>
                        </div>
                        <div class="text-xs text-gray-400">\${signal.module} - \${signal.prediction}</div>
                    </div>
                \`;
            }).join('');

            container.innerHTML = signalsHtml;
        }
    </script>
</body>
</html>`;
}
