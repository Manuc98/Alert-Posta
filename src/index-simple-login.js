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
      return new Response(getSimpleLoginHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // API de login
    if (path === '/api/v1/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        console.log('Login attempt:', { email, password });
        
        if (email === 'admin@alertapostas.pt' && password === 'Alert@Postas2025!') {
          const token = 'test-token-' + Date.now();
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

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }
};

function getSimpleLoginHTML() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Login Simples</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
</head>
<body class="bg-black min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full mx-4">
        <div class="bg-gray-800 rounded-lg shadow-xl p-8">
            <div class="text-center mb-6">
                <h1 class="text-3xl font-bold text-blue-400">Alert@Postas</h1>
                <p class="text-gray-400 mt-2">Sistema de Sinais Profissional</p>
            </div>
            
            <form id="loginForm">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Email</label>
                    <input type="email" id="email" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="admin@alertapostas.pt" required>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Password</label>
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
        
        <div id="dashboard" class="hidden bg-gray-800 rounded-lg shadow-xl p-8 mt-4">
            <div class="text-center">
                <h2 class="text-2xl font-bold text-green-400 mb-4">✅ Login Bem-sucedido!</h2>
                <p class="text-gray-300">Bem-vindo ao Alert@Postas</p>
                <div id="userInfo" class="mt-4 p-4 bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-300">Carregando informações do utilizador...</p>
                </div>
                <button id="logoutBtn" class="mt-4 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">
                    🚪 Logout
                </button>
            </div>
        </div>
    </div>

    <script>
        let authToken = null;
        let currentUser = null;

        document.addEventListener('DOMContentLoaded', function() {
            console.log('Página carregada');
            setupEventListeners();
        });

        function setupEventListeners() {
            console.log('Configurando event listeners');
            
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Formulário de login enviado');
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                console.log('Tentando login com:', { email, password: '***' });
                login(email, password);
            });

            document.getElementById('logoutBtn').addEventListener('click', function() {
                console.log('Logout clicado');
                logout();
            });
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
            
            document.getElementById('loginForm').parentElement.parentElement.classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            
            document.getElementById('userInfo').innerHTML = 
                '<p class="text-sm text-gray-300">' +
                '<strong>Email:</strong> ' + currentUser.email + '<br>' +
                '<strong>Nome:</strong> ' + currentUser.full_name + '<br>' +
                '<strong>Role:</strong> ' + currentUser.role.toUpperCase() +
                '</p>';
        }

        function logout() {
            console.log('Fazendo logout');
            
            authToken = null;
            currentUser = null;
            
            document.getElementById('dashboard').classList.add('hidden');
            document.getElementById('loginForm').parentElement.parentElement.classList.remove('hidden');
        }
    </script>
</body>
</html>`;
}
