"use client"

import { useState, useEffect } from 'react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { ChevronLeft, ChevronRight, Calendar, Clock, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Game {
  id: number
  home_team: string
  away_team: string
  league: string
  league_id: number
  date: string
  country: string
  status?: 'NS' | 'LIVE' | 'FT' | 'AET' | 'PEN'
}

interface CalendarHorizontalProps {
  onDateSelect: (date: string) => void
  onGamesLoad: (games: Game[]) => void
  selectedDate?: string
}

export function CalendarHorizontal({ 
  onDateSelect, 
  onGamesLoad, 
  selectedDate 
}: CalendarHorizontalProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string>(
    selectedDate || new Date().toISOString().split('T')[0]
  )
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gerar dias da semana
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para segunda-feira
    startOfWeek.setDate(diff)

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays(currentWeek)

  // Buscar jogos para uma data específica
  const fetchGamesForDate = async (date: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://alertapostas.ecarvalho140.workers.dev/api/v1/games?date=${date}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar jogos: ${response.status}`)
      }

      const data = await response.json()
      const gamesData = Array.isArray(data) ? data : data.games || []
      
      setGames(gamesData)
      onGamesLoad(gamesData)
    } catch (err) {
      console.error('Erro ao buscar jogos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setGames([])
      onGamesLoad([])
    } finally {
      setLoading(false)
    }
  }

  // Selecionar dia
  const handleDaySelect = (date: string) => {
    setSelectedDay(date)
    onDateSelect(date)
    fetchGamesForDate(date)
  }

  // Navegar entre semanas
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }

  // Ir para hoje
  const goToToday = () => {
    const today = new Date()
    setCurrentWeek(today)
    handleDaySelect(today.toISOString().split('T')[0])
  }

  // Formatação de data
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  const formatWeekday = (date: Date) => {
    return date.toLocaleDateString('pt-PT', { 
      weekday: 'short' 
    })
  }

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toISOString().split('T')[0] === selectedDay
  }

  // Carregar jogos ao selecionar dia inicial
  useEffect(() => {
    if (selectedDay) {
      fetchGamesForDate(selectedDay)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Calendário Horizontal */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Seleção de Dias</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <Button
                key={index}
                variant={isSelected(day) ? "default" : "outline"}
                className={cn(
                  "h-16 flex flex-col items-center justify-center p-2",
                  isToday(day) && "ring-2 ring-blue-500 ring-offset-2",
                  isSelected(day) && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleDaySelect(day.toISOString().split('T')[0])}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {formatWeekday(day)}
                </span>
                <span className="text-lg font-bold">
                  {formatDate(day)}
                </span>
                {isToday(day) && (
                  <Badge variant="secondary" className="text-xs">
                    Hoje
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jogos do Dia Selecionado */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                Jogos - {new Date(selectedDay).toLocaleDateString('pt-PT', { 
                  weekday: 'long', 
                  day: '2-digit', 
                  month: 'long' 
                })}
              </h3>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Carregando...
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ❌ {error}
              </p>
            </div>
          )}

          {games.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Sem jogos disponíveis</p>
                <p className="text-sm">
                  Não há jogos programados para esta data
                </p>
              </div>
            </div>
          )}

          {games.length > 0 && (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {game.home_team} vs {game.away_team}
                      </span>
                      {game.status === 'LIVE' && (
                        <Badge variant="destructive" className="text-xs">
                          AO VIVO
                        </Badge>
                      )}
                      {game.status === 'NS' && (
                        <Badge variant="secondary" className="text-xs">
                          FUTURO
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {game.league} • {game.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatGameTime(game.date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {game.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
