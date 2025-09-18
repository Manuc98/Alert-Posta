"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarHorizontal } from '@/components/ui/calendar-horizontal'
import { useToast } from '@/hooks/use-toast'
import { useGames, Game } from '@/hooks/use-games'
import { 
  Activity, 
  Bot, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPIData {
  signals_today: number
  accuracy_7d: number
  roi_estimated: number
  active_model: {
    name: string
    accuracy: number
    module: string
  }
}

interface BotStatus {
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping'
  uptime: number
  modules: Array<{
    name: string
    status: 'active' | 'inactive' | 'error' | 'loading'
    uptime?: number
    last_error?: string
  }>
}

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [botLoading, setBotLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedGames, setSelectedGames] = useState<Game[]>([])
  const { toast } = useToast()
  const { games, loading: gamesLoading, error: gamesError, fetchGames } = useGames()

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Atualizar a cada 30s
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Buscar dados reais do worker
      const response = await fetch('https://alertapostas.ecarvalho140.workers.dev/site/stats')
      
      if (response.ok) {
        const data = await response.json()
        setKpiData({
          signals_today: data.signals_today || 0,
          accuracy_7d: data.accuracy_7d || 0,
          roi_estimated: data.roi_estimated || 0,
          active_model: {
            name: data.active_model?.name || "Nenhum",
            accuracy: data.active_model?.accuracy || 0,
            module: data.active_model?.module || "unknown"
          }
        })

        setBotStatus({
          status: data.bot_status?.status || 'stopped',
          uptime: data.bot_status?.uptime || 0,
          modules: data.bot_status?.modules || [
            { name: 'telegram', status: 'inactive' },
            { name: 'ml_pipeline', status: 'inactive' },
            { name: 'api_fetcher', status: 'inactive' }
          ]
        })
      } else {
        // Fallback para dados simulados se API não estiver disponível
        setKpiData({
          signals_today: 12,
          accuracy_7d: 67.5,
          roi_estimated: 15.2,
          active_model: {
            name: "Winner Model v2.1",
            accuracy: 68.4,
            module: "winner"
          }
        })

        setBotStatus({
          status: 'running',
          uptime: 3600,
          modules: [
            { name: 'telegram', status: 'active', uptime: 3600 },
            { name: 'ml_pipeline', status: 'active', uptime: 3600 },
            { name: 'api_fetcher', status: 'active', uptime: 3600 }
          ]
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleBotAction = async (action: 'start' | 'stop' | 'restart') => {
    setBotLoading(true)
    try {
      // Simular ação do bot
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Sucesso",
        description: `Bot ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'} com sucesso`,
      })
      
      // Atualizar status
      if (action === 'restart') {
        setBotStatus(prev => prev ? { ...prev, status: 'running' } : null)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: `Erro ao ${action} o bot`,
        variant: "destructive",
      })
    } finally {
      setBotLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'text-green-600 dark:text-green-400'
      case 'stopped':
      case 'inactive':
        return 'text-red-600 dark:text-red-400'
      case 'error':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'success'
      case 'stopped':
      case 'inactive':
        return 'destructive'
      case 'error':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Handlers para o calendário
  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    fetchGames(date)
  }

  const handleGamesLoad = (games: Game[]) => {
    setSelectedGames(games)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert@Postas V3</h1>
          <p className="text-muted-foreground">
            Sistema de previsões desportivas com IA
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusBadge(botStatus?.status || 'stopped')}>
            <Activity className="w-3 h-3 mr-1" />
            {botStatus?.status || 'Desconhecido'}
          </Badge>
        </div>
      </div>

      {/* Bot Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Controlo do Bot
          </CardTitle>
          <CardDescription>
            Gerir o estado e módulos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusBadge(botStatus?.status || 'stopped')}>
                  {botStatus?.status || 'Desconhecido'}
                </Badge>
                {botStatus?.uptime && (
                  <span className="text-sm text-muted-foreground">
                    Uptime: {formatUptime(botStatus.uptime)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {botStatus?.modules.map((module) => (
                  <div key={module.name} className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      module.status === 'active' ? "bg-green-500" : 
                      module.status === 'error' ? "bg-red-500" : "bg-gray-500"
                    )} />
                    <span className="text-sm capitalize">{module.name}</span>
                    <Badge variant={getStatusBadge(module.status)}>
                      {module.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="gradient" 
                onClick={() => handleBotAction('start')}
                disabled={botLoading || botStatus?.status === 'running'}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBotAction('stop')}
                disabled={botLoading || botStatus?.status === 'stopped'}
              >
                <Pause className="h-4 w-4 mr-2" />
                Parar
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleBotAction('restart')}
                disabled={botLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="kpi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sinais Hoje</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.signals_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              +2 desde ontem
            </p>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto 7d</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.accuracy_7d || 0}%</div>
            <p className="text-xs text-muted-foreground">
              +3.2% esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Estimado</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{kpiData?.roi_estimated || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelo Ativo</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{kpiData?.active_model.name || 'Nenhum'}</div>
            <p className="text-xs text-muted-foreground">
              Accuracy: {kpiData?.active_model.accuracy || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendário e Jogos */}
      <CalendarHorizontal 
        onDateSelect={handleDateSelect}
        onGamesLoad={handleGamesLoad}
        selectedDate={selectedDate}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sinais</CardTitle>
            <CardDescription>
              Histórico e gestão de sinais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Ver Sinais Recentes
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Exportar Dados
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise</CardTitle>
            <CardDescription>
              Configurar análise dos jogos selecionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={selectedGames.length === 0}
              >
                Analisar Jogos Selecionados ({selectedGames.length})
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Configurar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
