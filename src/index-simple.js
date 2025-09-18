/**
 * Alert@Postas - Cloudflare Worker (Versão Simplificada)
 * Proxy e cache para a API principal - SEM Durable Objects
 */

// Configurações
const CONFIG = {
  API_BASE_URL: 'https://alertapostas-backend.ecarvalho140.workers.dev', // URL do backend
  CACHE_TTL: 300, // 5 minutos
  SITE_UPDATE_INTERVAL: 60, // 1 minuto para atualizações do site
  ALLOWED_ORIGINS: [
    'https://alertapostas.pt',
    'https://www.alertapostas.pt',
    'https://alertapostas.com',
    'https://www.alertapostas.com',
    'https://alertapostas.ecarvalho140.workers.dev'
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS preflight
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
    const apiUrl = `${CONFIG.API_BASE_URL}${url.pathname}${url.search}`;
    
    // Headers para a API
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    if (env.API_TOKEN) {
      headers.set('Authorization', `Bearer ${env.API_TOKEN}`);
    }
    
    // Fazer request para a API
    const response = await fetch(apiUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? await request.text() : undefined
    });
    
    // Retornar resposta com CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message
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
