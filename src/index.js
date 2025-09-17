/**
 * Alert@Postas - Cloudflare Worker
 * Proxy, cache e atualização automática do site
 */

// Configurações
const CONFIG = {
  API_BASE_URL: 'https://your-backend-url.com', // Substituir pela URL real
  CACHE_TTL: 300, // 5 minutos
  SITE_UPDATE_INTERVAL: 60, // 1 minuto para atualizações do site
  ALLOWED_ORIGINS: [
    'https://alertapostas.com',
    'https://www.alertapostas.com',
    'https://alertpostas.yourdomain.com'
  ]
};

// Cache para dados do site
let siteDataCache = {
  games: [],
  signals: [],
  stats: {},
  lastUpdate: null
};

// Headers CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Log da requisição
    console.log(`${request.method} ${url.pathname}`);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: CORS_HEADERS
      });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'Alert@Postas Cloudflare Worker',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      });
    }
    
    // Proxy para API principal
    if (url.pathname.startsWith('/api/')) {
      return await proxyToAPI(request, env, ctx);
    }
    
    // Serve assets estáticos se disponíveis
    if (url.pathname.startsWith('/static/')) {
      return await serveAssets(request, env);
    }
    
    // Endpoints para dados do site
    if (url.pathname === '/site/games') {
      return await getSiteGames(request, env);
    }
    
    if (url.pathname === '/site/signals') {
      return await getSiteSignals(request, env);
    }
    
    if (url.pathname === '/site/stats') {
      return await getSiteStats(request, env);
    }
    
    if (url.pathname === '/site/update') {
      return await updateSiteData(request, env, ctx);
    }
    
    // Default response
    return new Response(JSON.stringify({
      message: 'Alert@Postas Cloudflare Worker',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api/v1/*',
        site: {
          games: '/site/games',
          signals: '/site/signals',
          stats: '/site/stats',
          update: '/site/update'
        }
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
};

/**
 * Proxy requests para a API principal
 */
async function proxyToAPI(request, env, ctx) {
  try {
    const url = new URL(request.url);
    
    // Construir URL da API principal
    const apiUrl = new URL(url.pathname + url.search, CONFIG.API_BASE_URL);
    
    // Preparar headers
    const headers = new Headers(request.headers);
    
    // Remover headers problemáticos
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    
    // Adicionar header de origem
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Forwarded-Proto', url.protocol);
    
    // Criar request para API principal
    const apiRequest = new Request(apiUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });
    
    // Cache para GET requests
    if (request.method === 'GET') {
      const cacheKey = new Request(apiUrl.toString(), {
        method: 'GET',
        headers: headers
      });
      
      // Tentar obter do cache
      const cache = caches.default;
      let response = await cache.match(cacheKey);
      
      if (response) {
        console.log('Cache hit for:', apiUrl.pathname);
        return response;
      }
      
      // Fazer request para API
      response = await fetch(apiRequest);
      
      // Cache response se for bem-sucedida
      if (response.ok) {
        const responseToCache = response.clone();
        responseToCache.headers.set('Cache-Control', `public, max-age=${CONFIG.CACHE_TTL}`);
        
        ctx.waitUntil(cache.put(cacheKey, responseToCache));
        console.log('Cached response for:', apiUrl.pathname);
      }
      
      // Adicionar headers CORS
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }
    
    // Para outros métodos, fazer proxy direto
    const response = await fetch(apiRequest);
    
    // Adicionar headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Erro ao conectar com a API principal',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
}

/**
 * Serve assets estáticos
 */
async function serveAssets(request, env) {
  try {
    // Se tiver R2 bucket configurado, servir de lá
    if (env.STORAGE) {
      const key = new URL(request.url).pathname.substring(8); // Remove '/static/'
      const object = await env.STORAGE.get(key);
      
      if (object) {
        return new Response(object.body, {
          headers: {
            'Content-Type': getContentType(key),
            'Cache-Control': 'public, max-age=31536000', // 1 ano para assets
            ...CORS_HEADERS
          }
        });
      }
    }
    
    // Se não encontrar, retornar 404
    return new Response('Asset not found', { status: 404 });
    
  } catch (error) {
    console.error('Asset serving error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Determinar content type baseado na extensão
 */
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  };
  
  return types[ext] || 'application/octet-stream';
}

/**
 * Obter jogos para o site
 */
async function getSiteGames(request, env) {
  try {
    // Verificar se cache é válido
    const now = Date.now();
    if (siteDataCache.lastUpdate && (now - siteDataCache.lastUpdate) < CONFIG.SITE_UPDATE_INTERVAL * 1000) {
      return new Response(JSON.stringify({
        success: true,
        data: siteDataCache.games,
        cached: true,
        lastUpdate: siteDataCache.lastUpdate
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...CORS_HEADERS
        }
      });
    }
    
    // Buscar dados atualizados da API
    await updateSiteDataFromAPI(env);
    
    return new Response(JSON.stringify({
      success: true,
      data: siteDataCache.games,
      cached: false,
      lastUpdate: siteDataCache.lastUpdate
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...CORS_HEADERS
      }
    });
    
  } catch (error) {
    console.error('Error getting site games:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch games',
      data: siteDataCache.games || []
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
}

/**
 * Obter sinais para o site
 */
async function getSiteSignals(request, env) {
  try {
    // Verificar se cache é válido
    const now = Date.now();
    if (siteDataCache.lastUpdate && (now - siteDataCache.lastUpdate) < CONFIG.SITE_UPDATE_INTERVAL * 1000) {
      return new Response(JSON.stringify({
        success: true,
        data: siteDataCache.signals,
        cached: true,
        lastUpdate: siteDataCache.lastUpdate
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...CORS_HEADERS
        }
      });
    }
    
    // Buscar dados atualizados da API
    await updateSiteDataFromAPI(env);
    
    return new Response(JSON.stringify({
      success: true,
      data: siteDataCache.signals,
      cached: false,
      lastUpdate: siteDataCache.lastUpdate
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...CORS_HEADERS
      }
    });
    
  } catch (error) {
    console.error('Error getting site signals:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch signals',
      data: siteDataCache.signals || []
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
}

/**
 * Obter estatísticas para o site
 */
async function getSiteStats(request, env) {
  try {
    // Verificar se cache é válido
    const now = Date.now();
    if (siteDataCache.lastUpdate && (now - siteDataCache.lastUpdate) < CONFIG.SITE_UPDATE_INTERVAL * 1000) {
      return new Response(JSON.stringify({
        success: true,
        data: siteDataCache.stats,
        cached: true,
        lastUpdate: siteDataCache.lastUpdate
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...CORS_HEADERS
        }
      });
    }
    
    // Buscar dados atualizados da API
    await updateSiteDataFromAPI(env);
    
    return new Response(JSON.stringify({
      success: true,
      data: siteDataCache.stats,
      cached: false,
      lastUpdate: siteDataCache.lastUpdate
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...CORS_HEADERS
      }
    });
    
  } catch (error) {
    console.error('Error getting site stats:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch stats',
      data: siteDataCache.stats || {}
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
}

/**
 * Atualizar dados do site manualmente
 */
async function updateSiteData(request, env, ctx) {
  try {
    console.log('Manual site data update triggered');
    
    // Atualizar dados em background
    ctx.waitUntil(updateSiteDataFromAPI(env));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Site data update initiated',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
    
  } catch (error) {
    console.error('Error updating site data:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update site data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    });
  }
}

/**
 * Atualizar dados do site a partir da API
 */
async function updateSiteDataFromAPI(env) {
  try {
    console.log('Updating site data from API...');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (env.API_TOKEN) {
      headers['Authorization'] = `Bearer ${env.API_TOKEN}`;
    }
    
    // Buscar jogos ativos
    const gamesResponse = await fetch(`${CONFIG.API_BASE_URL}/api/v1/games?active=true&limit=50`, {
      headers
    });
    
    if (gamesResponse.ok) {
      const gamesData = await gamesResponse.json();
      siteDataCache.games = gamesData.data || [];
      console.log(`Updated ${siteDataCache.games.length} games`);
    }
    
    // Buscar sinais recentes
    const signalsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/v1/signals?limit=20&order=created_at_desc`, {
      headers
    });
    
    if (signalsResponse.ok) {
      const signalsData = await signalsResponse.json();
      siteDataCache.signals = signalsData.data || [];
      console.log(`Updated ${siteDataCache.signals.length} signals`);
    }
    
    // Buscar estatísticas
    const statsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/v1/metrics/kpis`, {
      headers
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      siteDataCache.stats = statsData || {};
      console.log('Updated stats');
    }
    
    siteDataCache.lastUpdate = Date.now();
    console.log('Site data updated successfully');
    
  } catch (error) {
    console.error('Error updating site data from API:', error);
  }
}

/**
 * Cron job handler para tarefas automáticas
 */
export async function scheduled(event, env, ctx) {
  console.log('Cron job triggered:', event.cron);
  
  try {
    // Chamar endpoint de workers da API principal
    const apiUrl = `${CONFIG.API_BASE_URL}/api/v1/workers/run/football_api`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.API_TOKEN}` // Configurar no Cloudflare
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Worker triggered successfully:', result);
    } else {
      console.error('Failed to trigger worker:', response.status);
    }
    
    // Atualizar dados do site em background
    ctx.waitUntil(updateSiteDataFromAPI(env));
    
  } catch (error) {
    console.error('Cron job error:', error);
  }
}
