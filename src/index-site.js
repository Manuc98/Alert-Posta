export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS Headers
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: { ...CORS_HEADERS } 
      })
    }

    // Se for um ficheiro estático (JS, CSS, etc.), retornar 404
    if (path.includes('.') && path !== '/') {
      return new Response('Not Found', {
        status: 404,
        headers: { ...CORS_HEADERS }
      })
    }

    try {
      // Servir HTML apenas para rotas da aplicação
      const html = `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alert@Postas - Sistema de Apostas</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: white;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        text-align: center;
      }
      .header {
        margin-bottom: 40px;
      }
      .header h1 {
        font-size: 3rem;
        margin-bottom: 10px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }
      .header p {
        font-size: 1.2rem;
        opacity: 0.9;
      }
      .nav {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        margin: 40px 0;
      }
      .nav-item {
        background: rgba(255,255,255,0.1);
        padding: 15px 25px;
        border-radius: 10px;
        text-decoration: none;
        color: white;
        font-weight: 500;
        transition: all 0.3s ease;
        border: 2px solid transparent;
      }
      .nav-item:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
        transform: translateY(-2px);
      }
      .feature {
        background: rgba(255,255,255,0.1);
        padding: 30px;
        border-radius: 15px;
        margin: 20px 0;
        backdrop-filter: blur(10px);
      }
      .status {
        background: rgba(76, 175, 80, 0.2);
        border: 2px solid #4CAF50;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🤖 Alert@Postas</h1>
        <p>Sistema Inteligente de Análise de Apostas</p>
      </div>

      <div class="status">
        <h2>✅ Sistema Online</h2>
        <p>Worker Cloudflare funcionando corretamente</p>
      </div>

      <div class="nav">
        <a href="/bot-control" class="nav-item">🤖 Controlo do Bot</a>
        <a href="/historico" class="nav-item">📊 Histórico</a>
        <a href="/notificacoes" class="nav-item">🔔 Notificações</a>
        <a href="/logs" class="nav-item">📋 Logs</a>
        <a href="/subscricao" class="nav-item">💳 Subscrição</a>
        <a href="/admin" class="nav-item">👑 Admin</a>
        <a href="/configuracoes" class="nav-item">⚙️ Configurações</a>
      </div>

      <div class="feature">
        <h3>🚀 Próximos Passos</h3>
        <p>Implementar componentes React e funcionalidades específicas</p>
      </div>
    </div>
  </body>
</html>`

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...CORS_HEADERS
        }
      })

    } catch (error) {
      console.error('Erro no servidor:', error)
      return new Response('Erro interno do servidor: ' + error.message, {
        status: 500,
        headers: { ...CORS_HEADERS }
      })
    }
  }
}
