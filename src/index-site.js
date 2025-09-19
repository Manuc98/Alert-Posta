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

    // Servir logo real
    if (path === '/logo.png') {
      try {
        // URL do logo real hospedado externamente
        const logoUrl = 'https://raw.githubusercontent.com/Manuc98/Alert-Posta/feature/calendar-horizontal-component/logo.png';
        
        // Fazer fetch da imagem e servir diretamente
        const response = await fetch(logoUrl);
        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          return new Response(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
              'Content-Length': imageBuffer.byteLength.toString()
            }
          });
        } else {
          throw new Error('Falha ao carregar imagem');
        }
      } catch (error) {
        console.error('Erro ao servir logo:', error);
        // Fallback para uma imagem placeholder
        return new Response('', {
          status: 302,
          headers: {
            'Location': 'https://via.placeholder.com/200x48/1e40af/ffffff?text=Alert@Postas',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
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
        // A cada minuto - verificar jogos ao vivo e notificações
        await checkLiveGames(env);
        await checkUpcomingNotifications(env);
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

// Sistema simplificado - SEM AUTENTICAÇÃO

        // Sistema de armazenamento
        const storage = {
            signals: [],
            botStatus: 'stopped',
            futureGames: [],
            liveGames: [],
            commentatorLogs: [],
            signalTracking: [], // Para tracking de sinais e relatórios
            dailyStats: {
                date: null,
                totalSignals: 0,
                greenSignals: 0,
                redSignals: 0,
                pendingSignals: 0
            },
            users: [], // Sistema de utilizadores com subscrições
            subscriptions: [], // Histórico de subscrições
            
            // Sistema de notificações inteligentes
            notificationSettings: {
                enabled: true,
                advanceTime: 30, // minutos antes do jogo
                leagues: ['Liga Portugal', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga'],
                telegramEnabled: true,
                emailEnabled: false,
                lastNotificationCheck: null
            },
            notifications: [], // Histórico de notificações enviadas
            
            // Sistema de Logs e Auditoria
            auditLogs: [] // Logs de auditoria (id, timestamp, tipo_evento, detalhe, utilizador)
        };

        // Funções de Logs e Auditoria
        function addAuditLog(tipoEvento, detalhe, utilizador = null) {
            const log = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                tipo_evento: tipoEvento,
                detalhe: detalhe,
                utilizador: utilizador || 'system'
            };
            
            storage.auditLogs.push(log);
            
            // Manter apenas os últimos 1000 logs para não sobrecarregar
            if (storage.auditLogs.length > 1000) {
                storage.auditLogs = storage.auditLogs.slice(-1000);
            }
            
            console.log('AUDIT LOG:', log);
        }
        
        function logApiFailure(api, error, details = '') {
            addAuditLog('API_FAILURE', 'Falha na API ' + api + ': ' + error.message + (details ? ' | ' + details : ''), 'system');
        }
        
        function logSignalGeneration(signal, user = 'system') {
            addAuditLog('SIGNAL_GENERATED', 'Sinal gerado: ' + signal.home_team + ' vs ' + signal.away_team + ' - ' + signal.prediction + ' (' + signal.confidence + '%)', user);
        }
        
        function logReportSent(reportType, details, user = 'system') {
            addAuditLog('REPORT_SENT', 'Relatório ' + reportType + ' enviado: ' + details, user);
        }
        
        function logNotificationSent(notification, user = 'system') {
            addAuditLog('NOTIFICATION_SENT', 'Notificação enviada: ' + notification.message, user);
        }
        
        function logUserAction(action, details, user = 'system') {
            addAuditLog('USER_ACTION', 'Ação do utilizador: ' + action + ' | ' + details, user);
        }
        
        function logSystemEvent(event, details, user = 'system') {
            addAuditLog('SYSTEM_EVENT', 'Evento do sistema: ' + event + ' | ' + details, user);
        }

        // Função para gerar explicação dos sinais
        function generateExplanation(game, prediction, confidence) {
            const explanations = {
                teamStats: generateTeamStats(game),
                recentForm: generateRecentForm(game),
                headToHead: generateHeadToHead(game),
                confidence: confidence,
                reasoning: generateReasoning(prediction, confidence)
            };
            
            return explanations;
        }

        function generateTeamStats(game) {
            // Simular estatísticas das equipas (em produção viria da API)
            return {
                homeTeam: {
                    name: game.home_team,
                    avgGoalsScored: Math.round((Math.random() * 2 + 1) * 10) / 10,
                    avgGoalsConceded: Math.round((Math.random() * 1.5 + 0.5) * 10) / 10,
                    homeWinRate: Math.round(Math.random() * 40 + 40), // 40-80%
                    lastFiveGames: generateLastFiveGames()
                },
                awayTeam: {
                    name: game.away_team,
                    avgGoalsScored: Math.round((Math.random() * 1.8 + 0.8) * 10) / 10,
                    avgGoalsConceded: Math.round((Math.random() * 1.8 + 0.8) * 10) / 10,
                    awayWinRate: Math.round(Math.random() * 30 + 20), // 20-50%
                    lastFiveGames: generateLastFiveGames()
                }
            };
        }

        function generateLastFiveGames() {
            const results = ['W', 'L', 'D'];
            return Array.from({length: 5}, () => results[Math.floor(Math.random() * results.length)]);
        }

        function generateRecentForm(game) {
            return {
                homeForm: 'WWDLW', // Simulado
                awayForm: 'LWWDL', // Simulado
                homeGoalsLast5: Math.floor(Math.random() * 8 + 4),
                awayGoalsLast5: Math.floor(Math.random() * 6 + 2)
            };
        }

        function generateHeadToHead(game) {
            return {
                totalMeetings: Math.floor(Math.random() * 10 + 5),
                homeWins: Math.floor(Math.random() * 5 + 2),
                awayWins: Math.floor(Math.random() * 4 + 1),
                draws: Math.floor(Math.random() * 3 + 1),
                avgGoalsPerGame: Math.round((Math.random() * 1.5 + 2) * 10) / 10
            };
        }

        function generateReasoning(prediction, confidence) {
            const reasons = [];
            
            if (confidence > 85) {
                reasons.push('Forte diferença de qualidade entre as equipas');
                reasons.push('Historial favorável nos confrontos diretos');
            } else if (confidence > 70) {
                reasons.push('Boa forma recente da equipa favorita');
                reasons.push('Vantagem de jogar em casa');
            } else {
                reasons.push('Jogo equilibrado com ligeira vantagem');
                reasons.push('Análise baseada em estatísticas recentes');
            }
            
            if (prediction.includes('Over')) {
                reasons.push('Ambas as equipas têm ataques produtivos');
                reasons.push('Defesas com fragilidades identificadas');
            } else if (prediction.includes('Under')) {
                reasons.push('Defesas sólidas de ambas as equipas');
                reasons.push('Estilo de jogo mais cauteloso esperado');
            }
            
            return reasons;
        }

        // Função para criar um sinal simulado (para demonstração)
        function createMockSignalWithExplanation() {
            const mockGames = [
                { id: 1, home_team: 'FC Porto', away_team: 'Sporting CP', league: 'Liga Portugal', date: new Date().toISOString() },
                { id: 2, home_team: 'Benfica', away_team: 'Braga', league: 'Liga Portugal', date: new Date().toISOString() },
                { id: 3, home_team: 'Manchester City', away_team: 'Liverpool', league: 'Premier League', date: new Date().toISOString() }
            ];
            
            const predictions = ['Over 2.5', 'Under 2.5', 'Home Win', 'Away Win', 'Draw'];
            const game = mockGames[Math.floor(Math.random() * mockGames.length)];
            const prediction = predictions[Math.floor(Math.random() * predictions.length)];
            const confidence = Math.floor(Math.random() * 30) + 70; // 70-99%
            
            const signal = {
                id: Date.now().toString(),
                gameId: game.id,
                home_team: game.home_team,
                away_team: game.away_team,
                league: game.league,
                date: game.date,
                prediction: prediction,
                confidence: confidence,
                overUnder: 2.5,
                status: 'pending',
                explanation: generateExplanation(game, prediction, confidence),
                created_at: new Date().toISOString()
            };
            
            storage.signals.push(signal);
            addCommentatorLog('🧠 Sinal criado com explicação: ' + signal.home_team + ' vs ' + signal.away_team + ' - ' + signal.prediction, 'success');
            logSignalGeneration(signal, 'system');
            
            return signal;
        }
        
        // Função para adicionar explicação a sinais existentes
        function addExplanationToExistingSignals() {
            storage.signals.forEach(signal => {
                if (!signal.explanation) {
                    const mockGame = {
                        home_team: signal.home_team,
                        away_team: signal.away_team,
                        league: signal.league
                    };
                    signal.explanation = generateExplanation(mockGame, signal.prediction, signal.confidence);
                    addCommentatorLog('🔧 Explicação adicionada ao sinal: ' + signal.home_team + ' vs ' + signal.away_team, 'info');
                }
            });
        }

// Função principal para lidar com APIs
async function handleAPI(request, env, path) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Rotas públicas (sem login)
    
    // Bot endpoints
    if (path === '/api/start-bot') {
      return await handleBotStart(request, env);
    }
    
    if (path === '/api/stop-bot') {
      return await handleBotStop(request, env);
    }
    
    if (path === '/api/analyze-games') {
      return await handleBotAnalyze(request, env);
    }
    
    if (path === '/api/update-token') {
      return await handleBotRefreshToken(request, env);
    }
    
    if (path === '/api/v1/bot/module') {
      return await handleBotModule(request, env);
    }
    
    if (path === '/api/v1/bot/status') {
      return await handleBotStatus(request, env);
    }

    // Games endpoints
    if (path === '/api/games' || path.startsWith('/api/games?')) {
      return await handleUnifiedGamesAPI(request, env);
    }
    
    if (path === '/api/v1/games/live') {
      return await handleGamesLive(request, env);
    }
    
    if (path.startsWith('/api/v1/games/day')) {
      return await handleGamesDay(request, env);
    }
    
    // Stats endpoint
    if (path === '/api/v1/stats') {
      return await handleStats(request, env);
    }

    if (path === '/api/v1/future-games') {
      return await handleFutureGamesAPI(request, env);
    }
    
    if (path === '/api/v1/live-games') {
      return await handleLiveGamesAPI(request, env);
    }
    
    if (path === '/api/v1/finished-games') {
      return await handleFinishedGamesAPI(request, env);
    }
    
    if (path === '/api/v1/past-games') {
      return await handlePastGamesAPI(request, env);
    }
    
    if (path === '/api/v1/commentator') {
      return await handleCommentatorAPI(request, env);
    }
    
    // APIs sem autenticação
    if (path === '/api/v1/signals') {
      return await handleSignalsAPI(request, env);
    }
    
    if (path === '/api/v1/bot/control') {
      return await handleBotControlAPI(request, env);
    }
    
    if (path === '/api/v1/stats') {
      return await handleStatsAPI(request, env);
    }

        if (path === '/api/v1/daily-report') {
            return await handleDailyReportAPI(request, env);
        }
        
        // Endpoints de Subscrições
        if (path === '/api/v1/subscription/create-session') {
            return await handleCreateSubscriptionSession(request, env);
        }
        
        if (path === '/api/v1/subscription/webhook') {
            return await handleSubscriptionWebhook(request, env);
        }
        
        if (path === '/api/v1/subscription/status') {
            return await handleSubscriptionStatus(request, env);
        }
        
        if (path === '/api/v1/subscription/admin') {
            return await handleSubscriptionAdmin(request, env);
        }
        
        // Endpoints de Histórico de Performance
        if (path === '/api/v1/history/performance') {
            return await handleHistoryPerformance(request, env);
        }
        
        if (path === '/api/v1/history/stats') {
            return await handleHistoryStats(request, env);
        }
        
        // Endpoints de Notificações Inteligentes
        if (path === '/api/v1/notifications/config') {
            return await handleNotificationConfig(request, env);
        }
        
        if (path === '/api/v1/notifications/send') {
            return await handleNotificationSend(request, env);
        }
        
        if (path === '/api/v1/notifications/upcoming') {
            return await handleNotificationUpcoming(request, env);
        }
        
        // Endpoints de Logs e Auditoria
        if (path === '/api/v1/logs/audit') {
            return await handleAuditLogs(request, env);
        }
        
        if (path === '/api/v1/logs/stats') {
            return await handleLogsStats(request, env);
        }
        
        

    // Endpoints de utilizadores removidos - SISTEMA SEM AUTENTICAÇÃO

    return new Response('API endpoint not found', { status: 404, headers: CORS_HEADERS });
    } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
  
// Funções de autenticação removidas - SISTEMA SEM LOGIN

// API para jogos futuros
// Bot handlers
async function handleBotStart(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    // Simular início do bot
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return new Response(JSON.stringify({
      status: "ok",
      message: "Bot iniciado com sucesso"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleBotStop(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    // Simular paragem do bot
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return new Response(JSON.stringify({
      status: "ok",
      message: "Bot parado com sucesso"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleBotAnalyze(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    // Simular análise de jogos
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return new Response(JSON.stringify({
      status: "ok",
      message: "Análise concluída",
      signals: Math.floor(Math.random() * 5) + 1
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleBotRefreshToken(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    // Simular atualização do token
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return new Response(JSON.stringify({
      status: "ok",
      message: "Token atualizado com sucesso"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleBotModule(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  try {
    const body = await request.json();
    const { module, enabled } = body;
    
    // Simular alteração do módulo
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return new Response(JSON.stringify({
      status: "ok",
      message: "Módulo " + module + " " + (enabled ? "ativado" : "desativado"),
      module: module,
      enabled: enabled
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleBotStatus(request, env) {
  try {
    return new Response(JSON.stringify({
      success: true,
      status: 'running',
      modules: {
        mlOverUnder: true,
        mlWinner: false,
        valueBet: true,
        nextGoal: false
      },
      stats: {
        mlAccuracy: 87.5,
        signalsGenerated: 24,
        activeModules: 2
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Games handlers
async function handleGamesLive(request, env) {
  try {
    // Mock data para jogos ao vivo
    const liveGames = [
      {
        id: 1,
        home_team: "Real Madrid",
        away_team: "Barcelona",
        league: "La Liga",
        minute: 67,
        score: "2-1",
        status: "LIVE"
      },
      {
        id: 2,
        home_team: "Manchester United",
        away_team: "Liverpool",
        league: "Premier League",
        minute: 23,
        score: "0-0",
        status: "LIVE"
      },
      {
        id: 3,
        home_team: "Bayern Munich",
        away_team: "Borussia Dortmund",
        league: "Bundesliga",
        minute: 89,
        score: "1-1",
        status: "LIVE"
      }
    ];
    
    return new Response(JSON.stringify({
      status: "ok",
      games: liveGames
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleGamesDay(request, env) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Mock data para jogos do dia
    const dayGames = [
      {
        id: 1,
        home_team: "Chelsea",
        away_team: "Arsenal",
        league: "Premier League",
        time: "15:00",
        date: date,
        status: "SCHEDULED"
      },
      {
        id: 2,
        home_team: "PSG",
        away_team: "Marseille",
        league: "Ligue 1",
        time: "17:30",
        date: date,
        status: "SCHEDULED"
      },
      {
        id: 3,
        home_team: "Juventus",
        away_team: "AC Milan",
        league: "Serie A",
        time: "20:45",
        date: date,
        status: "SCHEDULED"
      }
    ];
    
    return new Response(JSON.stringify({
      status: "ok",
      games: dayGames,
      date: date
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Stats handler
async function handleStats(request, env) {
  try {
    const stats = {
      total_signals: 156,
      greens: 98,
      reds: 45,
      pending: 13,
      win_rate: 68.5
    };
    
    return new Response(JSON.stringify({
      status: "ok",
      stats: stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Endpoint unificado para jogos - GET /api/games?date=YYYY-MM-DD
async function handleUnifiedGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    
    // Se não há parâmetro de data, usar hoje
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    
    console.log('🎯 Buscando jogos para data:', targetDate);
    addAuditLog('API_REQUEST', `Busca de jogos para data: ${targetDate}`, 'system');

    // Verificar se a API key está configurada
    if (!env.API_FOOTBALL_KEY) {
      console.error('❌ API_FOOTBALL_KEY não configurada');
      return new Response(JSON.stringify({
        error: 'API_FOOTBALL_KEY não configurada',
        games: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    let allGames = [];
    const today = new Date().toISOString().split('T')[0];
    const requestedDate = new Date(targetDate);
    const todayDate = new Date(today);

    // Determinar que tipos de jogos buscar baseado na data
    let statuses = [];
    if (requestedDate < todayDate) {
      // Data passada - jogos terminados
      statuses = ['FT', 'AET', 'PEN'];
    } else if (requestedDate.getTime() === todayDate.getTime()) {
      // Hoje - todos os tipos
      statuses = ['NS', 'LIVE', '1H', '2H', 'HT', 'FT', 'AET', 'PEN'];
    } else {
      // Data futura - jogos agendados
      statuses = ['NS'];
    }

    // Fazer múltiplas chamadas para diferentes status (API Football não aceita múltiplos status numa chamada)
    for (const status of statuses) {
      try {
        const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${targetDate}&status=${status}&timezone=Europe/Lisbon`;
        
        console.log(`📡 Chamando API Football: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          headers: {
            'x-rapidapi-key': env.API_FOOTBALL_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.response && data.response.length > 0) {
            console.log(`✅ ${data.response.length} jogos encontrados com status ${status}`);
            
            // Mapear para o formato esperado
            const mappedGames = data.response.map(fixture => ({
              id: fixture.fixture.id,
              liga: fixture.league.name,
              equipaCasa: fixture.teams.home.name,
              equipaFora: fixture.teams.away.name,
              odds: {
                casa: fixture.odds && fixture.odds.length > 0 ? fixture.odds[0].values.find(v => v.value === "Home")?.odd || "N/A" : "N/A",
                empate: fixture.odds && fixture.odds.length > 0 ? fixture.odds[0].values.find(v => v.value === "Draw")?.odd || "N/A" : "N/A",
                fora: fixture.odds && fixture.odds.length > 0 ? fixture.odds[0].values.find(v => v.value === "Away")?.odd || "N/A" : "N/A"
              },
              estado: getPortugueseStatus(fixture.fixture.status.short),
              hora: new Date(fixture.fixture.date).toLocaleTimeString('pt-PT', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Europe/Lisbon'
              }),
              data: targetDate,
              // Dados adicionais úteis
              country: fixture.league.country,
              league_id: fixture.league.id,
              venue: fixture.fixture.venue ? fixture.fixture.venue.name : 'N/A',
              status_long: fixture.fixture.status.long,
              goals_home: fixture.goals.home,
              goals_away: fixture.goals.away,
              elapsed: fixture.fixture.status.elapsed
            }));
            
            allGames = allGames.concat(mappedGames);
          }
        } else {
          console.error(`❌ Erro API Football (${status}):`, response.status, response.statusText);
          logApiFailure('API-Football', new Error(`Status ${response.status}: ${response.statusText}`), `Status: ${status}, Data: ${targetDate}`);
        }
        
        // Pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro ao buscar jogos com status ${status}:`, error);
        logApiFailure('API-Football', error, `Status: ${status}, Data: ${targetDate}`);
      }
    }

    // Remover duplicados (pode acontecer se um jogo mudou de status durante as chamadas)
    const uniqueGames = allGames.filter((game, index, self) => 
      index === self.findIndex(g => g.id === game.id)
    );

    console.log(`🎯 Total de jogos únicos encontrados: ${uniqueGames.length}`);
    addAuditLog('API_SUCCESS', `${uniqueGames.length} jogos encontrados para ${targetDate}`, 'system');

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      total: uniqueGames.length,
      games: uniqueGames
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('❌ Erro no endpoint de jogos:', error);
    logApiFailure('API-Football-Unified', error, `Data: ${dateParam || 'hoje'}`);
    
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message,
      games: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// Função auxiliar para traduzir status para português
function getPortugueseStatus(status) {
  const statusMap = {
    'NS': 'Agendado',
    'LIVE': 'Ao Vivo',
    '1H': '1º Tempo',
    '2H': '2º Tempo', 
    'HT': 'Intervalo',
    'FT': 'Terminado',
    'AET': 'Prorrogação',
    'PEN': 'Pênaltis',
    'SUSP': 'Suspenso',
    'INT': 'Interrompido',
    'PST': 'Adiado',
    'CANC': 'Cancelado',
    'ABD': 'Abandonado',
    'AWD': 'Walkover',
    'WO': 'Walkover'
  };
  
  return statusMap[status] || status;
}

async function handleFutureGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    console.log('Buscando jogos futuros...');

    // Buscar jogos para os próximos 7 dias, um dia de cada vez
    let allFutureGames = [];
    
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      console.log('Buscando jogos futuros para:', dateStr);
      
      // Usar parâmetros corretos da API Football
      const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}&status=NS&timezone=Europe/Lisbon`;

      console.log('URL da API:', apiFootballUrl);

      const response = await fetch(apiFootballUrl, {
        headers: {
          'x-rapidapi-key': env.API_FOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`API Football response para ${dateStr}:`, data.results, 'jogos');
        
        if (data.response && data.response.length > 0) {
          const dayGames = data.response.map(fixture => ({
            id: fixture.fixture.id,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            league: fixture.league.name,
            league_id: fixture.league.id,
            date: fixture.fixture.date,
            country: fixture.league.country
          }));
          allFutureGames = allFutureGames.concat(dayGames);
        }
      } else {
        console.error('API Football error para', dateStr, ':', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    }
    
    console.log('Total jogos futuros encontrados:', allFutureGames.length);
    addCommentatorLog(`📅 ${allFutureGames.length} jogos futuros carregados da API Football`, 'info');

    // SEM JOGOS DE EXEMPLO - APENAS DADOS REAIS DA API

    return new Response(JSON.stringify(allFutureGames), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Error fetching future games:', error);
    addCommentatorLog(`❌ Erro ao carregar jogos futuros: ${error.message}`, 'error');
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// API para jogos ao vivo
async function handleLiveGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Buscando jogos ao vivo para:', today);
    addCommentatorLog(`🔴 Buscando jogos ao vivo para ${today}`, 'info');
    
    let liveGames = [];

    // Buscar jogos ao vivo (LIVE)
    const liveUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=LIVE&timezone=Europe/Lisbon`;
    const liveResponse = await fetch(liveUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (liveResponse.ok) {
      const liveData = await liveResponse.json();
      console.log('API Football LIVE response:', liveData.results, 'jogos');
      addCommentatorLog(`📊 API Football LIVE: ${liveData.results} jogos encontrados`, 'info');
      
      if (liveData.response && liveData.response.length > 0) {
        const liveGamesData = liveData.response.map(fixture => ({
          id: fixture.fixture.id,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          league: fixture.league.name,
          league_id: fixture.league.id,
          status: 'LIVE',
          minute: fixture.fixture.status.elapsed || 0,
          home_score: fixture.goals.home,
          away_score: fixture.goals.away,
          date: fixture.fixture.date,
          country: fixture.league.country
        }));
        liveGames = liveGames.concat(liveGamesData);
      }
    }

    // Buscar jogos no 1º tempo (1H)
    const firstHalfUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=1H&timezone=Europe/Lisbon`;
    const firstHalfResponse = await fetch(firstHalfUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (firstHalfResponse.ok) {
      const firstHalfData = await firstHalfResponse.json();
      console.log('API Football 1H response:', firstHalfData.results, 'jogos');
      addCommentatorLog(`📊 API Football 1H: ${firstHalfData.results} jogos encontrados`, 'info');
      
      if (firstHalfData.response && firstHalfData.response.length > 0) {
        const firstHalfGames = firstHalfData.response.map(fixture => ({
        id: fixture.fixture.id,
        home_team: fixture.teams.home.name,
        away_team: fixture.teams.away.name,
        league: fixture.league.name,
        league_id: fixture.league.id,
        status: 'LIVE',
        minute: fixture.fixture.status.elapsed || 0,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        date: fixture.fixture.date,
        country: fixture.league.country
        }));
        liveGames = liveGames.concat(firstHalfGames);
      }
    }

    // Buscar jogos no 2º tempo (2H)
    const secondHalfUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=2H&timezone=Europe/Lisbon`;
    const secondHalfResponse = await fetch(secondHalfUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (secondHalfResponse.ok) {
      const secondHalfData = await secondHalfResponse.json();
      console.log('API Football 2H response:', secondHalfData.results, 'jogos');
      addCommentatorLog(`📊 API Football 2H: ${secondHalfData.results} jogos encontrados`, 'info');
      
      if (secondHalfData.response && secondHalfData.response.length > 0) {
        const secondHalfGames = secondHalfData.response.map(fixture => ({
          id: fixture.fixture.id,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          league: fixture.league.name,
          league_id: fixture.league.id,
          status: 'LIVE',
          minute: fixture.fixture.status.elapsed || 0,
          home_score: fixture.goals.home,
          away_score: fixture.goals.away,
          date: fixture.fixture.date,
          country: fixture.league.country
        }));
        liveGames = liveGames.concat(secondHalfGames);
      }
    }

    console.log('Total live games processed:', liveGames.length);
    addCommentatorLog(`⚽ ${liveGames.length} jogos ao vivo processados no total`, 'info');


        return new Response(JSON.stringify(liveGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });

      } catch (error) {
        console.error('Error fetching live games:', error);
    addCommentatorLog(`❌ Erro ao buscar jogos ao vivo: ${error.message}`, 'error');
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // Função para buscar jogos terminados (apenas para atualizar sinais)
    async function handleFinishedGamesAPI(request, env) {
      const CORS_HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Buscando jogos terminados para:', today);
        
        const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

        const response = await fetch(apiFootballUrl, {
          headers: {
            'x-rapidapi-key': env.API_FOOTBALL_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        });

        let finishedGames = [];

        if (response.ok) {
          const data = await response.json();
          console.log('API Football FINISHED response:', data.results, 'jogos');
          
          finishedGames = data.response ? data.response.map(fixture => ({
            id: fixture.fixture.id,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            league: fixture.league.name,
            league_id: fixture.league.id,
            status: 'FINISHED',
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            date: fixture.fixture.date,
            country: fixture.league.country
          })) : [];
          
          console.log('Processed finished games:', finishedGames.length);
        } else {
          console.error('API Football FINISHED error:', response.status, response.statusText);
        }

        return new Response(JSON.stringify(finishedGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });

      } catch (error) {
        console.error('Error fetching finished games:', error);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }
}

// API para jogos passados (últimos 7 dias)
async function handlePastGamesAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days')) || 7; // Padrão: últimos 7 dias
    
    console.log(`Buscando jogos passados dos últimos ${days} dias...`);
    addCommentatorLog(`📅 Buscando jogos passados dos últimos ${days} dias`, 'info');

    let allPastGames = [];
    
    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      console.log('Buscando jogos passados para:', dateStr);
      
      // Buscar jogos terminados (FT, AET, PEN)
      const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}&status=FT,AET,PEN&timezone=Europe/Lisbon`;

      const response = await fetch(apiFootballUrl, {
        headers: {
          'x-rapidapi-key': env.API_FOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`API Football PAST response para ${dateStr}:`, data.results, 'jogos');
        
        if (data.response && data.response.length > 0) {
          const dayGames = data.response.map(fixture => ({
            id: fixture.fixture.id,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            league: fixture.league.name,
            league_id: fixture.league.id,
            date: fixture.fixture.date,
            country: fixture.league.country,
            status: 'FINISHED',
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            result: fixture.fixture.status.short
          }));
          allPastGames = allPastGames.concat(dayGames);
        }
      } else {
        console.error('API Football PAST error para', dateStr, ':', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    }
    
    console.log('Total jogos passados encontrados:', allPastGames.length);
    addCommentatorLog(`📊 ${allPastGames.length} jogos passados carregados da API Football`, 'info');

    return new Response(JSON.stringify(allPastGames), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Error fetching past games:', error);
    addCommentatorLog(`❌ Erro ao carregar jogos passados: ${error.message}`, 'error');
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

// Função para verificar e atualizar sinais automaticamente
function startSignalUpdateChecker(env) {
  // Verificar jogos terminados a cada 2 minutos
  setInterval(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

      const response = await fetch(apiFootballUrl, {
        headers: {
          'x-rapidapi-key': env.API_FOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          console.log('Verificando', data.results, 'jogos terminados para atualizar sinais');
          
          // Verificar sinais pendentes e atualizar status
          for (const finishedGame of data.response) {
            const gameId = finishedGame.fixture.id;
            const pendingSignals = storage.signals.filter(signal => 
              signal.gameId === gameId && signal.status === 'pending'
            );
            
            if (pendingSignals.length > 0) {
              // Determinar resultado do jogo
              const homeScore = finishedGame.goals.home;
              const awayScore = finishedGame.goals.away;
              
              for (const signal of pendingSignals) {
                let newStatus = 'red'; // Default para red
                
                // Lógica simples para determinar green/red baseado na previsão
                if (signal.prediction) {
                  const prediction = signal.prediction.toLowerCase();
                  
                  if (prediction.includes('over') && (homeScore + awayScore) > signal.overUnder) {
                    newStatus = 'green';
                  } else if (prediction.includes('under') && (homeScore + awayScore) < signal.overUnder) {
                    newStatus = 'green';
                  } else if (prediction.includes('home') && homeScore > awayScore) {
                    newStatus = 'green';
                  } else if (prediction.includes('away') && awayScore > homeScore) {
                    newStatus = 'green';
                  } else if (prediction.includes('draw') && homeScore === awayScore) {
                    newStatus = 'green';
                  }
                }
                
                // Atualizar sinal
                signal.status = newStatus;
                signal.home_score = homeScore;
                signal.away_score = awayScore;
                signal.updated_at = new Date().toISOString();
                
                // Enviar atualização para Telegram
                await updateSignalInTelegram(env, signal, newStatus);
                
                // Adicionar ao tracking
                storage.signalTracking.push({
                  id: Date.now().toString(),
                  type: 'signal_update',
                  signalId: signal.id,
                  gameId: gameId,
                  oldStatus: 'pending',
                  newStatus: newStatus,
                  homeScore,
                  awayScore,
                  timestamp: new Date().toISOString()
                });
                
                addCommentatorLog(`🔄 Sinal atualizado: ${signal.home_team} vs ${signal.away_team} - ${newStatus.toUpperCase()}`, 'info');
              }
            }
          }
          
          addCommentatorLog(`🔄 Verificados ${data.results} jogos terminados - ${storage.signals.filter(s => s.status === 'pending').length} sinais pendentes`, 'info');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar jogos terminados:', error);
    }
  }, 120000); // A cada 2 minutos
}

// Funções para cron jobs
async function checkUpcomingNotifications(env) {
  try {
    if (!storage.notificationSettings.enabled) {
      return;
    }
    
    console.log('Verificando notificações de jogos próximos...');
    
    const now = new Date();
    const advanceTime = storage.notificationSettings.advanceTime || 30;
    
    // Buscar jogos que começam nos próximos X minutos
    const upcomingGames = storage.futureGames.filter(game => {
      const gameTime = new Date(game.date);
      const timeDiff = gameTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      // Jogo está entre agora e o tempo de antecipação (com margem de 2 minutos)
      return minutesDiff >= 0 && minutesDiff <= (advanceTime + 2) && 
             storage.notificationSettings.leagues.includes(game.league);
    });
    
    console.log('Jogos próximos encontrados:', upcomingGames.length);
    
    for (const game of upcomingGames) {
      // Verificar se já foi notificado nas últimas 2 horas
      const alreadyNotified = storage.notifications.some(notif => 
        notif.gameId === game.id && 
        notif.type === 'upcoming' &&
        new Date(notif.timestamp) > new Date(now.getTime() - 2 * 60 * 60 * 1000)
      );
      
      if (!alreadyNotified) {
        const message = game.home_team + ' vs ' + game.away_team + ' (' + game.league + ')';
        
        console.log('Enviando notificação para:', message);
        
        // Enviar notificação via Telegram
        if (storage.notificationSettings.telegramEnabled) {
          const telegramMessage = '🔔 <b>JOGO PRÓXIMO</b>\n\n' +
                                '⚽ <b>Jogo:</b> ' + game.home_team + ' vs ' + game.away_team + '\n' +
                                '🏆 <b>Liga:</b> ' + game.league + '\n' +
                                '⏰ <b>Início:</b> ' + new Date(game.date).toLocaleString('pt-PT') + '\n' +
                                '⏳ <b>Faltam:</b> ' + Math.round((new Date(game.date).getTime() - now.getTime()) / (1000 * 60)) + ' minutos';
          
          const sent = await sendTelegramMessage(env, telegramMessage);
          
          // Guardar notificação no histórico
          const notification = {
            id: Date.now().toString(),
            gameId: game.id,
            type: 'upcoming',
            message: message,
            sent: sent,
            timestamp: new Date().toISOString(),
            channel: 'telegram'
          };
          
          storage.notifications.push(notification);
          
          if (sent) {
            addCommentatorLog('🔔 Notificação enviada: ' + message, 'success');
            logNotificationSent(notification, 'system');
          } else {
            addCommentatorLog('❌ Falha ao enviar notificação: ' + message, 'error');
            logApiFailure('TELEGRAM_NOTIFICATION', new Error('Falha ao enviar notificação'), message);
          }
        }
      }
    }
    
    // Manter apenas as últimas 100 notificações
    if (storage.notifications.length > 100) {
      storage.notifications = storage.notifications.slice(-100);
    }
    
    // Atualizar último check
    storage.notificationSettings.lastNotificationCheck = new Date().toISOString();
    
  } catch (error) {
    console.error('Erro no cron checkUpcomingNotifications:', error);
    addCommentatorLog('❌ Erro ao verificar notificações: ' + error.message, 'error');
  }
}

async function checkLiveGames(env) {
  try {
    console.log('Cron: Verificando jogos ao vivo...');
    const today = new Date().toISOString().split('T')[0];
    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=LIVE`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        console.log(`Cron: ${data.results} jogos ao vivo encontrados`);
        addCommentatorLog(`⚡ Cron: ${data.results} jogos ao vivo ativos`, 'info');
      }
    }
  } catch (error) {
    console.error('Erro no cron checkLiveGames:', error);
  }
}

async function checkFinishedGames(env) {
  try {
    console.log('Cron: Verificando jogos terminados...');
    const today = new Date().toISOString().split('T')[0];
    const apiFootballUrl = `https://v3.football.api-sports.io/fixtures?date=${today}&status=FT,AET,PEN`;

    const response = await fetch(apiFootballUrl, {
      headers: {
        'x-rapidapi-key': env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        console.log(`Cron: ${data.results} jogos terminados encontrados`);
        addCommentatorLog(`🏁 Cron: ${data.results} jogos terminados - verificando sinais`, 'info');
      }
    }
  } catch (error) {
    console.error('Erro no cron checkFinishedGames:', error);
  }
}

async function generateDailyReport(env) {
  try {
    console.log('Cron: Gerando relatório diário...');
    addCommentatorLog('📊 Cron: Gerando relatório diário às 23:59', 'info');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Calcular estatísticas do dia
    const todaySignals = storage.signals.filter(signal => {
      const signalDate = new Date(signal.date).toISOString().split('T')[0];
      return signalDate === today;
    });
    
    const greenCount = todaySignals.filter(s => s.status === 'green').length;
    const redCount = todaySignals.filter(s => s.status === 'red').length;
    const pendingCount = todaySignals.filter(s => s.status === 'pending').length;
    const totalCount = todaySignals.length;
    
    // Atualizar estatísticas diárias
    storage.dailyStats = {
      date: today,
      totalSignals: totalCount,
      greenSignals: greenCount,
      redSignals: redCount,
      pendingSignals: pendingCount
    };
    
    // Gerar relatório
    const winRate = totalCount > 0 ? ((greenCount / totalCount) * 100).toFixed(1) : 0;
    
    const reportMessage = `📊 <b>RELATÓRIO DIÁRIO - ${today}</b>\n\n` +
                         `🎯 <b>Resumo do Dia:</b>\n` +
                         `📈 Total de Sinais: ${totalCount}\n` +
                         `🟢 Greens: ${greenCount}\n` +
                         `🔴 Reds: ${redCount}\n` +
                         `🟡 Pendentes: ${pendingCount}\n\n` +
                         `📊 <b>Taxa de Acerto:</b> ${winRate}%\n\n` +
                         `⏰ <b>Gerado em:</b> ${new Date().toLocaleString('pt-PT')}\n\n` +
                         `🤖 <i>Alert@Postas - Sistema Automático</i>`;
    
    // Enviar para Telegram
    const telegramSent = await sendTelegramMessage(env, reportMessage);
    
    if (telegramSent) {
      addCommentatorLog('✅ Relatório diário enviado para Telegram com sucesso', 'success');
    } else {
      addCommentatorLog('❌ Erro ao enviar relatório diário para Telegram', 'error');
    }
    
    // Adicionar ao tracking
    storage.signalTracking.push({
      id: Date.now().toString(),
      type: 'daily_report',
      date: today,
      stats: storage.dailyStats,
      telegramSent,
      timestamp: new Date().toISOString()
    });
    
    console.log('Relatório diário gerado:', storage.dailyStats);
    
  } catch (error) {
    console.error('Erro no cron generateDailyReport:', error);
    addCommentatorLog(`❌ Erro ao gerar relatório diário: ${error.message}`, 'error');
  }
}

// API para painel do comentador
async function handleCommentatorAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'GET') {
    return new Response(JSON.stringify(storage.commentatorLogs), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (request.method === 'POST') {
    const { message, type = 'info' } = await request.json();
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    storage.commentatorLogs.push(logEntry);
    
    // Manter apenas os últimos 100 logs
    if (storage.commentatorLogs.length > 100) {
      storage.commentatorLogs = storage.commentatorLogs.slice(-100);
    }
    
    return new Response(JSON.stringify({ success: true, log: logEntry }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}

// API para sinais
async function handleSignalsAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const signals = storage.signals;
  
  return new Response(JSON.stringify(signals), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para controlo do bot
async function handleBotControlAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'POST') {
    const { action } = await request.json();
    
    if (action === 'start') {
      storage.botStatus = 'running';
      // Adicionar log ao comentador
      addCommentatorLog('🤖 Bot iniciado - Enviando sinais em tempo real', 'success');
      
      // Iniciar verificação automática de jogos terminados para atualizar sinais
      startSignalUpdateChecker(env);
      
      return new Response(JSON.stringify({ success: true, message: 'Bot iniciado - Enviando sinais em tempo real' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'stop') {
      storage.botStatus = 'stopped';
      // Adicionar log ao comentador
      addCommentatorLog('⏹️ Bot parado - Sinais suspensos', 'warning');
      return new Response(JSON.stringify({ success: true, message: 'Bot parado - Sinais suspensos' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    
    if (action === 'analyze') {
      // Adicionar log ao comentador
      addCommentatorLog('🔍 Análise de jogos iniciada (sem envio de sinais)', 'info');
      // Simular análise
      setTimeout(() => {
        addCommentatorLog('✅ Análise concluída - 5 jogos analisados', 'success');
      }, 2000);
      return new Response(JSON.stringify({ success: true, message: 'Análise iniciada - Apenas análise, sem envio de sinais' }), {
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
async function handleStatsAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const stats = {
    signals: {
      total: storage.signals.length,
      greens: storage.signals.filter(s => s.status === 'green').length,
      reds: storage.signals.filter(s => s.status === 'red').length,
      pending: storage.signals.filter(s => s.status === 'pending').length
    },
    system: {
      botStatus: storage.botStatus,
      totalUsers: 0
    }
  };
  
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// API para relatório diário
async function handleDailyReportAPI(request, env) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
      const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Buscar relatórios do dia especificado
    const dayReports = storage.signalTracking.filter(track => 
      track.type === 'daily_report' && track.date === date
    );
    
    // Buscar sinais do dia
    const daySignals = storage.signals.filter(signal => {
      const signalDate = new Date(signal.date).toISOString().split('T')[0];
      return signalDate === date;
    });
    
    const greenCount = daySignals.filter(s => s.status === 'green').length;
    const redCount = daySignals.filter(s => s.status === 'red').length;
    const pendingCount = daySignals.filter(s => s.status === 'pending').length;
    const totalCount = daySignals.length;
    const winRate = totalCount > 0 ? ((greenCount / totalCount) * 100).toFixed(1) : 0;
    
    const report = {
      date,
      stats: {
        totalSignals: totalCount,
        greenSignals: greenCount,
        redSignals: redCount,
        pendingSignals: pendingCount,
        winRate: parseFloat(winRate)
      },
      signals: daySignals,
      reports: dayReports,
      generated_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(report), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });

  } catch (error) {
    console.error('Error fetching daily report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
  }
}

// Função auxiliar para adicionar logs ao comentador
function addCommentatorLog(message, type = 'info') {
  const logEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    message,
    type
  };
  storage.commentatorLogs.push(logEntry);
  
  // Manter apenas os últimos 100 logs
  if (storage.commentatorLogs.length > 100) {
    storage.commentatorLogs = storage.commentatorLogs.slice(-100);
  }
}

// Função para enviar mensagem para o Telegram
async function sendTelegramMessage(env, message, parseMode = 'HTML') {
  try {
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_GROUP_ID,
        text: message,
        parse_mode: parseMode
      })
    });

    if (response.ok) {
      console.log('Mensagem enviada para Telegram com sucesso');
      return true;
    } else {
      const errorData = await response.text();
      console.error('Erro ao enviar para Telegram:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error('Erro na função sendTelegramMessage:', error);
    return false;
  }
}

// Função para atualizar sinal no Telegram
        async function updateSignalInTelegram(env, signal, newStatus) {
            try {
                const statusEmoji = newStatus === 'green' ? '🟢' : newStatus === 'red' ? '🔴' : '🟡';
                const statusText = newStatus === 'green' ? 'GREEN' : newStatus === 'red' ? 'RED' : 'PENDING';
                
                const message = `📊 <b>ATUALIZAÇÃO DE SINAL</b>\n\n` +
                               `🎯 <b>Jogo:</b> ${signal.home_team} vs ${signal.away_team}\n` +
                               `🏆 <b>Liga:</b> ${signal.league}\n` +
                               `📅 <b>Data:</b> ${new Date(signal.date).toLocaleDateString('pt-PT')}\n` +
                               `⚽ <b>Resultado:</b> ${signal.home_score || 0} - ${signal.away_score || 0}\n` +
                               `🎯 <b>Previsão:</b> ${signal.prediction || 'N/A'}\n` +
                               `📈 <b>Status:</b> ${statusEmoji} ${statusText}\n` +
                               `⏰ <b>Atualizado:</b> ${new Date().toLocaleString('pt-PT')}`;
                
                return await sendTelegramMessage(env, message);
            } catch (error) {
                console.error('Erro ao atualizar sinal no Telegram:', error);
                return false;
            }
        }

        async function sendSignalWithExplanation(env, signal) {
            try {
                // Mensagem principal do sinal
                const mainMessage = `🚨 <b>NOVO SINAL</b>\n\n` +
                                   `🎯 <b>Jogo:</b> ${signal.home_team} vs ${signal.away_team}\n` +
                                   `🏆 <b>Liga:</b> ${signal.league}\n` +
                                   `📅 <b>Data:</b> ${new Date(signal.date).toLocaleDateString('pt-PT')}\n` +
                                   `🎯 <b>Previsão:</b> ${signal.prediction}\n` +
                                   `📊 <b>Confiança:</b> ${signal.confidence}%\n` +
                                   `⏰ <b>Criado:</b> ${new Date().toLocaleString('pt-PT')}`;
                
                const mainSent = await sendTelegramMessage(env, mainMessage);
                
                if (mainSent && signal.explanation) {
                    // Mensagem secundária com explicação
                    const explanation = signal.explanation;
                    const explanationMessage = `🧠 <b>EXPLICAÇÃO DO SINAL</b>\n\n` +
                                              `📈 <b>Estatísticas das Equipas:</b>\n` +
                                              `🏠 ${explanation.teamStats.homeTeam.name}: ${explanation.teamStats.homeTeam.avgGoalsScored} golos/jogo (média)\n` +
                                              `✈️ ${explanation.teamStats.awayTeam.name}: ${explanation.teamStats.awayTeam.avgGoalsScored} golos/jogo (média)\n\n` +
                                              `🔄 <b>Forma Recente:</b>\n` +
                                              `🏠 Casa: ${explanation.recentForm.homeForm}\n` +
                                              `✈️ Fora: ${explanation.recentForm.awayForm}\n\n` +
                                              `⚔️ <b>Confrontos Diretos:</b>\n` +
                                              `📊 Últimos ${explanation.headToHead.totalMeetings} jogos: ${explanation.headToHead.homeWins}V-${explanation.headToHead.draws}E-${explanation.headToHead.awayWins}D\n` +
                                              `⚽ Média de golos: ${explanation.headToHead.avgGoalsPerGame}\n\n` +
                                              `💡 <b>Razões da Análise:</b>\n` +
                                              explanation.reasoning.map(reason => `• ${reason}`).join('\n');
                    
                    // Enviar explicação 2 segundos depois
                    setTimeout(async () => {
                        await sendTelegramMessage(env, explanationMessage);
                    }, 2000);
                }
                
                return mainSent;
  } catch (error) {
                console.error('Erro ao enviar sinal com explicação:', error);
                return false;
            }
        }

// API de utilizadores removida - SISTEMA SEM AUTENTICAÇÃO

// HTML do Dashboard SEM AUTENTICAÇÃO
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="pt" class="h-full dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alert@Postas - Sistema Principal</title>
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="shortcut icon" type="image/png" href="/logo.png">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="version" content="${Date.now()}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { darkMode: 'class' }
    </script>
    <style>
        .logo-img {
            height: 40px;
            max-height: 100%;
            object-fit: contain;
            padding: 0 8px;
        }
    </style>
</head>
<body class="h-full bg-gray-900 text-white">
    <div class="min-h-full">
            <header class="bg-gray-800 shadow-sm border-b border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
           <div class="flex items-center">
               <img src="/logo.png" alt="Alert@Postas" class="logo-img" />
           </div>
                        <div class="flex items-center space-x-4">
                            <button id="historyBtn" class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">📊</span>
                                Histórico
                            </button>
                            <button id="notificationsBtn" class="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">🔔</span>
                                Notificações
                            </button>
                            <button id="logsBtn" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">📋</span>
                                Logs
                            </button>
                            <button id="subscriptionBtn" class="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">💳</span>
                                Subscrição
                            </button>
                            <button id="subscriptionAdminBtn" class="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-2 rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">👑</span>
                                Admin
                            </button>
                            <button id="settingsBtn" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">⚙️</span>
                                Configurações
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Bot Control Panel -->
            <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 mb-8 border border-gray-700/50">
                <!-- Header -->
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span class="text-2xl">🤖</span>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-white">Controlo do Bot</h2>
                            <p class="text-gray-400 text-sm">Gerir operações e módulos de IA</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-600/50">
                        <div id="botStatusIndicator" class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span id="botStatusText" class="text-sm font-medium text-gray-300">Parado</span>
                    </div>
                </div>

                <!-- Main Control Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <!-- Operações Principais -->
                    <div class="lg:col-span-2">
                        <div class="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <span class="text-sm">⚙️</span>
                                </div>
                                Operações Principais
                            </h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button id="startBot" class="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100">
                                    <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <span class="text-lg">🚀</span>
                                    </div>
                                    <div class="text-left">
                                        <div class="font-semibold">Iniciar Bot</div>
                                        <div class="text-xs text-green-200">Ativar sistema</div>
                                    </div>
                                </button>
                                
                                <button id="stopBot" class="group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100">
                                    <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <span class="text-lg">⏹️</span>
                                    </div>
                                    <div class="text-left">
                                        <div class="font-semibold">Parar Bot</div>
                                        <div class="text-xs text-red-200">Desativar sistema</div>
                                    </div>
                                </button>
                                
                                <button id="analyzeGames" class="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 font-medium flex items-center justify-center gap-3 transform hover:scale-105">
                                    <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <span class="text-lg">🔍</span>
                                    </div>
                                    <div class="text-left">
                                        <div class="font-semibold">Analisar Jogos</div>
                                        <div class="text-xs text-blue-200">Processar dados</div>
                                    </div>
                                </button>
                                
                                <button id="refreshToken" class="group bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 font-medium flex items-center justify-center gap-3 transform hover:scale-105">
                                    <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <span class="text-lg">🔄</span>
                                    </div>
                                    <div class="text-left">
                                        <div class="font-semibold">Atualizar Token</div>
                                        <div class="text-xs text-purple-200">Renovar credenciais</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Status e Estatísticas -->
                    <div class="space-y-6">
                        <!-- Status do Sistema -->
                        <div class="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <div class="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                    <span class="text-sm">📊</span>
                                </div>
                                Status do Sistema
                            </h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Estado:</span>
                                    <span id="botStatusText" class="text-sm font-bold text-red-400">Parado</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Uptime:</span>
                                    <span class="text-sm text-gray-300">00:00:00</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Última Atividade:</span>
                                    <span class="text-sm text-gray-300">Nunca</span>
                                </div>
                            </div>
                        </div>

                        <!-- Estatísticas Rápidas -->
                        <div class="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <div class="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                                    <span class="text-sm">📈</span>
                                </div>
                                Estatísticas
                            </h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Sinais Gerados:</span>
                                    <span id="signalsGenerated" class="text-sm font-bold text-blue-400">0</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Precisão ML:</span>
                                    <span id="mlAccuracy" class="text-sm font-bold text-green-400">0%</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-400">Módulos Ativos:</span>
                                    <span id="activeModules" class="text-sm font-bold text-purple-400">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Módulos de Inteligência Artificial -->
                <div class="mt-8">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span class="text-xl">🧠</span>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">Módulos de Inteligência Artificial</h3>
                            <p class="text-gray-400 text-sm">Ativar e monitorizar módulos de ML</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- ML Over/Under Module -->
                    <div class="group bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl p-6 border border-blue-600/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                                    <span class="text-xl">📊</span>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-white">ML Over/Under</h4>
                                    <p class="text-sm text-blue-300">Análise de golos com Machine Learning</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="mlOverUnderToggle" class="sr-only peer" onchange="toggleModule('over_under', this.checked)">
                                <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Precisão:</span>
                                <span class="text-sm font-bold text-green-400" id="overUnderAccuracy">87%</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Sinais Hoje:</span>
                                <span class="text-sm font-bold text-blue-400" id="overUnderSignals">12</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Última Previsão:</span>
                                <span class="text-sm text-gray-400" id="overUnderLastPrediction">Over 2.5 (85%)</span>
                            </div>
                        </div>
                    </div>

                    <!-- ML Winner Module -->
                    <div class="group bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-2xl p-6 border border-green-600/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                                    <span class="text-xl">🏆</span>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-white">ML Winner</h4>
                                    <p class="text-sm text-green-300">Previsão de vencedor com IA</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="mlWinnerToggle" class="sr-only peer" onchange="toggleModule('winner', this.checked)">
                                <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Precisão:</span>
                                <span class="text-sm font-bold text-green-400" id="winnerAccuracy">92%</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Sinais Hoje:</span>
                                <span class="text-sm font-bold text-green-400" id="winnerSignals">8</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Última Previsão:</span>
                                <span class="text-sm text-gray-400" id="winnerLastPrediction">Casa (78%)</span>
                            </div>
                        </div>
                    </div>

                    <!-- Value Bet Module -->
                    <div class="group bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-2xl p-6 border border-purple-600/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                                    <span class="text-xl">💰</span>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-white">Value Bet</h4>
                                    <p class="text-sm text-purple-300">Detecção de apostas de valor</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="valueBetToggle" class="sr-only peer" onchange="toggleModule('value_bet', this.checked)">
                                <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Valor Médio:</span>
                                <span class="text-sm font-bold text-purple-400" id="valueBetAvgValue">+15%</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Oportunidades:</span>
                                <span class="text-sm font-bold text-purple-400" id="valueBetOpportunities">5</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Última Descoberta:</span>
                                <span class="text-sm text-gray-400" id="valueBetLastFind">Over 2.5 @ 2.1</span>
                            </div>
                        </div>
                    </div>

                    <!-- Next Goal Module -->
                    <div class="group bg-gradient-to-br from-orange-900/40 to-orange-800/20 rounded-2xl p-6 border border-orange-600/30 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-shadow">
                                    <span class="text-xl">⚽</span>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-white">Next Goal</h4>
                                    <p class="text-sm text-orange-300">Previsão do próximo golo</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="nextGoalToggle" class="sr-only peer" onchange="toggleModule('next_goal', this.checked)">
                                <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Precisão:</span>
                                <span class="text-sm font-bold text-orange-400" id="nextGoalAccuracy">79%</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Previsões Hoje:</span>
                                <span class="text-sm font-bold text-orange-400" id="nextGoalPredictions">6</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Última Previsão:</span>
                                <span class="text-sm text-gray-400" id="nextGoalLastPrediction">Casa (72%)</span>
                            </div>
                        </div>
                    </div>

                    <!-- Multiple Bets Module -->
                    <div class="group bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 rounded-2xl p-6 border border-indigo-600/30 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 lg:col-span-2">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-shadow">
                                    <span class="text-xl">🎯</span>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-white">Múltiplas Apostas</h4>
                                    <p class="text-sm text-indigo-300">Combinações inteligentes de apostas</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="multipleBetsToggle" class="sr-only peer" onchange="toggleModule('multiple', this.checked)">
                                <div class="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Combinações:</span>
                                <span class="text-sm font-bold text-indigo-400" id="multipleCombinations">3</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Taxa de Sucesso:</span>
                                <span class="text-sm font-bold text-indigo-400" id="multipleSuccessRate">68%</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                                <span class="text-sm text-gray-300">Potencial:</span>
                                <span class="text-sm font-bold text-indigo-400" id="multiplePotential">+45%</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Live Games -->
                    <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 border border-gray-600">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-white flex items-center gap-3">
                                <span class="text-2xl">🔴</span>
                                Jogos ao Vivo
                            </h2>
                            <button id="refreshLiveGames" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-red-500/25 font-medium flex items-center gap-2">
                                <span class="text-lg">🔄</span>
                                Atualizar
                            </button>
                        </div>
                        <div id="live-games-list" class="space-y-3 max-h-96 overflow-y-auto">
                            <div class="text-center text-gray-400 py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
                                <p class="text-lg font-medium">Carregando jogos ao vivo...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Calendar Horizontal -->
                    <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 border border-gray-600">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">📅</span>
                                <h2 class="text-xl font-bold text-white">Seleção de Dias</h2>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="prevWeek" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg font-medium">
                                    ←
                                </button>
                                <button id="goToday" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 font-medium">
                                    Hoje
                                </button>
                                <button id="nextWeek" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg font-medium">
                                    →
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-7 gap-2 mb-6">
                            <div id="day-0" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SEG</span>
                                <span class="text-lg font-bold" id="date-0">15</span>
                            </div>
                            <div id="day-1" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">TER</span>
                                <span class="text-lg font-bold" id="date-1">16</span>
                            </div>
                            <div id="day-2" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">QUA</span>
                                <span class="text-lg font-bold" id="date-2">17</span>
                            </div>
                            <div id="day-3" class="h-16 flex flex-col items-center justify-center p-2 border-2 border-red-500 rounded-lg cursor-pointer bg-red-900/20">
                                <span class="text-xs font-medium text-red-400">HOJE</span>
                                <span class="text-lg font-bold text-red-400" id="date-3">18</span>
                            </div>
                            <div id="day-4" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SEX</span>
                                <span class="text-lg font-bold" id="date-4">19</span>
                            </div>
                            <div id="day-5" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">SÁB</span>
                                <span class="text-lg font-bold" id="date-5">20</span>
                            </div>
                            <div id="day-6" class="h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <span class="text-xs font-medium text-gray-400">DOM</span>
                                <span class="text-lg font-bold" id="date-6">21</span>
                            </div>
                        </div>

                        <!-- Jogos do Dia Selecionado -->
                        <div class="border-t border-gray-700 pt-4">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">⚽</span>
                                    <h3 class="text-lg font-semibold" id="selectedDayTitle">
                                        Jogos - Quinta-feira, 18 de Setembro
                                    </h3>
                                    <div id="gamesLoading" class="flex items-center gap-2 text-sm text-gray-400 hidden">
                                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        Carregando...
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="selectAllGames" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm hidden">
                                        Selecionar Todos
                                    </button>
                                    <button id="deselectAllGames" class="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm hidden">
                                        Desmarcar Todos
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Barra de Pesquisa -->
                            <div class="mb-4">
                                <div class="relative">
                                    <input 
                                        type="text" 
                                        id="gamesSearch" 
                                        placeholder="Pesquisar por equipas..." 
                                        class="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                                    >
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400 text-sm">🔍</span>
                                    </div>
                                    <button id="clearSearch" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white hidden">
                                        <span class="text-lg">✕</span>
                                    </button>
                                </div>
                                <div id="searchResults" class="text-xs text-gray-400 mt-1 hidden">
                                    <!-- Resultados da pesquisa aparecerão aqui -->
                                </div>
                            </div>
                            
                            <div id="gamesError" class="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4 hidden">
                                <p class="text-red-400 text-sm" id="gamesErrorText">❌ Erro ao carregar jogos</p>
                            </div>

                            <div id="noGamesMessage" class="text-center py-8 hidden">
                                <div class="text-gray-400 mb-2">
                                    <span class="text-4xl mb-4 block">🕐</span>
                                    <p class="text-lg font-medium">Sem jogos disponíveis</p>
                                    <p class="text-sm">Não há jogos programados para esta data</p>
                                </div>
                            </div>

                            <!-- Container dos jogos com altura fixa e scroll -->
                            <div class="bg-gray-700/30 rounded-lg border border-gray-600">
                                <div id="gamesList" class="max-h-80 overflow-y-auto p-3 space-y-2">
                                    <!-- Jogos serão carregados aqui -->
                                </div>
                            </div>
                            
                            <!-- Contador de jogos selecionados -->
                            <div id="selectedGamesInfo" class="mt-3 text-sm text-gray-400 hidden">
                                <span id="selectedCount">0</span> jogos selecionados
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Signals -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">📊</span>
                            Sinais Enviados
                        </h2>
                        <div class="flex gap-2">
                            <button id="createMockSignal" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">🧠</span>
                                Criar Sinal
                            </button>
                            <button id="clearSignals" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                                <span class="text-lg">🗑️</span>
                                Limpar
                        </button>
                    </div>
                    </div>
                    <div id="signals-list" class="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto text-sm border border-gray-600">
                        <div class="text-gray-400 text-center py-4">Nenhum sinal enviado</div>
                    </div>
                </div>

                <!-- Explicações dos Sinais -->
                <div id="signalExplanations" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">🧠</span>
                            Explicação do Sinal
                        </h2>
                        <button id="closeExplanation" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <div id="explanationContent" class="space-y-6">
                        <!-- Conteúdo será preenchido dinamicamente -->
                    </div>
                </div>

                <!-- Dashboard Histórico de Performance -->
                <div id="historyPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">📊</span>
                            Histórico de Performance
                        </h2>
                        <button id="closeHistory" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <!-- Filtros -->
                    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">🔍</span>
                            Filtros
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Período</label>
                                <select id="historyPeriod" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                                    <option value="7">Última Semana</option>
                                    <option value="30" selected>Último Mês</option>
                                    <option value="90">Últimos 3 Meses</option>
                                    <option value="365">Último Ano</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Liga</label>
                                <select id="historyLeague" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                                    <option value="all">Todas as Ligas</option>
                                    <option value="Liga Portugal">Liga Portugal</option>
                                    <option value="Premier League">Premier League</option>
                                    <option value="La Liga">La Liga</option>
                                    <option value="Serie A">Serie A</option>
                                    <option value="Bundesliga">Bundesliga</option>
                                </select>
                            </div>
                            <div id="customDateRange" class="hidden">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Data Início</label>
                                <input type="date" id="historyStartDate" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                            </div>
                            <div id="customDateRangeEnd" class="hidden">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Data Fim</label>
                                <input type="date" id="historyEndDate" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                            </div>
                        </div>
                        <div class="mt-4 flex gap-2">
                            <button id="applyHistoryFilters" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium">
                                Aplicar Filtros
                            </button>
                            <button id="resetHistoryFilters" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium">
                                Resetar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Resumo de Performance -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-blue-400 mb-2" id="historyTotalSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Total Sinais</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-green-400 mb-2" id="historyGreenSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Greens</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-red-400 mb-2" id="historyRedSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Reds</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-purple-400 mb-2" id="historyWinRate">0%</div>
                            <div class="text-sm text-gray-300 font-medium">Taxa de Acerto</div>
                        </div>
                    </div>
                    
                    <!-- Gráficos -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <!-- Gráfico de Linha - Performance Diária -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">📈</span>
                                Performance Diária
                            </h3>
                            <div id="dailyChart" class="h-64 flex items-center justify-center text-gray-400">
                                <div class="text-center">
                                    <div class="text-4xl mb-2">📊</div>
                                    <div>Gráfico de Performance Diária</div>
                                    <div class="text-sm">(Simulado - em produção seria Chart.js)</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gráfico de Barras - Performance por Liga -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">🏆</span>
                                Performance por Liga
                            </h3>
                            <div id="leagueChart" class="h-64 flex items-center justify-center text-gray-400">
                                <div class="text-center">
                                    <div class="text-4xl mb-2">📊</div>
                                    <div>Gráfico por Liga</div>
                                    <div class="text-sm">(Simulado - em produção seria Chart.js)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tabela de Performance Diária -->
                    <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">📋</span>
                            Performance Detalhada
                        </h3>
                        <div id="historyTable" class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-gray-600">
                                        <th class="text-left py-3 px-4 text-gray-300">Data</th>
                                        <th class="text-center py-3 px-4 text-gray-300">Total</th>
                                        <th class="text-center py-3 px-4 text-gray-300">Greens</th>
                                        <th class="text-center py-3 px-4 text-gray-300">Reds</th>
                                        <th class="text-center py-3 px-4 text-gray-300">Taxa</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTableBody">
                                    <tr>
                                        <td colspan="5" class="text-center py-8 text-gray-400">Carregando dados...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Painel de Notificações Inteligentes -->
                <div id="notificationsPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">🔔</span>
                            Notificações Inteligentes
                        </h2>
                        <button id="closeNotifications" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <!-- Configurações de Notificações -->
                    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">⚙️</span>
                            Configurações
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="flex items-center space-x-3 mb-4">
                                    <input type="checkbox" id="notificationsEnabled" class="w-5 h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-white font-medium">Ativar Notificações</span>
                                </label>
                                <label class="flex items-center space-x-3 mb-4">
                                    <input type="checkbox" id="telegramNotifications" class="w-5 h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-white font-medium">Notificações via Telegram</span>
                                </label>
                                <label class="flex items-center space-x-3">
                                    <input type="checkbox" id="emailNotifications" class="w-5 h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-white font-medium">Notificações por Email</span>
                                </label>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Tempo de Antecipação (minutos)</label>
                                <select id="advanceTime" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white">
                                    <option value="15">15 minutos</option>
                                    <option value="30" selected>30 minutos</option>
                                    <option value="60">1 hora</option>
                                    <option value="120">2 horas</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Ligas Selecionadas -->
                        <div class="mt-6">
                            <label class="block text-sm font-medium text-gray-300 mb-3">Ligas para Notificar</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="league_liga_portugal" class="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-gray-300 text-sm">Liga Portugal</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="league_premier_league" class="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-gray-300 text-sm">Premier League</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="league_la_liga" class="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-gray-300 text-sm">La Liga</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="league_serie_a" class="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-gray-300 text-sm">Serie A</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="league_bundesliga" class="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500">
                                    <span class="text-gray-300 text-sm">Bundesliga</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="mt-6 flex gap-2">
                            <button id="saveNotificationSettings" class="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium">
                                Guardar Configurações
                            </button>
                            <button id="testNotification" class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium">
                                Testar Notificação
                            </button>
                        </div>
                    </div>
                    
                    <!-- Status das Notificações -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-orange-400 mb-2" id="totalNotifications">0</div>
                            <div class="text-sm text-gray-300 font-medium">Total Enviadas</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-green-400 mb-2" id="successNotifications">0</div>
                            <div class="text-sm text-gray-300 font-medium">Enviadas com Sucesso</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-blue-400 mb-2" id="upcomingGames">0</div>
                            <div class="text-sm text-gray-300 font-medium">Jogos Próximos</div>
                        </div>
                    </div>
                    
                    <!-- Histórico de Notificações -->
                    <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">📋</span>
                            Histórico de Notificações
                        </h3>
                        <div id="notificationsHistory" class="space-y-3 max-h-64 overflow-y-auto">
                            <div class="text-center py-8 text-gray-400">Carregando histórico...</div>
                        </div>
                    </div>
                </div>

                <!-- Painel de Logs e Auditoria -->
                <div id="logsPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">📋</span>
                            Logs e Auditoria
                            <span class="text-sm bg-red-600 text-white px-2 py-1 rounded-full">Super Admin</span>
                        </h2>
                        <button id="closeLogs" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <!-- Filtros de Logs -->
                    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">🔍</span>
                            Filtros
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Tipo de Evento</label>
                                <select id="logEventType" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white">
                                    <option value="all">Todos os Eventos</option>
                                    <option value="API_FAILURE">Falhas da API</option>
                                    <option value="SIGNAL_GENERATED">Geração de Sinais</option>
                                    <option value="REPORT_SENT">Envio de Relatórios</option>
                                    <option value="NOTIFICATION_SENT">Notificações</option>
                                    <option value="USER_ACTION">Ações do Utilizador</option>
                                    <option value="SYSTEM_EVENT">Eventos do Sistema</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Utilizador</label>
                                <select id="logUser" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white">
                                    <option value="all">Todos os Utilizadores</option>
                                    <option value="system">Sistema</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">Utilizador</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Limite</label>
                                <select id="logLimit" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white">
                                    <option value="50">50 logs</option>
                                    <option value="100" selected>100 logs</option>
                                    <option value="200">200 logs</option>
                                    <option value="500">500 logs</option>
                                </select>
                            </div>
                            <div class="flex items-end">
                                <button id="applyLogFilters" class="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium">
                                    Aplicar Filtros
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Estatísticas de Logs -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-red-400 mb-2" id="totalLogs">0</div>
                            <div class="text-sm text-gray-300 font-medium">Total de Logs</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-orange-400 mb-2" id="apiFailures">0</div>
                            <div class="text-sm text-gray-300 font-medium">Falhas da API</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-green-400 mb-2" id="signalsGenerated">0</div>
                            <div class="text-sm text-gray-300 font-medium">Sinais Gerados</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-blue-400 mb-2" id="last24hLogs">0</div>
                            <div class="text-sm text-gray-300 font-medium">Últimas 24h</div>
                        </div>
                    </div>
                    
                    <!-- Tabela de Logs -->
                    <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">📊</span>
                            Logs de Auditoria
                        </h3>
                        <div id="logsTable" class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-gray-600">
                                        <th class="text-left py-3 px-4 text-gray-300">Timestamp</th>
                                        <th class="text-left py-3 px-4 text-gray-300">Tipo</th>
                                        <th class="text-left py-3 px-4 text-gray-300">Detalhe</th>
                                        <th class="text-left py-3 px-4 text-gray-300">Utilizador</th>
                                    </tr>
                                </thead>
                                <tbody id="logsTableBody">
                                    <tr>
                                        <td colspan="4" class="text-center py-8 text-gray-400">Carregando logs...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Paginação -->
                        <div id="logsPagination" class="mt-4 flex justify-between items-center">
                            <div class="text-sm text-gray-400">
                                Mostrando <span id="logsShowing">0</span> de <span id="logsTotal">0</span> logs
                            </div>
                            <div class="flex gap-2">
                                <button id="prevLogs" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50" disabled>
                                    Anterior
                                </button>
                                <button id="nextLogs" class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50" disabled>
                                    Próximo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Commentator Panel -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">🎙️</span>
                            Painel do Comentador
                        </h2>
                        <button id="clearCommentator" class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">🗑️</span>
                            Limpar
                        </button>
                    </div>
                    <div id="commentator-panel" class="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm border border-gray-600">
                        <div class="text-gray-400 text-center py-4">Sistema iniciado - Aguardando ações...</div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600">
                    <h2 class="text-xl font-bold text-white flex items-center gap-3 mb-6">
                        <span class="text-2xl">📈</span>
                        Estatísticas
                    </h2>
                    <div id="stats-display" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500 hover:shadow-lg transition-all duration-200">
                            <div class="text-3xl font-bold text-blue-400 mb-2" id="totalSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Total Sinais</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500 hover:shadow-lg transition-all duration-200">
                            <div class="text-3xl font-bold text-green-400 mb-2" id="greenSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Greens</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500 hover:shadow-lg transition-all duration-200">
                            <div class="text-3xl font-bold text-red-400 mb-2" id="redSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Reds</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500 hover:shadow-lg transition-all duration-200">
                            <div class="text-3xl font-bold text-yellow-400 mb-2" id="pendingSignals">0</div>
                            <div class="text-sm text-gray-300 font-medium">Pendentes</div>
                        </div>
                    </div>
                </div>

                <!-- Configurações (Apenas para Super Admin) -->
                <div id="settingsPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">⚙️</span>
                            Configurações do Sistema
                        </h2>
                        <button id="closeSettings" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                        </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- API Configuration -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">🔑</span>
                                Configuração da API
                            </h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">API Football Key</label>
                                    <input type="password" id="apiKey" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Insira a chave da API">
                        </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Limite de Chamadas por Hora</label>
                                    <input type="number" id="apiLimit" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="100" min="1" max="1000">
                        </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                                    <select id="timezone" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                                        <option value="Europe/Lisbon">Europe/Lisbon (Portugal)</option>
                                        <option value="Europe/London">Europe/London (UK)</option>
                                        <option value="Europe/Madrid">Europe/Madrid (Espanha)</option>
                                        <option value="America/New_York">America/New_York (EUA)</option>
                                    </select>
                        </div>
                    </div>
                </div>

                        <!-- Bot Configuration -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">🤖</span>
                                Configurações do Bot
                            </h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Threshold de Sinais (%)</label>
                                    <input type="number" id="signalThreshold" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="85" min="50" max="100">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Máximo de Sinais por Dia</label>
                                    <input type="number" id="maxSignalsPerDay" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="50" min="1" max="200">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Horário do Relatório Diário</label>
                                    <input type="time" id="dailyReportTime" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="23:59">
                                </div>
                            </div>
                        </div>

                        <!-- Telegram Configuration -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">📱</span>
                                Configuração do Telegram
                            </h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Token do Bot</label>
                                    <input type="password" id="telegramToken" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Insira o token do bot">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">ID do Grupo</label>
                                    <input type="text" id="telegramGroupId" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="-1001234567890">
                                </div>
                                <div class="flex items-center">
                                    <input type="checkbox" id="telegramEnabled" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500">
                                    <label class="ml-2 text-sm text-gray-300">Ativar notificações do Telegram</label>
                                </div>
                            </div>
                        </div>

                        <!-- System Status -->
                        <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span class="text-xl">📊</span>
                                Status do Sistema
                            </h3>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">API Football</span>
                                    <span id="apiStatus" class="px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">Conectado</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Telegram Bot</span>
                                    <span id="telegramStatus" class="px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">Ativo</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Cron Jobs</span>
                                    <span id="cronStatus" class="px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">Executando</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Última Atualização</span>
                                    <span id="lastUpdate" class="text-gray-400 text-sm">Agora</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="mt-8 flex justify-end">
                        <button id="saveSettings" class="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-green-500/25 font-medium flex items-center gap-2">
                            <span class="text-lg">💾</span>
                            Guardar Configurações
                        </button>
                    </div>
                </div>

                <!-- Página de Subscrição -->
                <div id="subscriptionPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">💳</span>
                            Gestão de Subscrição
                        </h2>
                        <button id="closeSubscription" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <!-- Status da Subscrição -->
                    <div id="subscriptionStatus" class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">📊</span>
                            Status Atual
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-4 rounded-lg text-center border border-gray-500">
                                <div class="text-2xl font-bold text-blue-400 mb-2" id="currentStatus">Trial</div>
                                <div class="text-sm text-gray-300">Status da Subscrição</div>
                            </div>
                            <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-4 rounded-lg text-center border border-gray-500">
                                <div class="text-2xl font-bold text-green-400 mb-2" id="currentPlan">Trial</div>
                                <div class="text-sm text-gray-300">Plano Atual</div>
                            </div>
                            <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-4 rounded-lg text-center border border-gray-500">
                                <div class="text-2xl font-bold text-yellow-400 mb-2" id="daysLeft">7</div>
                                <div class="text-sm text-gray-300">Dias Restantes</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Planos Disponíveis -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <!-- Plano Mensal -->
                        <div class="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-600 hover:shadow-lg transition-all duration-200">
                            <div class="text-center mb-6">
                                <h3 class="text-2xl font-bold text-white mb-2">Plano Mensal</h3>
                                <div class="text-4xl font-bold text-blue-300 mb-2">€29.99</div>
                                <div class="text-gray-300">por mês</div>
                            </div>
                            <ul class="space-y-3 mb-6">
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Acesso completo aos sinais
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Notificações em tempo real
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Relatórios diários
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Suporte prioritário
                                </li>
                            </ul>
                            <button id="subscribeMonthly" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium">
                                Subcrever Mensal
                            </button>
                        </div>
                        
                        <!-- Plano Anual -->
                        <div class="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-6 border border-purple-600 hover:shadow-lg transition-all duration-200 relative">
                            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span class="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                                    MAIS POPULAR
                                </span>
                            </div>
                            <div class="text-center mb-6">
                                <h3 class="text-2xl font-bold text-white mb-2">Plano Anual</h3>
                                <div class="text-4xl font-bold text-purple-300 mb-2">€299.99</div>
                                <div class="text-gray-300">por ano</div>
                                <div class="text-green-400 text-sm font-medium">Poupe 17%!</div>
                            </div>
                            <ul class="space-y-3 mb-6">
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Acesso completo aos sinais
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Notificações em tempo real
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Relatórios diários
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Suporte prioritário
                                </li>
                                <li class="flex items-center text-gray-300">
                                    <span class="text-green-400 mr-2">✅</span>
                                    Análises exclusivas
                                </li>
                            </ul>
                            <button id="subscribeYearly" class="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium">
                                Subcrever Anual
                            </button>
                        </div>
                    </div>
                    
                    <!-- Histórico de Pagamentos -->
                    <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span class="text-xl">📋</span>
                            Histórico de Pagamentos
                        </h3>
                        <div id="paymentHistory" class="space-y-3">
                            <div class="text-center text-gray-400 py-4">
                                Nenhum pagamento encontrado
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Painel Admin de Subscrições -->
                <div id="subscriptionAdminPanel" class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 mt-8 border border-gray-600 hidden">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-white flex items-center gap-3">
                            <span class="text-2xl">👑</span>
                            Painel Admin - Subscrições
                        </h2>
                        <button id="closeSubscriptionAdmin" class="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg font-medium flex items-center gap-2">
                            <span class="text-lg">✕</span>
                            Fechar
                        </button>
                    </div>
                    
                    <!-- Estatísticas -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-blue-400 mb-2" id="totalUsers">0</div>
                            <div class="text-sm text-gray-300 font-medium">Total Utilizadores</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-green-400 mb-2" id="activeSubscriptions">0</div>
                            <div class="text-sm text-gray-300 font-medium">Subscrições Ativas</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-red-400 mb-2" id="expiredSubscriptions">0</div>
                            <div class="text-sm text-gray-300 font-medium">Subscrições Expiradas</div>
                        </div>
                        <div class="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-center border border-gray-500">
                            <div class="text-3xl font-bold text-yellow-400 mb-2" id="trialUsers">0</div>
                            <div class="text-sm text-gray-300 font-medium">Utilizadores Trial</div>
                        </div>
                    </div>
                    
                    <!-- Lista de Utilizadores -->
                    <div class="bg-gray-900 rounded-xl p-6 border border-gray-600">
                        <h3 class="text-lg font-bold text-white mb-4">Lista de Subscritores</h3>
                        <div id="usersList" class="space-y-3">
                            <div class="text-center text-gray-400 py-4">
                                Carregando utilizadores...
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seção de utilizadores removida - SISTEMA SEM AUTENTICAÇÃO -->
            </main>
    </div>

    <script>
        // Forçar modo escuro
        document.documentElement.classList.add('dark');

        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema Alert@Postas iniciado - alertapostas.pt');
            addCommentatorLog('🎯 Sistema Alert@Postas iniciado com sucesso', 'success');
            loadData();
            setupEventListeners();
            updateModuleStats(); // Inicializar estatísticas dos módulos
            
            // Inicializar calendário após um pequeno delay
            setTimeout(() => {
                if (document.getElementById('day-0')) {
                    initializeCalendar();
                }
            }, 100);
        });



        // Estado do bot
        let botState = {
            isRunning: false,
            modules: {
                mlOverUnder: false,
                mlWinner: false,
                valueBet: false,
                nextGoal: false
            },
            stats: {
                mlAccuracy: 0,
                signalsGenerated: 0,
                activeModules: 0
            }
        };

        // Funções de controlo do bot
        async function startBot() {
            try {
                showLoading('startBot', 'Iniciando...');
                const response = await fetch('/api/start-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    botState.isRunning = true;
                    updateBotStatus('running');
                    showToast('Bot iniciado com sucesso!', 'success');
                    addCommentatorLog('🚀 Bot iniciado com sucesso', 'success');
                } else {
                    throw new Error(data.message || 'Falha ao iniciar bot');
                }
            } catch (error) {
                showToast('Erro ao iniciar bot: ' + error.message, 'error');
                addCommentatorLog('❌ Erro ao iniciar bot: ' + error.message, 'error');
            } finally {
                hideLoading('startBot', 'Iniciar Bot');
            }
        }

        async function stopBot() {
            try {
                showLoading('stopBot', 'Parando...');
                const response = await fetch('/api/stop-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    botState.isRunning = false;
                    updateBotStatus('stopped');
                    showToast('Bot parado com sucesso!', 'success');
                    addCommentatorLog('⏹️ Bot parado', 'info');
                } else {
                    throw new Error(data.message || 'Falha ao parar bot');
                }
            } catch (error) {
                showToast('Erro ao parar bot: ' + error.message, 'error');
                addCommentatorLog('❌ Erro ao parar bot: ' + error.message, 'error');
            } finally {
                hideLoading('stopBot', 'Parar Bot');
            }
        }

        async function analyzeGames() {
            try {
                showLoading('analyzeGames', 'Analisando...');
                const response = await fetch('/api/analyze-games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    showToast('Análise concluída: ' + data.signals + ' sinais gerados', 'success');
                    addCommentatorLog('🔍 Análise concluída: ' + data.signals + ' sinais', 'success');
                    updateStats();
                } else {
                    throw new Error(data.message || 'Falha na análise');
                }
            } catch (error) {
                showToast('Erro na análise: ' + error.message, 'error');
                addCommentatorLog('❌ Erro na análise: ' + error.message, 'error');
            } finally {
                hideLoading('analyzeGames', 'Analisar Jogos');
            }
        }

        async function refreshToken() {
            try {
                showLoading('refreshToken', 'Atualizando...');
                const response = await fetch('/api/update-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    showToast('Token atualizado com sucesso!', 'success');
                    addCommentatorLog('🔄 Token atualizado', 'success');
                } else {
                    throw new Error(data.message || 'Falha ao atualizar token');
                }
            } catch (error) {
                showToast('Erro ao atualizar token: ' + error.message, 'error');
                addCommentatorLog('❌ Erro ao atualizar token: ' + error.message, 'error');
            } finally {
                hideLoading('refreshToken', 'Atualizar Token');
            }
        }

        // Função para alternar módulos
        async function toggleModule(moduleName, enabled) {
            try {
                const response = await fetch('/api/v1/bot/module', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        module: moduleName,
                        enabled: enabled
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    const status = enabled ? 'ativado' : 'desativado';
                    showToast('Módulo ' + moduleName + ' ' + status + '!', 'success');
                    addCommentatorLog('🔧 Módulo ' + moduleName + ' ' + status, 'info');
                    updateModuleStats();
                } else {
                    throw new Error(data.message || 'Falha ao alterar módulo');
                }
            } catch (error) {
                showToast('Erro ao alterar módulo: ' + error.message, 'error');
                addCommentatorLog('❌ Erro ao alterar módulo: ' + error.message, 'error');
                // Reverter o toggle em caso de erro
                const toggle = document.getElementById(moduleName + 'Toggle');
                if (toggle) toggle.checked = !enabled;
            }
        }

        // Função para atualizar estatísticas dos módulos
        function updateModuleStats() {
            // Simular dados dos módulos
            const moduleStats = {
                over_under: { accuracy: 87, signals: 12, lastPrediction: 'Over 2.5 (85%)' },
                winner: { accuracy: 92, signals: 8, lastPrediction: 'Casa (78%)' },
                value_bet: { avgValue: '+15%', opportunities: 5, lastFind: 'Over 2.5 @ 2.1' },
                next_goal: { accuracy: 79, predictions: 6, lastPrediction: 'Casa (72%)' },
                multiple: { combinations: 3, successRate: 68, potential: '+45%' }
            };

            // Atualizar Over/Under
            document.getElementById('overUnderAccuracy').textContent = moduleStats.over_under.accuracy + '%';
            document.getElementById('overUnderSignals').textContent = moduleStats.over_under.signals;
            document.getElementById('overUnderLastPrediction').textContent = moduleStats.over_under.lastPrediction;

            // Atualizar Winner
            document.getElementById('winnerAccuracy').textContent = moduleStats.winner.accuracy + '%';
            document.getElementById('winnerSignals').textContent = moduleStats.winner.signals;
            document.getElementById('winnerLastPrediction').textContent = moduleStats.winner.lastPrediction;

            // Atualizar Value Bet
            document.getElementById('valueBetAvgValue').textContent = moduleStats.value_bet.avgValue;
            document.getElementById('valueBetOpportunities').textContent = moduleStats.value_bet.opportunities;
            document.getElementById('valueBetLastFind').textContent = moduleStats.value_bet.lastFind;

            // Atualizar Next Goal
            document.getElementById('nextGoalAccuracy').textContent = moduleStats.next_goal.accuracy + '%';
            document.getElementById('nextGoalPredictions').textContent = moduleStats.next_goal.predictions;
            document.getElementById('nextGoalLastPrediction').textContent = moduleStats.next_goal.lastPrediction;

            // Atualizar Multiple
            document.getElementById('multipleCombinations').textContent = moduleStats.multiple.combinations;
            document.getElementById('multipleSuccessRate').textContent = moduleStats.multiple.successRate + '%';
            document.getElementById('multiplePotential').textContent = moduleStats.multiple.potential;
        }

        function updateBotStatus(status) {
            const indicator = document.getElementById('botStatusIndicator');
            const text = document.getElementById('botStatusText');
            
            if (status === 'running') {
                indicator.className = 'w-3 h-3 bg-green-500 rounded-full animate-pulse';
                text.textContent = 'Ativo';
            } else {
                indicator.className = 'w-3 h-3 bg-red-500 rounded-full';
                text.textContent = 'Parado';
            }
        }

        function updateStats() {
            document.getElementById('mlAccuracy').textContent = botState.stats.mlAccuracy + '%';
            document.getElementById('signalsGenerated').textContent = botState.stats.signalsGenerated;
            document.getElementById('activeModules').textContent = botState.stats.activeModules;
        }

        function showLoading(buttonId, text) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>' + text;
                button.classList.add('opacity-75', 'cursor-not-allowed');
            }
        }

        function hideLoading(buttonId, originalText) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText;
                button.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }

        function showToast(message, type = 'info') {
            // Criar elemento toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl text-white font-medium transform transition-all duration-300 translate-x-full flex items-center gap-3 max-w-sm';
            
            // Ícone baseado no tipo
            let icon = '';
            if (type === 'success') {
                toast.className += ' bg-gradient-to-r from-green-500 to-green-600';
                icon = '✅';
            } else if (type === 'error') {
                toast.className += ' bg-gradient-to-r from-red-500 to-red-600';
                icon = '❌';
            } else {
                toast.className += ' bg-gradient-to-r from-blue-500 to-blue-600';
                icon = 'ℹ️';
            }
            
            toast.innerHTML = '<span class="text-xl">' + icon + '</span>' +
                '<span class="flex-1">' + message + '</span>' +
                '<button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200 ml-2">' +
                '<span class="text-lg">&times;</span>' +
                '</button>';
            
            document.body.appendChild(toast);
            
            // Animar entrada
            setTimeout(() => {
                toast.classList.remove('translate-x-full');
            }, 100);
            
            // Remover após 4 segundos
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add('translate-x-full');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }
            }, 4000);
        }

        function showSuccess(message) {
            showToast(message, 'success');
        }

        function showError(message) {
            showToast(message, 'error');
        }

        async function toggleModule(moduleName, enabled) {
            try {
                botState.modules[moduleName] = enabled;
                updateActiveModulesCount();
                
                const response = await fetch('/api/v1/bot/module', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module: moduleName, enabled: enabled })
                });
                
                if (response.ok) {
                    const status = enabled ? 'ativado' : 'desativado';
                    showSuccess('Módulo ' + moduleName + ' ' + status);
                    addCommentatorLog('🧠 Módulo ' + moduleName + ' ' + status, 'info');
                } else {
                    throw new Error('Falha ao alterar módulo');
                }
            } catch (error) {
                showError('Erro ao alterar módulo: ' + error.message);
                addCommentatorLog('❌ Erro ao alterar módulo: ' + error.message, 'error');
            }
        }

        function updateActiveModulesCount() {
            botState.stats.activeModules = Object.values(botState.modules).filter(Boolean).length;
            updateStats();
        }

        function setupEventListeners() {
            
            // Botões do bot
            const startBotBtn = document.getElementById('startBot');
            const stopBotBtn = document.getElementById('stopBot');
            const analyzeGamesBtn = document.getElementById('analyzeGames');
            const refreshTokenBtn = document.getElementById('refreshToken');
            
            if (startBotBtn) startBotBtn.addEventListener('click', startBot);
            if (stopBotBtn) stopBotBtn.addEventListener('click', stopBot);
            if (analyzeGamesBtn) analyzeGamesBtn.addEventListener('click', analyzeGames);
            if (refreshTokenBtn) refreshTokenBtn.addEventListener('click', refreshToken);

            // Módulos ML
            const mlOverUnderToggle = document.getElementById('mlOverUnderToggle');
            const mlWinnerToggle = document.getElementById('mlWinnerToggle');
            const valueBetToggle = document.getElementById('valueBetToggle');
            const nextGoalToggle = document.getElementById('nextGoalToggle');

            if (mlOverUnderToggle) mlOverUnderToggle.addEventListener('change', (e) => toggleModule('over_under', e.target.checked));
            if (mlWinnerToggle) mlWinnerToggle.addEventListener('change', (e) => toggleModule('winner', e.target.checked));
            if (valueBetToggle) valueBetToggle.addEventListener('change', (e) => toggleModule('value_bet', e.target.checked));
            if (nextGoalToggle) nextGoalToggle.addEventListener('change', (e) => toggleModule('next_goal', e.target.checked));
            
            // Módulo de múltiplas apostas
            const multipleBetsToggle = document.getElementById('multipleBetsToggle');
            if (multipleBetsToggle) multipleBetsToggle.addEventListener('change', (e) => toggleModule('multiple', e.target.checked));
            
            // Botões de refresh
            const refreshGames = document.getElementById('refreshGames');
            const refreshLiveGames = document.getElementById('refreshLiveGames');
            
            if (refreshGames) refreshGames.addEventListener('click', loadFutureGames);
            if (refreshLiveGames) refreshLiveGames.addEventListener('click', loadLiveGames);
            
            // Pesquisa e comentador
            const gameSearch = document.getElementById('gameSearch');
            const clearCommentator = document.getElementById('clearCommentator');
            
            if (gameSearch) gameSearch.addEventListener('input', filterGames);
            if (clearCommentator) clearCommentator.addEventListener('click', function() {
                document.getElementById('commentator-panel').innerHTML = '<div class="text-gray-400">Logs limpos</div>';
            });
            
            // Configurações
            const settingsBtn = document.getElementById('settingsBtn');
            const closeSettings = document.getElementById('closeSettings');
            const saveSettings = document.getElementById('saveSettings');
            
            if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
            if (closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);
            if (saveSettings) saveSettings.addEventListener('click', saveSettingsConfig);
            
            // Subscrições
            const subscriptionBtn = document.getElementById('subscriptionBtn');
            const subscriptionAdminBtn = document.getElementById('subscriptionAdminBtn');
            const closeSubscription = document.getElementById('closeSubscription');
            const subscribeMonthly = document.getElementById('subscribeMonthly');
            const subscribeYearly = document.getElementById('subscribeYearly');
            const closeSubscriptionAdmin = document.getElementById('closeSubscriptionAdmin');
            
            if (subscriptionBtn) subscriptionBtn.addEventListener('click', openSubscription);
            if (subscriptionAdminBtn) subscriptionAdminBtn.addEventListener('click', openSubscriptionAdmin);
            if (closeSubscription) closeSubscription.addEventListener('click', closeSubscriptionPanel);
            if (subscribeMonthly) subscribeMonthly.addEventListener('click', () => createSubscription('monthly'));
            if (subscribeYearly) subscribeYearly.addEventListener('click', () => createSubscription('yearly'));
            if (closeSubscriptionAdmin) closeSubscriptionAdmin.addEventListener('click', closeSubscriptionAdminPanel);
            
            // Explicações dos Sinais
            const createMockSignal = document.getElementById('createMockSignal');
            const closeExplanation = document.getElementById('closeExplanation');
            
            if (createMockSignal) createMockSignal.addEventListener('click', createAndShowMockSignal);
            if (closeExplanation) closeExplanation.addEventListener('click', closeExplanationPanel);
            
            // Histórico de Performance
            const historyBtn = document.getElementById('historyBtn');
            const closeHistory = document.getElementById('closeHistory');
            const applyHistoryFilters = document.getElementById('applyHistoryFilters');
            const resetHistoryFilters = document.getElementById('resetHistoryFilters');
            const historyPeriod = document.getElementById('historyPeriod');
            
            if (historyBtn) historyBtn.addEventListener('click', openHistoryPanel);
            if (closeHistory) closeHistory.addEventListener('click', closeHistoryPanel);
            if (applyHistoryFilters) applyHistoryFilters.addEventListener('click', loadHistoryData);
            if (resetHistoryFilters) resetHistoryFilters.addEventListener('click', resetHistoryFilters);
            if (historyPeriod) historyPeriod.addEventListener('change', toggleCustomDateRange);
            
            // Notificações Inteligentes
            const notificationsBtn = document.getElementById('notificationsBtn');
            const closeNotifications = document.getElementById('closeNotifications');
            const saveNotificationSettings = document.getElementById('saveNotificationSettings');
            const testNotification = document.getElementById('testNotification');
            
            if (notificationsBtn) notificationsBtn.addEventListener('click', openNotificationsPanel);
            if (closeNotifications) closeNotifications.addEventListener('click', closeNotificationsPanel);
            if (saveNotificationSettings) saveNotificationSettings.addEventListener('click', saveNotificationConfig);
            if (testNotification) testNotification.addEventListener('click', testNotificationSend);
            
            // Logs e Auditoria
            const logsBtn = document.getElementById('logsBtn');
            const closeLogs = document.getElementById('closeLogs');
            const applyLogFilters = document.getElementById('applyLogFilters');
            const prevLogs = document.getElementById('prevLogs');
            const nextLogs = document.getElementById('nextLogs');
            
            if (logsBtn) logsBtn.addEventListener('click', openLogsPanel);
            if (closeLogs) closeLogs.addEventListener('click', closeLogsPanel);
            if (applyLogFilters) applyLogFilters.addEventListener('click', loadLogsData);
            if (prevLogs) prevLogs.addEventListener('click', () => changeLogsPage(-1));
            if (nextLogs) nextLogs.addEventListener('click', () => changeLogsPage(1));
        }

        async function botAction(action) {
            try {
                const response = await fetch('/api/v1/bot/control', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
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
                alert('❌ Erro na ação do bot: ' + error.message);
            }
        }

        async function updateBotStatus() {
            try {
                const response = await fetch('/api/v1/bot/control');
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
            await Promise.all([
                loadLiveGames(),
                loadFutureGames(),
                loadStats(),
                loadCommentatorLogs()
            ]);
        }

        async function loadFutureGames() {
            try {
                const response = await fetch('/api/v1/future-games');
                const games = await response.json();
                displayFutureGames(games);
            } catch (error) {
                console.error('Error loading games:', error);
            }
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/v1/stats');
                if (!response.ok) {
                    throw new Error('Falha ao carregar estatísticas: ' + response.status);
                }
                const data = await response.json();
                if (data.status === 'ok') {
                    displayStats(data.stats);
                } else {
                    throw new Error(data.message || 'Erro ao carregar estatísticas');
                }
            } catch (error) {
                console.error('Error loading stats:', error);
                showToast('Erro ao carregar estatísticas: ' + error.message, 'error');
            }
        }

        function displayFutureGames(games) {
            const container = document.getElementById('future-games-list');
            
            if (games.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-4">Sem jogos disponíveis</div>';
                return;
            }

            const gamesHtml = games.slice(0, 20).map(game => {
                const gameDate = new Date(game.date).toLocaleDateString('pt-PT');
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                return '<div class="game-item p-3 bg-gray-700 rounded-lg">' +
                    '<div class="font-semibold text-sm">' + game.home_team + ' vs ' + game.away_team + '</div>' +
                    '<div class="text-xs text-gray-400">' + game.league + ' - ' + gameDate + ' às ' + gameTime + '</div>' +
                    '</div>';
            }).join('');

            container.innerHTML = gamesHtml;
        }

        function displayStats(stats) {
            document.getElementById('totalSignals').textContent = stats.total_signals;
            document.getElementById('greenSignals').textContent = stats.greens;
            document.getElementById('redSignals').textContent = stats.reds;
            document.getElementById('pendingSignals').textContent = stats.pending;
        }

        // Funções para jogos ao vivo
        async function loadLiveGames() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch('/api/games?date=' + today);
                if (!response.ok) {
                    throw new Error('Falha ao carregar jogos: ' + response.status);
                }
                const data = await response.json();
                if (data.success) {
                    displayLiveGames(data.games);
                } else {
                    throw new Error(data.error || 'Erro ao carregar jogos');
                }
            } catch (error) {
                console.error('Error loading live games:', error);
                displayLiveGames([]);
                showToast('Erro ao carregar jogos ao vivo: ' + error.message, 'error');
            }
        }

        function displayLiveGames(games) {
            const container = document.getElementById('live-games-list');
            
            if (!games || games.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-8">' +
                    '<div class="text-4xl mb-2">⚽</div>' +
                    '<p class="text-lg font-medium">Sem jogos no momento</p>' +
                    '<p class="text-sm">Não há jogos disponíveis</p>' +
                    '</div>';
                return;
            }

            const gamesHtml = games.map(game => {
                // Determinar cor do status baseado no estado
                let statusColor = 'bg-gray-600';
                let statusText = game.estado;
                
                if (game.estado === 'Ao Vivo' || game.estado === '1º Tempo' || game.estado === '2º Tempo') {
                    statusColor = 'bg-red-600';
                } else if (game.estado === 'Terminado') {
                    statusColor = 'bg-green-600';
                } else if (game.estado === 'Agendado') {
                    statusColor = 'bg-blue-600';
                } else if (game.estado === 'Intervalo') {
                    statusColor = 'bg-yellow-600';
                }

                // Mostrar resultado se disponível
                const score = (game.goals_home !== null && game.goals_away !== null) 
                    ? game.goals_home + ' - ' + game.goals_away
                    : 'vs';
                
                return '<div class="p-3 bg-gray-800/50 border border-gray-600 rounded-lg hover:bg-gray-800/70 transition-colors">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<div class="font-semibold text-sm text-gray-100">' + game.equipaCasa + ' ' + score + ' ' + game.equipaFora + '</div>' +
                        '<div class="' + statusColor + ' text-white px-2 py-1 rounded text-xs">' + statusText + '</div>' +
                    '</div>' +
                    '<div class="text-xs text-gray-300 mb-2">' + game.liga + (game.country ? ' • ' + game.country : '') + '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<div class="text-xs text-gray-400">' + game.hora + (game.elapsed ? ' (' + game.elapsed + '\')' : '') + '</div>' +
                        '<div class="text-xs text-gray-500">ID: ' + game.id + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            container.innerHTML = gamesHtml;
        }

        // Funções para comentador
        async function loadCommentatorLogs() {
            try {
                const response = await fetch('/api/v1/commentator');
                const logs = await response.json();
                displayCommentatorLogs(logs);
            } catch (error) {
                console.error('Error loading commentator logs:', error);
            }
        }

        function displayCommentatorLogs(logs) {
            const container = document.getElementById('commentator-panel');
            
            if (logs.length === 0) {
                container.innerHTML = '<div class="text-gray-400">Sistema iniciado - Aguardando ações...</div>';
                return;
            }

            const logsHtml = logs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString('pt-PT');
                const colorClass = log.type === 'success' ? 'text-green-400' : 
                                 log.type === 'warning' ? 'text-yellow-400' : 
                                 log.type === 'error' ? 'text-red-400' : 'text-blue-400';
                
                return '<div class="' + colorClass + '">[' + time + '] ' + log.message + '</div>';
            }).join('');

            container.innerHTML = logsHtml;
            container.scrollTop = container.scrollHeight;
        }

        // Função de pesquisa
        function filterGames() {
            const searchInput = document.getElementById('gameSearch');
            if (!searchInput) return;
            
            const searchTerm = searchInput.value.toLowerCase();
            const container = document.getElementById('future-games-list');
            if (!container) return;
            
            const gameElements = container.querySelectorAll('.game-item');
            
            gameElements.forEach(element => {
                const gameText = element.textContent.toLowerCase();
                if (gameText.includes(searchTerm)) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            });
        }

        // Função para adicionar logs ao comentador (frontend)
        async function addCommentatorLog(message, type = 'info') {
            try {
                await fetch('/api/v1/commentator', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message, type })
                });
            } catch (error) {
                console.error('Error adding commentator log:', error);
            }
        }

        // Funções de utilizadores removidas - SISTEMA SEM AUTENTICAÇÃO

        // Funções de Subscrições
        async function handleCreateSubscriptionSession(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const body = await request.json();
                const { userId, planType = 'monthly' } = body;
                
                console.log('Criando sessão de pagamento para utilizador:', userId, 'plano:', planType);
                addCommentatorLog('💳 Criando sessão de pagamento para utilizador: ' + userId, 'info');
                
                // Mock do Stripe - em produção seria uma chamada real
                const mockSession = {
                    id: 'cs_mock_' + Date.now(),
                    url: 'https://checkout.stripe.com/mock-session',
                    customer: userId,
                    plan: planType,
                    amount: planType === 'monthly' ? 2999 : 29999, // €29.99 ou €299.99
                    currency: 'eur',
                    status: 'open',
                    created_at: new Date().toISOString()
                };
                
                // Guardar sessão no storage
                storage.subscriptions.push({
                    sessionId: mockSession.id,
                    userId: userId,
                    planType: planType,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
                
                addCommentatorLog('✅ Sessão de pagamento criada: ' + mockSession.id, 'success');
                
                return new Response(JSON.stringify(mockSession), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao criar sessão de pagamento:', error);
                addCommentatorLog('❌ Erro ao criar sessão de pagamento: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleSubscriptionWebhook(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const body = await request.json();
                const { type, data } = body;
                
                console.log('Webhook Stripe recebido:', type);
                addCommentatorLog('🔔 Webhook Stripe recebido: ' + type, 'info');
                
                if (type === 'checkout.session.completed') {
                    const session = data.object;
                    const subscription = storage.subscriptions.find(sub => sub.sessionId === session.id);
                    
                    if (subscription) {
                        // Atualizar status da subscrição
                        subscription.status = 'active';
                        subscription.paymentId = session.payment_intent;
                        subscription.updatedAt = new Date().toISOString();
                        
                        // Atualizar utilizador
                        let user = storage.users.find(u => u.id === subscription.userId);
                        if (!user) {
                            user = {
                                id: subscription.userId,
                                email: 'user@example.com',
                                subscription_status: 'active',
                                subscription_plan: subscription.planType,
                                subscription_start: new Date().toISOString(),
                                created_at: new Date().toISOString()
                            };
                            storage.users.push(user);
                        } else {
                            user.subscription_status = 'active';
                            user.subscription_plan = subscription.planType;
                            user.subscription_start = new Date().toISOString();
                        }
                        
                        addCommentatorLog('✅ Subscrição ativada para utilizador: ' + subscription.userId, 'success');
                    }
                }
                
                return new Response(JSON.stringify({ received: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro no webhook:', error);
                addCommentatorLog('❌ Erro no webhook: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleSubscriptionStatus(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const url = new URL(request.url);
                const userId = url.searchParams.get('userId') || 'default';
                
                let user = storage.users.find(u => u.id === userId);
                if (!user) {
                    user = {
                        id: userId,
                        email: 'user@example.com',
                        subscription_status: 'trial',
                        subscription_plan: 'trial',
                        subscription_start: new Date().toISOString(),
                        created_at: new Date().toISOString()
                    };
                    storage.users.push(user);
                }
                
                const status = {
                    userId: user.id,
                    status: user.subscription_status,
                    plan: user.subscription_plan,
                    startDate: user.subscription_start,
                    isActive: user.subscription_status === 'active',
                    isExpired: user.subscription_status === 'expired',
                    isTrial: user.subscription_status === 'trial'
                };
                
                return new Response(JSON.stringify(status), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao obter status da subscrição:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleSubscriptionAdmin(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                // Em produção, verificar se o utilizador é super_admin
                const adminData = {
                    totalUsers: storage.users.length,
                    activeSubscriptions: storage.users.filter(u => u.subscription_status === 'active').length,
                    expiredSubscriptions: storage.users.filter(u => u.subscription_status === 'expired').length,
                    trialUsers: storage.users.filter(u => u.subscription_status === 'trial').length,
                    users: storage.users.map(user => ({
                        id: user.id,
                        email: user.email,
                        status: user.subscription_status,
                        plan: user.subscription_plan,
                        startDate: user.subscription_start,
                        createdAt: user.created_at
                    })),
                    subscriptions: storage.subscriptions.map(sub => ({
                        sessionId: sub.sessionId,
                        userId: sub.userId,
                        planType: sub.planType,
                        status: sub.status,
                        createdAt: sub.createdAt
                    }))
                };
                
                addCommentatorLog('👑 Painel admin de subscrições acessado', 'info');
                
                return new Response(JSON.stringify(adminData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro no painel admin:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }

        // Funções de Subscrições
        function openSubscription() {
            const subscriptionPanel = document.getElementById('subscriptionPanel');
            if (subscriptionPanel) {
                subscriptionPanel.classList.remove('hidden');
                loadSubscriptionStatus();
                addCommentatorLog('💳 Painel de Subscrição aberto', 'info');
            }
        }

        function closeSubscriptionPanel() {
            const subscriptionPanel = document.getElementById('subscriptionPanel');
            if (subscriptionPanel) {
                subscriptionPanel.classList.add('hidden');
                addCommentatorLog('💳 Painel de Subscrição fechado', 'info');
            }
        }

        function openSubscriptionAdmin() {
            const adminPanel = document.getElementById('subscriptionAdminPanel');
            if (adminPanel) {
                adminPanel.classList.remove('hidden');
                loadSubscriptionAdmin();
                addCommentatorLog('👑 Painel Admin de Subscrições aberto', 'info');
            }
        }

        function closeSubscriptionAdminPanel() {
            const adminPanel = document.getElementById('subscriptionAdminPanel');
            if (adminPanel) {
                adminPanel.classList.add('hidden');
                addCommentatorLog('👑 Painel Admin de Subscrições fechado', 'info');
            }
        }

        async function loadSubscriptionStatus() {
            try {
                const response = await fetch('/api/v1/subscription/status?userId=default');
                const status = await response.json();
                
                document.getElementById('currentStatus').textContent = status.status;
                document.getElementById('currentPlan').textContent = status.plan;
                
                // Calcular dias restantes (simulado)
                const daysLeft = status.isTrial ? 7 : 30;
                document.getElementById('daysLeft').textContent = daysLeft;
                
                addCommentatorLog('📊 Status da subscrição carregado: ' + status.status, 'info');
                
            } catch (error) {
                console.error('Erro ao carregar status da subscrição:', error);
                addCommentatorLog('❌ Erro ao carregar status da subscrição: ' + error.message, 'error');
            }
        }

        async function createSubscription(planType) {
            try {
                addCommentatorLog('💳 Iniciando processo de subscrição: ' + planType, 'info');
                
                const response = await fetch('/api/v1/subscription/create-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'default',
                        planType: planType
                    })
                });
                
                const session = await response.json();
                
                if (session.url) {
                    addCommentatorLog('✅ Sessão de pagamento criada: ' + session.id, 'success');
                    alert('✅ Redirecionando para o pagamento...\n\nEm modo de teste, a subscrição será ativada automaticamente.');
                    
                    // Simular ativação da subscrição (em produção seria via webhook)
                    setTimeout(() => {
                        simulateSubscriptionActivation(planType);
                    }, 2000);
                } else {
                    throw new Error('Erro ao criar sessão de pagamento');
                }
                
            } catch (error) {
                console.error('Erro ao criar subscrição:', error);
                addCommentatorLog('❌ Erro ao criar subscrição: ' + error.message, 'error');
                alert('❌ Erro ao criar subscrição: ' + error.message);
            }
        }

        function simulateSubscriptionActivation(planType) {
            // Simular ativação da subscrição
            addCommentatorLog('🎉 Subscrição ativada com sucesso: ' + planType, 'success');
            addCommentatorLog('✅ Acesso completo aos sinais disponível', 'success');
            
            // Atualizar interface
            document.getElementById('currentStatus').textContent = 'Active';
            document.getElementById('currentPlan').textContent = planType;
            document.getElementById('daysLeft').textContent = '∞';
            
            // Mostrar alerta de sucesso
            alert('🎉 Subscrição ativada com sucesso!\n\nAgora tem acesso completo a todos os sinais e funcionalidades.');
        }

        async function loadSubscriptionAdmin() {
            try {
                const response = await fetch('/api/v1/subscription/admin');
                const adminData = await response.json();
                
                // Atualizar estatísticas
                document.getElementById('totalUsers').textContent = adminData.totalUsers;
                document.getElementById('activeSubscriptions').textContent = adminData.activeSubscriptions;
                document.getElementById('expiredSubscriptions').textContent = adminData.expiredSubscriptions;
                document.getElementById('trialUsers').textContent = adminData.trialUsers;
                
                // Atualizar lista de utilizadores
                const usersList = document.getElementById('usersList');
                if (adminData.users.length > 0) {
                    usersList.innerHTML = adminData.users.map(user => {
                        const statusClass = user.status === 'active' ? 'bg-green-900 text-green-300' :
                                          user.status === 'expired' ? 'bg-red-900 text-red-300' :
                                          'bg-yellow-900 text-yellow-300';
                        return '<div class="bg-gray-700 p-4 rounded-lg border border-gray-500">' +
                               '<div class="flex justify-between items-center">' +
                               '<div>' +
                               '<div class="font-medium text-white">' + user.email + '</div>' +
                               '<div class="text-sm text-gray-400">ID: ' + user.id + '</div>' +
                               '</div>' +
                               '<div class="text-right">' +
                               '<div class="px-3 py-1 rounded-full text-sm font-medium ' + statusClass + '">' + user.status.toUpperCase() + '</div>' +
                               '<div class="text-sm text-gray-400">' + user.plan + '</div>' +
                               '</div>' +
                               '</div>' +
                               '</div>';
                    }).join('');
                } else {
                    usersList.innerHTML = '<div class="text-center text-gray-400 py-4">Nenhum utilizador encontrado</div>';
                }
                
                addCommentatorLog('👑 Dados admin de subscrições carregados', 'info');
                
            } catch (error) {
                console.error('Erro ao carregar dados admin:', error);
                addCommentatorLog('❌ Erro ao carregar dados admin: ' + error.message, 'error');
            }
        }

        // Funções de Notificações Inteligentes
        async function handleNotificationConfig(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                if (request.method === 'GET') {
                    // Retornar configurações atuais
                    return new Response(JSON.stringify(storage.notificationSettings), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                    });
                } else if (request.method === 'POST') {
                    // Atualizar configurações
                    const newSettings = await request.json();
                    storage.notificationSettings = { ...storage.notificationSettings, ...newSettings };
                    
                    addCommentatorLog('🔔 Configurações de notificações atualizadas', 'success');
                    
                    return new Response(JSON.stringify({ success: true, settings: storage.notificationSettings }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                    });
                }
                
                return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
                
            } catch (error) {
                console.error('Erro ao gerir configurações de notificações:', error);
                addCommentatorLog('❌ Erro ao gerir notificações: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleNotificationSend(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const { gameId, message, type = 'upcoming' } = await request.json();
                
                console.log('Enviando notificação:', { gameId, type, message });
                addCommentatorLog('🔔 Enviando notificação: ' + type, 'info');
                
                let sent = false;
                
                if (storage.notificationSettings.telegramEnabled) {
                    const telegramMessage = '🔔 <b>NOTIFICAÇÃO DE JOGO</b>\n\n' +
                                          '⚽ <b>Jogo:</b> ' + message + '\n' +
                                          '⏰ <b>Tipo:</b> ' + (type === 'upcoming' ? 'Próximo Jogo' : 'Lembrete') + '\n' +
                                          '📅 <b>Enviado:</b> ' + new Date().toLocaleString('pt-PT');
                    
                    sent = await sendTelegramMessage(env, telegramMessage);
                }
                
                // Guardar notificação no histórico
                const notification = {
                    id: Date.now().toString(),
                    gameId: gameId,
                    type: type,
                    message: message,
                    sent: sent,
                    timestamp: new Date().toISOString(),
                    channel: 'telegram'
                };
                
                storage.notifications.push(notification);
                
                // Manter apenas as últimas 100 notificações
                if (storage.notifications.length > 100) {
                    storage.notifications = storage.notifications.slice(-100);
                }
                
                addCommentatorLog(sent ? '✅ Notificação enviada com sucesso' : '❌ Falha ao enviar notificação', sent ? 'success' : 'error');
                
                return new Response(JSON.stringify({ 
                    success: sent, 
                    notification: notification 
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao enviar notificação:', error);
                addCommentatorLog('❌ Erro ao enviar notificação: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleNotificationUpcoming(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const url = new URL(request.url);
                const minutes = parseInt(url.searchParams.get('minutes') || '30');
                
                console.log('Verificando jogos próximos em', minutes, 'minutos');
                addCommentatorLog('🔍 Verificando jogos próximos em ' + minutes + ' minutos', 'info');
                
                const now = new Date();
                const targetTime = new Date(now.getTime() + (minutes * 60 * 1000));
                
                // Buscar jogos que começam no período especificado
                const upcomingGames = storage.futureGames.filter(game => {
                    const gameTime = new Date(game.date);
                    const timeDiff = gameTime.getTime() - now.getTime();
                    const minutesDiff = timeDiff / (1000 * 60);
                    
                    // Jogo está entre agora e o tempo alvo (com margem de 5 minutos)
                    return minutesDiff >= 0 && minutesDiff <= (minutes + 5) && 
                           storage.notificationSettings.leagues.includes(game.league);
                });
                
                const notifications = [];
                
                for (const game of upcomingGames) {
                    // Verificar se já foi notificado
                    const alreadyNotified = storage.notifications.some(notif => 
                        notif.gameId === game.id && 
                        notif.type === 'upcoming' &&
                        new Date(notif.timestamp) > new Date(now.getTime() - 60 * 60 * 1000) // última hora
                    );
                    
                    if (!alreadyNotified) {
                        const message = game.home_team + ' vs ' + game.away_team + ' (' + game.league + ')';
                        
                        const response = await fetch('/api/v1/notifications/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                gameId: game.id,
                                message: message,
                                type: 'upcoming'
                            })
                        });
                
                if (response.ok) {
                            const result = await response.json();
                            notifications.push(result.notification);
                        }
                    }
                }
                
                addCommentatorLog('🔔 Verificação concluída: ' + notifications.length + ' notificações enviadas', 'success');
                
                return new Response(JSON.stringify({
                    success: true,
                    upcomingGames: upcomingGames.length,
                    notificationsSent: notifications.length,
                    notifications: notifications
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao verificar jogos próximos:', error);
                addCommentatorLog('❌ Erro ao verificar jogos próximos: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }

        // Funções de Logs e Auditoria
        async function handleAuditLogs(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                // Verificar se é super_admin (simulado - em produção seria JWT)
                const url = new URL(request.url);
                const userRole = url.searchParams.get('role') || 'user';
                
                if (userRole !== 'super_admin') {
                    return new Response(JSON.stringify({ error: 'Acesso negado. Apenas super_admin pode consultar logs.' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                    });
                }
                
                const tipoEvento = url.searchParams.get('tipo_evento') || 'all';
                const limit = parseInt(url.searchParams.get('limit') || '100');
                const offset = parseInt(url.searchParams.get('offset') || '0');
                
                console.log('Consultando logs de auditoria:', { tipoEvento, limit, offset });
                addCommentatorLog('📋 Consultando logs de auditoria', 'info');
                
                // Filtrar logs por tipo de evento
                let filteredLogs = storage.auditLogs;
                if (tipoEvento !== 'all') {
                    filteredLogs = storage.auditLogs.filter(log => log.tipo_evento === tipoEvento);
                }
                
                // Ordenar por timestamp (mais recentes primeiro)
                filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Paginação
                const paginatedLogs = filteredLogs.slice(offset, offset + limit);
                
                const response = {
                    logs: paginatedLogs,
                    pagination: {
                        total: filteredLogs.length,
                        limit: limit,
                        offset: offset,
                        hasMore: (offset + limit) < filteredLogs.length
                    },
                    filters: {
                        tipo_evento: tipoEvento
                    }
                };
                
                addCommentatorLog('📊 Logs de auditoria consultados: ' + paginatedLogs.length + ' de ' + filteredLogs.length, 'success');
                
                return new Response(JSON.stringify(response), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao consultar logs de auditoria:', error);
                addCommentatorLog('❌ Erro ao consultar logs: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleLogsStats(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                // Verificar se é super_admin (simulado - em produção seria JWT)
                const url = new URL(request.url);
                const userRole = url.searchParams.get('role') || 'user';
                
                if (userRole !== 'super_admin') {
                    return new Response(JSON.stringify({ error: 'Acesso negado. Apenas super_admin pode consultar estatísticas de logs.' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                    });
                }
                
                console.log('Consultando estatísticas de logs');
                addCommentatorLog('📊 Consultando estatísticas de logs', 'info');
                
                // Estatísticas por tipo de evento
                const statsByType = {};
                storage.auditLogs.forEach(log => {
                    if (!statsByType[log.tipo_evento]) {
                        statsByType[log.tipo_evento] = 0;
                    }
                    statsByType[log.tipo_evento]++;
                });
                
                // Estatísticas por utilizador
                const statsByUser = {};
                storage.auditLogs.forEach(log => {
                    if (!statsByUser[log.utilizador]) {
                        statsByUser[log.utilizador] = 0;
                    }
                    statsByUser[log.utilizador]++;
                });
                
                // Estatísticas por hora (últimas 24h)
                const now = new Date();
                const last24h = storage.auditLogs.filter(log => {
                    const logTime = new Date(log.timestamp);
                    return (now - logTime) <= (24 * 60 * 60 * 1000);
                });
                
                const hourlyStats = {};
                last24h.forEach(log => {
                    const hour = new Date(log.timestamp).getHours();
                    if (!hourlyStats[hour]) {
                        hourlyStats[hour] = 0;
                    }
                    hourlyStats[hour]++;
                });
                
                const stats = {
                    total: storage.auditLogs.length,
                    last24h: last24h.length,
                    byType: Object.keys(statsByType).map(type => ({
                        tipo_evento: type,
                        count: statsByType[type]
                    })).sort((a, b) => b.count - a.count),
                    byUser: Object.keys(statsByUser).map(user => ({
                        utilizador: user,
                        count: statsByUser[user]
                    })).sort((a, b) => b.count - a.count),
                    hourly: Object.keys(hourlyStats).map(hour => ({
                        hour: parseInt(hour),
                        count: hourlyStats[hour]
                    })).sort((a, b) => a.hour - b.hour)
                };
                
                addCommentatorLog('📈 Estatísticas de logs calculadas: ' + stats.total + ' logs totais', 'success');
                
                return new Response(JSON.stringify(stats), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao consultar estatísticas de logs:', error);
                addCommentatorLog('❌ Erro ao consultar estatísticas: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }

        // Funções de Histórico de Performance
        async function handleHistoryPerformance(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const url = new URL(request.url);
                const league = url.searchParams.get('league') || 'all';
                const period = url.searchParams.get('period') || '30'; // dias
                const startDate = url.searchParams.get('startDate');
                const endDate = url.searchParams.get('endDate');
                
                console.log('Buscando histórico de performance:', { league, period, startDate, endDate });
                addCommentatorLog('📊 Buscando histórico de performance', 'info');
                
                // Calcular datas
                let start, end;
                if (startDate && endDate) {
                    start = new Date(startDate);
                    end = new Date(endDate);
                } else {
                    end = new Date();
                    start = new Date();
                    start.setDate(start.getDate() - parseInt(period));
                }
                
                // Filtrar sinais por período e liga
                const filteredSignals = storage.signals.filter(signal => {
                    const signalDate = new Date(signal.date);
                    const dateMatch = signalDate >= start && signalDate <= end;
                    const leagueMatch = league === 'all' || signal.league === league;
                    return dateMatch && leagueMatch && signal.status !== 'pending';
                });
                
                // Calcular estatísticas
                const totalSignals = filteredSignals.length;
                const greenSignals = filteredSignals.filter(s => s.status === 'green').length;
                const redSignals = filteredSignals.filter(s => s.status === 'red').length;
                const winRate = totalSignals > 0 ? ((greenSignals / totalSignals) * 100).toFixed(2) : 0;
                
                // Calcular yield (simulado)
                const avgOdds = 2.0; // Simulado
                const yield = totalSignals > 0 ? (((greenSignals * (avgOdds - 1)) - redSignals) / totalSignals * 100).toFixed(2) : 0;
                
                // Estatísticas por dia
                const dailyStats = {};
                filteredSignals.forEach(signal => {
                    const date = new Date(signal.date).toISOString().split('T')[0];
                    if (!dailyStats[date]) {
                        dailyStats[date] = { total: 0, green: 0, red: 0 };
                    }
                    dailyStats[date].total++;
                    if (signal.status === 'green') dailyStats[date].green++;
                    if (signal.status === 'red') dailyStats[date].red++;
                });
                
                // Estatísticas por liga
                const leagueStats = {};
                filteredSignals.forEach(signal => {
                    if (!leagueStats[signal.league]) {
                        leagueStats[signal.league] = { total: 0, green: 0, red: 0 };
                    }
                    leagueStats[signal.league].total++;
                    if (signal.status === 'green') leagueStats[signal.league].green++;
                    if (signal.status === 'red') leagueStats[signal.league].red++;
                });
                
                const performance = {
                    period: {
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0],
                        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                    },
                    filters: {
                        league: league,
                        period: period
                    },
                    summary: {
                        totalSignals: totalSignals,
                        greenSignals: greenSignals,
                        redSignals: redSignals,
                        winRate: parseFloat(winRate),
                        yield: parseFloat(yield),
                        avgOdds: avgOdds
                    },
                    dailyStats: Object.keys(dailyStats).map(date => ({
                        date: date,
                        total: dailyStats[date].total,
                        green: dailyStats[date].green,
                        red: dailyStats[date].red,
                        winRate: dailyStats[date].total > 0 ? ((dailyStats[date].green / dailyStats[date].total) * 100).toFixed(2) : 0
                    })).sort((a, b) => new Date(a.date) - new Date(b.date)),
                    leagueStats: Object.keys(leagueStats).map(league => ({
                        league: league,
                        total: leagueStats[league].total,
                        green: leagueStats[league].green,
                        red: leagueStats[league].red,
                        winRate: leagueStats[league].total > 0 ? ((leagueStats[league].green / leagueStats[league].total) * 100).toFixed(2) : 0
                    }))
                };
                
                addCommentatorLog('📈 Histórico de performance calculado: ' + totalSignals + ' sinais, ' + winRate + '% acerto', 'success');
                
                return new Response(JSON.stringify(performance), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao buscar histórico de performance:', error);
                addCommentatorLog('❌ Erro ao buscar histórico: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        async function handleHistoryStats(request, env) {
            const CORS_HEADERS = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            
            try {
                const url = new URL(request.url);
                const type = url.searchParams.get('type') || 'overview'; // overview, trends, leagues
                
                console.log('Buscando estatísticas de histórico:', type);
                addCommentatorLog('📊 Buscando estatísticas de histórico: ' + type, 'info');
                
                let stats = {};
                
                if (type === 'overview') {
                    // Estatísticas gerais
                    const allSignals = storage.signals.filter(s => s.status !== 'pending');
                    const totalSignals = allSignals.length;
                    const greenSignals = allSignals.filter(s => s.status === 'green').length;
                    const redSignals = allSignals.filter(s => s.status === 'red').length;
                    const winRate = totalSignals > 0 ? ((greenSignals / totalSignals) * 100).toFixed(2) : 0;
                    
                    // Sinais por mês (últimos 12 meses)
                    const monthlyStats = {};
                    allSignals.forEach(signal => {
                        const date = new Date(signal.date);
                        const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                        if (!monthlyStats[monthKey]) {
                            monthlyStats[monthKey] = { total: 0, green: 0, red: 0 };
                        }
                        monthlyStats[monthKey].total++;
                        if (signal.status === 'green') monthlyStats[monthKey].green++;
                        if (signal.status === 'red') monthlyStats[monthKey].red++;
                    });
                    
                    stats = {
                        totalSignals: totalSignals,
                        greenSignals: greenSignals,
                        redSignals: redSignals,
                        winRate: parseFloat(winRate),
                        monthlyStats: Object.keys(monthlyStats).map(month => ({
                            month: month,
                            total: monthlyStats[month].total,
                            green: monthlyStats[month].green,
                            red: monthlyStats[month].red,
                            winRate: monthlyStats[month].total > 0 ? ((monthlyStats[month].green / monthlyStats[month].total) * 100).toFixed(2) : 0
                        })).sort((a, b) => a.month.localeCompare(b.month))
                    };
                } else if (type === 'trends') {
                    // Tendências semanais
                    const weeklyStats = {};
                    const allSignals = storage.signals.filter(s => s.status !== 'pending');
                    
                    allSignals.forEach(signal => {
                        const date = new Date(signal.date);
                        const weekKey = getWeekKey(date);
                        if (!weeklyStats[weekKey]) {
                            weeklyStats[weekKey] = { total: 0, green: 0, red: 0 };
                        }
                        weeklyStats[weekKey].total++;
                        if (signal.status === 'green') weeklyStats[weekKey].green++;
                        if (signal.status === 'red') weeklyStats[weekKey].red++;
                    });
                    
                    stats = {
                        weeklyStats: Object.keys(weeklyStats).map(week => ({
                            week: week,
                            total: weeklyStats[week].total,
                            green: weeklyStats[week].green,
                            red: weeklyStats[week].red,
                            winRate: weeklyStats[week].total > 0 ? ((weeklyStats[week].green / weeklyStats[week].total) * 100).toFixed(2) : 0
                        })).sort((a, b) => a.week.localeCompare(b.week))
                    };
                } else if (type === 'leagues') {
                    // Estatísticas por liga
                    const leagueStats = {};
                    const allSignals = storage.signals.filter(s => s.status !== 'pending');
                    
                    allSignals.forEach(signal => {
                        if (!leagueStats[signal.league]) {
                            leagueStats[signal.league] = { total: 0, green: 0, red: 0 };
                        }
                        leagueStats[signal.league].total++;
                        if (signal.status === 'green') leagueStats[signal.league].green++;
                        if (signal.status === 'red') leagueStats[signal.league].red++;
                    });
                    
                    stats = {
                        leagueStats: Object.keys(leagueStats).map(league => ({
                            league: league,
                            total: leagueStats[league].total,
                            green: leagueStats[league].green,
                            red: leagueStats[league].red,
                            winRate: leagueStats[league].total > 0 ? ((leagueStats[league].green / leagueStats[league].total) * 100).toFixed(2) : 0
                        })).sort((a, b) => b.total - a.total)
                    };
                }
                
                addCommentatorLog('📈 Estatísticas de histórico calculadas: ' + type, 'success');
                
                return new Response(JSON.stringify(stats), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
                
            } catch (error) {
                console.error('Erro ao buscar estatísticas de histórico:', error);
                addCommentatorLog('❌ Erro ao buscar estatísticas: ' + error.message, 'error');
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }
        }
        
        function getWeekKey(date) {
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            return year + '-W' + String(week).padStart(2, '0');
        }
        
        function getWeekNumber(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }

        // Funções de Explicações dos Sinais
        function createAndShowMockSignal() {
            try {
                const signal = createMockSignalWithExplanation();
                displaySignalsList();
                showSignalExplanation(signal);
                addCommentatorLog('🧠 Sinal criado e explicação exibida', 'success');
            } catch (error) {
                console.error('Erro ao criar sinal:', error);
                addCommentatorLog('❌ Erro ao criar sinal: ' + error.message, 'error');
            }
        }

        function showSignalExplanation(signal) {
            if (!signal.explanation) {
                alert('❌ Este sinal não possui explicação');
                return;
            }

            const explanationPanel = document.getElementById('signalExplanations');
            const explanationContent = document.getElementById('explanationContent');
            
            if (explanationPanel && explanationContent) {
                const explanation = signal.explanation;
                
                // Criar HTML da explicação usando concatenação de strings
                let html = '<div class="bg-gray-900 rounded-xl p-6 border border-gray-600">' +
                          '<h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">' +
                          '<span class="text-xl">🎯</span>Informações do Sinal</h3>' +
                          '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
                          '<div><div class="text-gray-300 text-sm">Jogo</div>' +
                          '<div class="text-white font-medium">' + signal.home_team + ' vs ' + signal.away_team + '</div></div>' +
                          '<div><div class="text-gray-300 text-sm">Liga</div>' +
                          '<div class="text-white font-medium">' + signal.league + '</div></div>' +
                          '<div><div class="text-gray-300 text-sm">Previsão</div>' +
                          '<div class="text-white font-medium">' + signal.prediction + '</div></div>' +
                          '<div><div class="text-gray-300 text-sm">Confiança</div>' +
                          '<div class="text-green-400 font-bold">' + signal.confidence + '%</div></div>' +
                          '</div></div>';

                // Estatísticas das equipas
                html += '<div class="bg-gray-900 rounded-xl p-6 border border-gray-600 mt-6">' +
                       '<h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">' +
                       '<span class="text-xl">📊</span>Estatísticas das Equipas</h3>' +
                       '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
                       '<div class="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-600 border-opacity-30">' +
                       '<h4 class="font-bold text-blue-300 mb-3">🏠 ' + explanation.teamStats.homeTeam.name + '</h4>' +
                       '<div class="space-y-2 text-sm">' +
                       '<div class="flex justify-between"><span class="text-gray-300">Golos marcados:</span>' +
                       '<span class="text-white font-medium">' + explanation.teamStats.homeTeam.avgGoalsScored + '/jogo</span></div>' +
                       '<div class="flex justify-between"><span class="text-gray-300">Taxa vitórias casa:</span>' +
                       '<span class="text-green-400 font-bold">' + explanation.teamStats.homeTeam.homeWinRate + '%</span></div>' +
                       '</div></div>' +
                       '<div class="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-600 border-opacity-30">' +
                       '<h4 class="font-bold text-red-300 mb-3">✈️ ' + explanation.teamStats.awayTeam.name + '</h4>' +
                       '<div class="space-y-2 text-sm">' +
                       '<div class="flex justify-between"><span class="text-gray-300">Golos marcados:</span>' +
                       '<span class="text-white font-medium">' + explanation.teamStats.awayTeam.avgGoalsScored + '/jogo</span></div>' +
                       '<div class="flex justify-between"><span class="text-gray-300">Taxa vitórias fora:</span>' +
                       '<span class="text-yellow-400 font-bold">' + explanation.teamStats.awayTeam.awayWinRate + '%</span></div>' +
                       '</div></div></div></div>';

                // Confrontos diretos
                html += '<div class="bg-gray-900 rounded-xl p-6 border border-gray-600 mt-6">' +
                       '<h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">' +
                       '<span class="text-xl">⚔️</span>Confrontos Diretos</h3>' +
                       '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">' +
                       '<div class="bg-gray-700 rounded-lg p-3">' +
                       '<div class="text-2xl font-bold text-blue-400">' + explanation.headToHead.totalMeetings + '</div>' +
                       '<div class="text-xs text-gray-400">Total Jogos</div></div>' +
                       '<div class="bg-gray-700 rounded-lg p-3">' +
                       '<div class="text-2xl font-bold text-green-400">' + explanation.headToHead.homeWins + '</div>' +
                       '<div class="text-xs text-gray-400">Vitórias Casa</div></div>' +
                       '<div class="bg-gray-700 rounded-lg p-3">' +
                       '<div class="text-2xl font-bold text-yellow-400">' + explanation.headToHead.draws + '</div>' +
                       '<div class="text-xs text-gray-400">Empates</div></div>' +
                       '<div class="bg-gray-700 rounded-lg p-3">' +
                       '<div class="text-2xl font-bold text-red-400">' + explanation.headToHead.awayWins + '</div>' +
                       '<div class="text-xs text-gray-400">Vitórias Fora</div></div>' +
                       '</div></div>';

                // Razões da análise
                html += '<div class="bg-gray-900 rounded-xl p-6 border border-gray-600 mt-6">' +
                       '<h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">' +
                       '<span class="text-xl">💡</span>Razões da Análise</h3>' +
                       '<div class="space-y-3">';
                
                explanation.reasoning.forEach(reason => {
                    html += '<div class="flex items-start gap-3 bg-gray-700 rounded-lg p-3">' +
                           '<div class="text-green-400 mt-1">•</div>' +
                           '<div class="text-gray-200">' + reason + '</div></div>';
                });
                
                html += '</div></div>';
                
                explanationContent.innerHTML = html;
                explanationPanel.classList.remove('hidden');
                addCommentatorLog('🧠 Explicação do sinal exibida', 'info');
            }
        }

        function closeExplanationPanel() {
            const explanationPanel = document.getElementById('signalExplanations');
            if (explanationPanel) {
                explanationPanel.classList.add('hidden');
                addCommentatorLog('🧠 Painel de explicação fechado', 'info');
            }
        }

        function displaySignalsList() {
            const signalsList = document.getElementById('signals-list');
            if (signalsList && storage.signals.length > 0) {
                let html = '';
                storage.signals.forEach(signal => {
                    const statusColor = signal.status === 'green' ? 'text-green-400' : 
                                       signal.status === 'red' ? 'text-red-400' : 'text-yellow-400';
                    const hasExplanation = signal.explanation ? '🧠' : '';
                    
                    html += '<div class="bg-gray-700 rounded-lg p-3 mb-2 border border-gray-600">' +
                           '<div class="flex justify-between items-center">' +
                           '<div>' +
                           '<div class="font-medium text-white">' + signal.home_team + ' vs ' + signal.away_team + '</div>' +
                           '<div class="text-sm text-gray-400">' + signal.league + ' • ' + signal.prediction + '</div>' +
                           '</div>' +
                           '<div class="text-right">' +
                           '<div class="flex items-center gap-2">' +
                           '<span class="text-lg">' + hasExplanation + '</span>' +
                           '<span class="' + statusColor + ' font-bold">' + signal.status.toUpperCase() + '</span>' +
                           '<span class="text-gray-300">' + signal.confidence + '%</span>' +
                           '</div>';
                    
                    if (signal.explanation) {
                        html += '<button onclick="showSignalExplanation(storage.signals.find(s => s.id === \'' + signal.id + '\'))" class="text-xs text-blue-400 hover:text-blue-300 mt-1">Ver Explicação</button>';
                    }
                    
                    html += '</div></div></div>';
                });
                signalsList.innerHTML = html;
            }
        }

        // Funções de Histórico de Performance
        function openHistoryPanel() {
            const historyPanel = document.getElementById('historyPanel');
            if (historyPanel) {
                historyPanel.classList.remove('hidden');
                loadHistoryData();
                addCommentatorLog('📊 Painel de Histórico aberto', 'info');
            }
        }

        function closeHistoryPanel() {
            const historyPanel = document.getElementById('historyPanel');
            if (historyPanel) {
                historyPanel.classList.add('hidden');
                addCommentatorLog('📊 Painel de Histórico fechado', 'info');
            }
        }

        function toggleCustomDateRange() {
            const period = document.getElementById('historyPeriod').value;
            const customDateRange = document.getElementById('customDateRange');
            const customDateRangeEnd = document.getElementById('customDateRangeEnd');
            
            if (period === 'custom') {
                customDateRange.classList.remove('hidden');
                customDateRangeEnd.classList.remove('hidden');
            } else {
                customDateRange.classList.add('hidden');
                customDateRangeEnd.classList.add('hidden');
            }
        }

        function resetHistoryFilters() {
            document.getElementById('historyPeriod').value = '30';
            document.getElementById('historyLeague').value = 'all';
            document.getElementById('customDateRange').classList.add('hidden');
            document.getElementById('customDateRangeEnd').classList.add('hidden');
            loadHistoryData();
            addCommentatorLog('📊 Filtros de histórico resetados', 'info');
        }

        async function loadHistoryData() {
            try {
                const period = document.getElementById('historyPeriod').value;
                const league = document.getElementById('historyLeague').value;
                const startDate = document.getElementById('historyStartDate').value;
                const endDate = document.getElementById('historyEndDate').value;
                
                let url = '/api/v1/history/performance?';
                if (period === 'custom' && startDate && endDate) {
                    url += 'startDate=' + startDate + '&endDate=' + endDate;
                } else {
                    url += 'period=' + period;
                }
                if (league !== 'all') {
                    url += '&league=' + encodeURIComponent(league);
                }
                
                addCommentatorLog('📊 Carregando dados de histórico...', 'info');
                
                const response = await fetch(url);
                    const data = await response.json();
                
                if (data.summary) {
                    // Atualizar resumo
                    document.getElementById('historyTotalSignals').textContent = data.summary.totalSignals;
                    document.getElementById('historyGreenSignals').textContent = data.summary.greenSignals;
                    document.getElementById('historyRedSignals').textContent = data.summary.redSignals;
                    document.getElementById('historyWinRate').textContent = data.summary.winRate + '%';
                    
                    // Atualizar tabela
                    updateHistoryTable(data.dailyStats);
                    
                    // Atualizar gráficos (simulado)
                    updateHistoryCharts(data);
                    
                    addCommentatorLog('📈 Dados de histórico carregados: ' + data.summary.totalSignals + ' sinais, ' + data.summary.winRate + '% acerto', 'success');
                } else {
                    throw new Error('Dados de histórico inválidos');
                }
                
            } catch (error) {
                console.error('Erro ao carregar dados de histórico:', error);
                addCommentatorLog('❌ Erro ao carregar histórico: ' + error.message, 'error');
                alert('❌ Erro ao carregar dados de histórico: ' + error.message);
            }
        }

        function updateHistoryTable(dailyStats) {
            const tableBody = document.getElementById('historyTableBody');
            if (tableBody && dailyStats) {
                if (dailyStats.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Nenhum dado encontrado para o período selecionado</td></tr>';
                    return;
                }
                
                let html = '';
                dailyStats.forEach(day => {
                    const winRateColor = parseFloat(day.winRate) >= 60 ? 'text-green-400' : 
                                        parseFloat(day.winRate) >= 40 ? 'text-yellow-400' : 'text-red-400';
                    
                    html += '<tr class="border-b border-gray-700 hover:bg-gray-800">' +
                           '<td class="py-3 px-4 text-white">' + formatDate(day.date) + '</td>' +
                           '<td class="py-3 px-4 text-center text-gray-300">' + day.total + '</td>' +
                           '<td class="py-3 px-4 text-center text-green-400">' + day.green + '</td>' +
                           '<td class="py-3 px-4 text-center text-red-400">' + day.red + '</td>' +
                           '<td class="py-3 px-4 text-center ' + winRateColor + ' font-bold">' + day.winRate + '%</td>' +
                           '</tr>';
                });
                tableBody.innerHTML = html;
            }
        }

        function updateHistoryCharts(data) {
            // Simular gráficos (em produção seria Chart.js)
            const dailyChart = document.getElementById('dailyChart');
            const leagueChart = document.getElementById('leagueChart');
            
            if (dailyChart) {
                dailyChart.innerHTML = '<div class="text-center text-gray-400">' +
                                     '<div class="text-4xl mb-2">📈</div>' +
                                     '<div>Performance Diária</div>' +
                                     '<div class="text-sm mt-2">' + data.dailyStats.length + ' dias de dados</div>' +
                                     '<div class="text-xs text-gray-500">Média: ' + data.summary.winRate + '% acerto</div>' +
                                     '</div>';
            }
            
            if (leagueChart) {
                leagueChart.innerHTML = '<div class="text-center text-gray-400">' +
                                      '<div class="text-4xl mb-2">🏆</div>' +
                                      '<div>Performance por Liga</div>' +
                                      '<div class="text-sm mt-2">' + data.leagueStats.length + ' ligas</div>' +
                                      '<div class="text-xs text-gray-500">Filtro: ' + (data.filters.league === 'all' ? 'Todas' : data.filters.league) + '</div>' +
                                      '</div>';
            }
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        // Funções de Notificações Inteligentes
        function openNotificationsPanel() {
            const notificationsPanel = document.getElementById('notificationsPanel');
            if (notificationsPanel) {
                notificationsPanel.classList.remove('hidden');
                loadNotificationSettings();
                loadNotificationStats();
                addCommentatorLog('🔔 Painel de Notificações aberto', 'info');
            }
        }

        function closeNotificationsPanel() {
            const notificationsPanel = document.getElementById('notificationsPanel');
            if (notificationsPanel) {
                notificationsPanel.classList.add('hidden');
                addCommentatorLog('🔔 Painel de Notificações fechado', 'info');
            }
        }

        function loadNotificationSettings() {
            // Carregar configurações atuais
            document.getElementById('notificationsEnabled').checked = storage.notificationSettings.enabled;
            document.getElementById('telegramNotifications').checked = storage.notificationSettings.telegramEnabled;
            document.getElementById('emailNotifications').checked = storage.notificationSettings.emailEnabled;
            document.getElementById('advanceTime').value = storage.notificationSettings.advanceTime;
            
            // Carregar ligas selecionadas
            const leagues = storage.notificationSettings.leagues || [];
            leagues.forEach(league => {
                const checkbox = document.getElementById('league_' + league.toLowerCase().replace(' ', '_'));
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        async function saveNotificationConfig() {
            try {
                const settings = {
                    enabled: document.getElementById('notificationsEnabled').checked,
                    telegramEnabled: document.getElementById('telegramNotifications').checked,
                    emailEnabled: document.getElementById('emailNotifications').checked,
                    advanceTime: parseInt(document.getElementById('advanceTime').value),
                    leagues: []
                };
                
                // Coletar ligas selecionadas
                const leagueCheckboxes = document.querySelectorAll('input[id^="league_"]:checked');
                leagueCheckboxes.forEach(checkbox => {
                    const leagueName = checkbox.id.replace('league_', '').replace('_', ' ');
                    settings.leagues.push(leagueName);
                });
                
                const response = await fetch('/api/v1/notifications/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                
                if (response.ok) {
                    addCommentatorLog('✅ Configurações de notificações guardadas', 'success');
                    loadNotificationStats();
                } else {
                    throw new Error('Falha ao guardar configurações');
                }
                
            } catch (error) {
                console.error('Erro ao guardar configurações:', error);
                addCommentatorLog('❌ Erro ao guardar configurações: ' + error.message, 'error');
                alert('❌ Erro ao guardar configurações: ' + error.message);
            }
        }

        async function testNotificationSend() {
            try {
                const testMessage = 'Teste de Notificação - ' + new Date().toLocaleString('pt-PT');
                
                const response = await fetch('/api/v1/notifications/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameId: 'test_' + Date.now(),
                        message: testMessage,
                        type: 'test'
                    })
                });
                
                if (response.ok) {
                    addCommentatorLog('✅ Notificação de teste enviada', 'success');
                    loadNotificationStats();
                } else {
                    throw new Error('Falha ao enviar notificação de teste');
                }
                
            } catch (error) {
                console.error('Erro ao enviar notificação de teste:', error);
                addCommentatorLog('❌ Erro ao enviar teste: ' + error.message, 'error');
                alert('❌ Erro ao enviar notificação de teste: ' + error.message);
            }
        }

        function loadNotificationStats() {
            // Atualizar estatísticas
            const totalNotifications = storage.notifications.length;
            const successNotifications = storage.notifications.filter(n => n.sent).length;
            
            // Contar jogos próximos
            const now = new Date();
            const upcomingGames = storage.futureGames.filter(game => {
                const gameTime = new Date(game.date);
                const timeDiff = gameTime.getTime() - now.getTime();
                const minutesDiff = timeDiff / (1000 * 60);
                return minutesDiff >= 0 && minutesDiff <= 60; // próximos 60 minutos
            }).length;
            
            document.getElementById('totalNotifications').textContent = totalNotifications;
            document.getElementById('successNotifications').textContent = successNotifications;
            document.getElementById('upcomingGames').textContent = upcomingGames;
            
            // Atualizar histórico
            updateNotificationHistory();
        }

        function updateNotificationHistory() {
            const historyContainer = document.getElementById('notificationsHistory');
            if (!historyContainer) return;
            
            const recentNotifications = storage.notifications.slice(-10).reverse(); // últimas 10
            
            if (recentNotifications.length === 0) {
                historyContainer.innerHTML = '<div class="text-center py-8 text-gray-400">Nenhuma notificação enviada ainda</div>';
                return;
            }
            
            let html = '';
            recentNotifications.forEach(notification => {
                const statusColor = notification.sent ? 'text-green-400' : 'text-red-400';
                const statusIcon = notification.sent ? '✅' : '❌';
                const timeAgo = getTimeAgo(new Date(notification.timestamp));
                
                html += '<div class="bg-gray-800 rounded-lg p-4 border border-gray-600">' +
                       '<div class="flex justify-between items-start">' +
                       '<div class="flex-1">' +
                       '<div class="text-white font-medium">' + notification.message + '</div>' +
                       '<div class="text-sm text-gray-400 mt-1">' + notification.type + ' • ' + timeAgo + '</div>' +
                       '</div>' +
                       '<div class="flex items-center gap-2">' +
                       '<span class="' + statusColor + '">' + statusIcon + '</span>' +
                       '<span class="text-xs text-gray-500">' + notification.channel + '</span>' +
                       '</div>' +
                       '</div>' +
                       '</div>';
            });
            
            historyContainer.innerHTML = html;
        }

        function getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'há ' + diffInSeconds + 's';
            if (diffInSeconds < 3600) return 'há ' + Math.floor(diffInSeconds / 60) + 'm';
            if (diffInSeconds < 86400) return 'há ' + Math.floor(diffInSeconds / 3600) + 'h';
            return 'há ' + Math.floor(diffInSeconds / 86400) + 'd';
        }

        // Funções de Logs e Auditoria
        let currentLogsOffset = 0;
        let currentLogsLimit = 100;
        let currentLogsData = null;

        function openLogsPanel() {
            const logsPanel = document.getElementById('logsPanel');
            if (logsPanel) {
                logsPanel.classList.remove('hidden');
                loadLogsData();
                addCommentatorLog('📋 Painel de Logs aberto', 'info');
            }
        }

        function closeLogsPanel() {
            const logsPanel = document.getElementById('logsPanel');
            if (logsPanel) {
                logsPanel.classList.add('hidden');
                addCommentatorLog('📋 Painel de Logs fechado', 'info');
            }
        }

        async function loadLogsData() {
            try {
                const eventType = document.getElementById('logEventType').value;
                const user = document.getElementById('logUser').value;
                const limit = parseInt(document.getElementById('logLimit').value);
                
                currentLogsLimit = limit;
                currentLogsOffset = 0;
                
                let url = '/api/v1/logs/audit?role=super_admin&limit=' + limit + '&offset=' + currentLogsOffset;
                if (eventType !== 'all') {
                    url += '&tipo_evento=' + eventType;
                }
                
                addCommentatorLog('📋 Carregando logs de auditoria...', 'info');
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.logs) {
                    currentLogsData = data;
                    updateLogsTable(data.logs);
                    updateLogsPagination(data.pagination);
                    loadLogsStats();
                    addCommentatorLog('📊 Logs carregados: ' + data.logs.length + ' de ' + data.pagination.total, 'success');
                } else {
                    throw new Error('Dados de logs inválidos');
                }
                
            } catch (error) {
                console.error('Erro ao carregar logs:', error);
                addCommentatorLog('❌ Erro ao carregar logs: ' + error.message, 'error');
                alert('❌ Erro ao carregar logs: ' + error.message);
            }
        }

        async function changeLogsPage(direction) {
            if (!currentLogsData) return;
            
            const newOffset = currentLogsOffset + (direction * currentLogsLimit);
            
            if (newOffset < 0 || newOffset >= currentLogsData.pagination.total) {
                return;
            }
            
            currentLogsOffset = newOffset;
            
            try {
                const eventType = document.getElementById('logEventType').value;
                const limit = currentLogsLimit;
                
                let url = '/api/v1/logs/audit?role=super_admin&limit=' + limit + '&offset=' + currentLogsOffset;
                if (eventType !== 'all') {
                    url += '&tipo_evento=' + eventType;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.logs) {
                    currentLogsData = data;
                    updateLogsTable(data.logs);
                    updateLogsPagination(data.pagination);
                }
                
            } catch (error) {
                console.error('Erro ao carregar página de logs:', error);
                addCommentatorLog('❌ Erro ao carregar página: ' + error.message, 'error');
            }
        }

        function updateLogsTable(logs) {
            const tableBody = document.getElementById('logsTableBody');
            if (!tableBody) return;
            
            if (logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Nenhum log encontrado</td></tr>';
                return;
            }
            
            let html = '';
            logs.forEach(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('pt-PT');
                const eventTypeColor = getEventTypeColor(log.tipo_evento);
                const userColor = getUserColor(log.utilizador);
                
                html += '<tr class="border-b border-gray-700 hover:bg-gray-800">' +
                       '<td class="py-3 px-4 text-gray-300 text-xs">' + timestamp + '</td>' +
                       '<td class="py-3 px-4">' +
                       '<span class="px-2 py-1 rounded-full text-xs font-medium ' + eventTypeColor + '">' + log.tipo_evento + '</span>' +
                       '</td>' +
                       '<td class="py-3 px-4 text-gray-300 text-sm">' + log.detalhe + '</td>' +
                       '<td class="py-3 px-4">' +
                       '<span class="px-2 py-1 rounded-full text-xs font-medium ' + userColor + '">' + log.utilizador + '</span>' +
                       '</td>' +
                       '</tr>';
            });
            
            tableBody.innerHTML = html;
        }

        function updateLogsPagination(pagination) {
            document.getElementById('logsShowing').textContent = pagination.offset + 1 + '-' + Math.min(pagination.offset + pagination.limit, pagination.total);
            document.getElementById('logsTotal').textContent = pagination.total;
            
            document.getElementById('prevLogs').disabled = pagination.offset === 0;
            document.getElementById('nextLogs').disabled = !pagination.hasMore;
        }

        async function loadLogsStats() {
            try {
                const response = await fetch('/api/v1/logs/stats?role=super_admin');
                const stats = await response.json();
                
                if (stats) {
                    document.getElementById('totalLogs').textContent = stats.total;
                    document.getElementById('last24hLogs').textContent = stats.last24h;
                    
                    // Encontrar falhas da API
                    const apiFailures = stats.byType.find(type => type.tipo_evento === 'API_FAILURE');
                    document.getElementById('apiFailures').textContent = apiFailures ? apiFailures.count : 0;
                    
                    // Encontrar sinais gerados
                    const signalsGenerated = stats.byType.find(type => type.tipo_evento === 'SIGNAL_GENERATED');
                    document.getElementById('signalsGenerated').textContent = signalsGenerated ? signalsGenerated.count : 0;
                }
                
            } catch (error) {
                console.error('Erro ao carregar estatísticas de logs:', error);
            }
        }

        function getEventTypeColor(tipoEvento) {
            const colors = {
                'API_FAILURE': 'bg-red-900 text-red-300',
                'SIGNAL_GENERATED': 'bg-green-900 text-green-300',
                'REPORT_SENT': 'bg-blue-900 text-blue-300',
                'NOTIFICATION_SENT': 'bg-orange-900 text-orange-300',
                'USER_ACTION': 'bg-purple-900 text-purple-300',
                'SYSTEM_EVENT': 'bg-gray-900 text-gray-300'
            };
            return colors[tipoEvento] || 'bg-gray-900 text-gray-300';
        }

        function getUserColor(utilizador) {
            const colors = {
                'system': 'bg-gray-700 text-gray-300',
                'admin': 'bg-yellow-700 text-yellow-300',
                'super_admin': 'bg-red-700 text-red-300',
                'user': 'bg-blue-700 text-blue-300'
            };
            return colors[utilizador] || 'bg-gray-700 text-gray-300';
        }

        // Funções de Configurações
        function openSettings() {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.classList.remove('hidden');
                loadCurrentSettings();
                addCommentatorLog('⚙️ Painel de Configurações aberto', 'info');
            }
        }

        function closeSettingsPanel() {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.classList.add('hidden');
                addCommentatorLog('⚙️ Painel de Configurações fechado', 'info');
            }
        }

        function loadCurrentSettings() {
            // Carregar configurações atuais (simulado - em produção viria da API)
            document.getElementById('apiKey').value = '••••••••••••••••';
            document.getElementById('apiLimit').value = '100';
            document.getElementById('timezone').value = 'Europe/Lisbon';
            document.getElementById('signalThreshold').value = '85';
            document.getElementById('maxSignalsPerDay').value = '50';
            document.getElementById('dailyReportTime').value = '23:59';
            document.getElementById('telegramToken').value = '••••••••••••••••';
            document.getElementById('telegramGroupId').value = '-1002937302746';
            document.getElementById('telegramEnabled').checked = true;
            
            // Atualizar status
            updateSystemStatus();
        }

        function updateSystemStatus() {
            const now = new Date();
            document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('pt-PT');
        }

        async function saveSettingsConfig() {
            try {
                const settings = {
                    apiKey: document.getElementById('apiKey').value,
                    apiLimit: parseInt(document.getElementById('apiLimit').value),
                    timezone: document.getElementById('timezone').value,
                    signalThreshold: parseInt(document.getElementById('signalThreshold').value),
                    maxSignalsPerDay: parseInt(document.getElementById('maxSignalsPerDay').value),
                    dailyReportTime: document.getElementById('dailyReportTime').value,
                    telegramToken: document.getElementById('telegramToken').value,
                    telegramGroupId: document.getElementById('telegramGroupId').value,
                    telegramEnabled: document.getElementById('telegramEnabled').checked
                };

                // Validar configurações
                if (settings.apiLimit < 1 || settings.apiLimit > 1000) {
                    alert('❌ Limite de chamadas deve estar entre 1 e 1000');
                    return;
                }

                if (settings.signalThreshold < 50 || settings.signalThreshold > 100) {
                    alert('❌ Threshold de sinais deve estar entre 50% e 100%');
                    return;
                }

                if (settings.maxSignalsPerDay < 1 || settings.maxSignalsPerDay > 200) {
                    alert('❌ Máximo de sinais por dia deve estar entre 1 e 200');
                    return;
                }

                // Simular salvamento (em produção seria uma chamada à API)
                addCommentatorLog('💾 Configurações validadas e guardadas com sucesso', 'success');
                addCommentatorLog('🔧 Threshold: ' + settings.signalThreshold + '% | Max Sinais: ' + settings.maxSignalsPerDay + ' | Relatório: ' + settings.dailyReportTime, 'info');
                
                alert('✅ Configurações guardadas com sucesso!');
                closeSettingsPanel();

            } catch (error) {
                console.error('Erro ao guardar configurações:', error);
                addCommentatorLog('❌ Erro ao guardar configurações: ' + error.message, 'error');
                alert('❌ Erro ao guardar configurações: ' + error.message);
            }
        }

        // Event listener para botão de limpar sinais
        document.getElementById('clearSignals').addEventListener('click', () => {
            document.getElementById('signals-list').innerHTML = '<div class="text-gray-400">Nenhum sinal enviado</div>';
        });

        // Atualizar comentador a cada 5 segundos
        setInterval(loadCommentatorLogs, 5000);

        // ===== CALENDÁRIO HORIZONTAL =====
        let currentWeek = new Date();
        let selectedDate = new Date().toISOString().split('T')[0];
        let allGames = [];
        let selectedGames = new Set();

        function initializeCalendar() {
            updateCalendarDisplay();
            setupCalendarEventListeners();
            setupGamesEventListeners();
            loadGamesForDate(selectedDate);
        }

        function setupCalendarEventListeners() {
            // Botões de navegação
            document.getElementById('prevWeek').addEventListener('click', () => {
                currentWeek.setDate(currentWeek.getDate() - 7);
                updateCalendarDisplay();
            });

            document.getElementById('nextWeek').addEventListener('click', () => {
                currentWeek.setDate(currentWeek.getDate() + 7);
                updateCalendarDisplay();
            });

            document.getElementById('goToday').addEventListener('click', () => {
                currentWeek = new Date();
                selectedDate = new Date().toISOString().split('T')[0];
                updateCalendarDisplay();
                loadGamesForDate(selectedDate);
            });

            // Clique nos dias
            for (let i = 0; i < 7; i++) {
                document.getElementById('day-' + i).addEventListener('click', () => {
                    selectDay(i);
                });
            }
        }

        function setupGamesEventListeners() {
            // Barra de pesquisa
            const searchInput = document.getElementById('gamesSearch');
            const clearSearchBtn = document.getElementById('clearSearch');
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (query) {
                    clearSearchBtn.classList.remove('hidden');
                    filterGames(query);
                } else {
                    clearSearchBtn.classList.add('hidden');
                    showAllGames();
                }
            });

            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchBtn.classList.add('hidden');
                showAllGames();
            });

            // Botões de seleção
            document.getElementById('selectAllGames').addEventListener('click', () => {
                selectAllVisibleGames();
            });

            document.getElementById('deselectAllGames').addEventListener('click', () => {
                deselectAllGames();
            });
        }

        function updateCalendarDisplay() {
            const startOfWeek = getStartOfWeek(currentWeek);
            
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                
                const dayElement = document.getElementById('day-' + i);
                const dateElement = document.getElementById('date-' + i);
                
                // Atualizar data
                const dayOfMonth = day.getDate();
                dateElement.textContent = dayOfMonth.toString().padStart(2, '0');
                
                // Resetar estilos
                dayElement.className = 'h-16 flex flex-col items-center justify-center p-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors';
                
                // Verificar se é hoje
                const today = new Date();
                if (day.toDateString() === today.toDateString()) {
                    dayElement.className = 'h-16 flex flex-col items-center justify-center p-2 border-2 border-red-500 rounded-lg cursor-pointer bg-red-900/20';
                    const weekdaySpan = dayElement.querySelector('span:first-child');
                    weekdaySpan.textContent = 'HOJE';
                    weekdaySpan.className = 'text-xs font-medium text-red-400';
                    dateElement.className = 'text-lg font-bold text-red-400';
                } else {
                    const weekdaySpan = dayElement.querySelector('span:first-child');
                    const weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
                    weekdaySpan.textContent = weekdays[day.getDay() === 0 ? 6 : day.getDay() - 1];
                    weekdaySpan.className = 'text-xs font-medium text-gray-400';
                    dateElement.className = 'text-lg font-bold';
                }
                
                // Verificar se é o dia selecionado
                const dayString = day.toISOString().split('T')[0];
                if (dayString === selectedDate) {
                    dayElement.className += ' bg-blue-900/30 border-blue-500';
                }
            }
        }

        function getStartOfWeek(date) {
            const startOfWeek = new Date(date);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            return startOfWeek;
        }

        function selectDay(dayIndex) {
            const startOfWeek = getStartOfWeek(currentWeek);
            const selectedDay = new Date(startOfWeek);
            selectedDay.setDate(startOfWeek.getDate() + dayIndex);
            selectedDate = selectedDay.toISOString().split('T')[0];
            
            updateCalendarDisplay();
            updateSelectedDayTitle(selectedDay);
            loadGamesForDate(selectedDate);
        }

        function updateSelectedDayTitle(date) {
            const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            const weekday = weekdays[date.getDay()];
            const day = date.getDate();
            const month = months[date.getMonth()];
            
            document.getElementById('selectedDayTitle').textContent = 'Jogos - ' + weekday + ', ' + day + ' de ' + month;
        }

        async function loadGamesForDate(date) {
            const gamesList = document.getElementById('gamesList');
            const gamesLoading = document.getElementById('gamesLoading');
            const gamesError = document.getElementById('gamesError');
            const noGamesMessage = document.getElementById('noGamesMessage');
            
            // Mostrar loading
            gamesLoading.classList.remove('hidden');
            gamesError.classList.add('hidden');
            noGamesMessage.classList.add('hidden');
            gamesList.innerHTML = '';
            
            try {
                // Buscar jogos futuros primeiro
                let response = await fetch('/api/v1/future-games');
                let games = [];
                
                if (response.ok) {
                    const data = await response.json();
                    const allFutureGames = Array.isArray(data) ? data : [];
                    
                    // Filtrar jogos pela data selecionada
                    const selectedDate = new Date(date).toISOString().split('T')[0];
                    games = allFutureGames.filter(game => {
                        const gameDate = new Date(game.date).toISOString().split('T')[0];
                        return gameDate === selectedDate;
                    });
                }
                
                // Se não há jogos futuros, tentar buscar jogos ao vivo
                if (games.length === 0) {
                    response = await fetch('/api/v1/live-games');
                    
                    if (response.ok) {
                        const data = await response.json();
                        const liveGames = Array.isArray(data) ? data : [];
                        
                        // Filtrar jogos ao vivo pela data selecionada
                        const selectedDate = new Date(date).toISOString().split('T')[0];
                        games = liveGames.filter(game => {
                            const gameDate = new Date(game.date).toISOString().split('T')[0];
                            return gameDate === selectedDate;
                        });
                    }
                }
                
                // Armazenar todos os jogos
                allGames = games;
                
                // Esconder loading
                gamesLoading.classList.add('hidden');
                
                if (games.length === 0) {
                    noGamesMessage.classList.remove('hidden');
                    hideGameControls();
                } else {
                    displayGames(games);
                    showGameControls();
                }
                
            } catch (error) {
                console.error('Erro ao carregar jogos:', error);
                gamesLoading.classList.add('hidden');
                gamesError.classList.remove('hidden');
                document.getElementById('gamesErrorText').textContent = '❌ Erro ao carregar jogos: ' + error.message;
            }
        }

        function displayGames(games) {
            const gamesList = document.getElementById('gamesList');
            gamesList.innerHTML = '';
            
            games.forEach(game => {
                const gameElement = document.createElement('div');
                gameElement.className = 'flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700/70 transition-colors';
                gameElement.dataset.gameId = game.id;
                
                const gameTime = new Date(game.date).toLocaleTimeString('pt-PT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                // Determinar status do jogo
                const now = new Date();
                const gameDate = new Date(game.date);
                let statusBadge, statusText;
                
                if (game.status === 'LIVE') {
                    statusBadge = 'bg-red-600';
                    statusText = 'AO VIVO';
                } else if (gameDate < now) {
                    statusBadge = 'bg-yellow-600';
                    statusText = 'TERMINADO';
                } else {
                    statusBadge = 'bg-green-600';
                    statusText = 'FUTURO';
                }
                
                // Checkbox para seleção
                const isSelected = selectedGames.has(game.id);
                const checkboxClass = isSelected ? 'checked' : '';
                
                gameElement.innerHTML = 
                    '<div class="flex items-center">' +
                        '<input type="checkbox" class="game-checkbox w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" ' + 
                        (isSelected ? 'checked' : '') + ' data-game-id="' + game.id + '">' +
                    '</div>' +
                    '<div class="flex-1 min-w-0">' +
                        '<div class="flex items-center gap-2 mb-1">' +
                            '<span class="font-medium text-sm truncate">' + game.home_team + ' vs ' + game.away_team + '</span>' +
                            '<span class="' + statusBadge + ' text-white px-2 py-1 rounded text-xs whitespace-nowrap">' + statusText + '</span>' +
                        '</div>' +
                        '<div class="text-xs text-gray-400 truncate">' +
                            game.league + ' • ' + game.country +
                        '</div>' +
                    '</div>' +
                    '<div class="text-right flex-shrink-0">' +
                        '<div class="text-sm font-medium">' + gameTime + '</div>' +
                        '<div class="text-xs text-gray-400">ID: ' + game.id + '</div>' +
                    '</div>';
                
                // Adicionar evento ao checkbox
                const checkbox = gameElement.querySelector('.game-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedGames.add(game.id);
                        gameElement.classList.add('bg-blue-900/30', 'border-blue-500');
                    } else {
                        selectedGames.delete(game.id);
                        gameElement.classList.remove('bg-blue-900/30', 'border-blue-500');
                    }
                    updateSelectedGamesInfo();
                });
                
                gamesList.appendChild(gameElement);
            });
            
            updateSelectedGamesInfo();
        }

        function filterGames(query) {
            if (!query || typeof query !== 'string') return allGames;
            
            const filteredGames = allGames.filter(game => {
                const homeTeam = game.home_team.toLowerCase();
                const awayTeam = game.away_team.toLowerCase();
                const league = game.league.toLowerCase();
                const searchTerms = query.toLowerCase().split(' ');
                
                return searchTerms.every(term => 
                    homeTeam.includes(term) || 
                    awayTeam.includes(term) || 
                    league.includes(term)
                );
            });
            
            displayGames(filteredGames);
            updateSearchResults(query, filteredGames.length);
        }

        function showAllGames() {
            displayGames(allGames);
            document.getElementById('searchResults').classList.add('hidden');
        }

        function updateSearchResults(query, count) {
            const searchResults = document.getElementById('searchResults');
            searchResults.innerHTML = 'Pesquisando por "' + query + '" - ' + count + ' jogos encontrados';
            searchResults.classList.remove('hidden');
        }

        function selectAllVisibleGames() {
            const checkboxes = document.querySelectorAll('.game-checkbox');
            checkboxes.forEach(checkbox => {
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    const gameId = parseInt(checkbox.dataset.gameId);
                    selectedGames.add(gameId);
                    const gameElement = checkbox.closest('[data-game-id]');
                    gameElement.classList.add('bg-blue-900/30', 'border-blue-500');
                }
            });
            updateSelectedGamesInfo();
        }

        function deselectAllGames() {
            selectedGames.clear();
            const checkboxes = document.querySelectorAll('.game-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const gameElement = checkbox.closest('[data-game-id]');
                gameElement.classList.remove('bg-blue-900/30', 'border-blue-500');
            });
            updateSelectedGamesInfo();
        }

        function updateSelectedGamesInfo() {
            const selectedCount = selectedGames.size;
            const selectedInfo = document.getElementById('selectedGamesInfo');
            const selectedCountSpan = document.getElementById('selectedCount');
            
            if (selectedCount > 0) {
                selectedCountSpan.textContent = selectedCount;
                selectedInfo.classList.remove('hidden');
            } else {
                selectedInfo.classList.add('hidden');
            }
        }

        function showGameControls() {
            document.getElementById('selectAllGames').classList.remove('hidden');
            document.getElementById('deselectAllGames').classList.remove('hidden');
        }

        function hideGameControls() {
            document.getElementById('selectAllGames').classList.add('hidden');
            document.getElementById('deselectAllGames').classList.add('hidden');
        }

        // Inicializar calendário quando a página carregar (já está no DOMContentLoaded principal)
        setTimeout(() => {
            if (document.getElementById('day-0')) {
                initializeCalendar();
            }
        }, 100);
    </script>
</body>
</html>`;
}
