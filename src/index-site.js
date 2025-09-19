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

    // Mapear rotas para ficheiros estáticos
    let filePath = path
    
    // Se for a raiz, servir index.html
    if (path === '/') {
      filePath = '/index.html'
    }
    
    // Se não tiver extensão, assumir que é uma rota do React Router
    if (!filePath.includes('.')) {
      filePath = '/index.html'
    }

    try {
      // Tentar servir o ficheiro estático
      const file = await env.ASSETS.fetch(new Request(new URL(filePath, request.url)))
      
      if (file.status === 404) {
        // Se não encontrar, servir index.html para React Router
        const indexFile = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)))
        
        return new Response(indexFile.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS
          }
        })
      }

      // Determinar Content-Type baseado na extensão
      let contentType = 'text/plain'
      if (filePath.endsWith('.html')) {
        contentType = 'text/html; charset=utf-8'
      } else if (filePath.endsWith('.css')) {
        contentType = 'text/css'
      } else if (filePath.endsWith('.js')) {
        contentType = 'application/javascript'
      } else if (filePath.endsWith('.png')) {
        contentType = 'image/png'
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        contentType = 'image/jpeg'
      } else if (filePath.endsWith('.svg')) {
        contentType = 'image/svg+xml'
      } else if (filePath.endsWith('.ico')) {
        contentType = 'image/x-icon'
      }

      return new Response(file.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          ...CORS_HEADERS
        }
      })

    } catch (error) {
      console.error('Erro ao servir ficheiro:', error)
      
      // Fallback para index.html
      try {
        const indexFile = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)))
        return new Response(indexFile.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS
          }
        })
      } catch (fallbackError) {
        return new Response('Erro interno do servidor', {
          status: 500,
          headers: { ...CORS_HEADERS }
        })
      }
    }
  }
}
