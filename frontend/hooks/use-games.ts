"use client"

import { useState, useCallback } from 'react'

export interface Game {
  id: number
  home_team: string
  away_team: string
  league: string
  league_id: number
  date: string
  country: string
  status?: 'NS' | 'LIVE' | 'FT' | 'AET' | 'PEN'
}

export interface UseGamesReturn {
  games: Game[]
  loading: boolean
  error: string | null
  fetchGames: (date: string) => Promise<void>
  clearGames: () => void
  getGamesByStatus: (status: 'NS' | 'LIVE' | 'FT' | 'AET' | 'PEN') => Game[]
  getGamesByLeague: (leagueId: number) => Game[]
}

export function useGames(): UseGamesReturn {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGames = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Tentar buscar jogos futuros primeiro
      let response = await fetch(`https://alertapostas.ecarvalho140.workers.dev/api/v1/future-games`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar jogos futuros: ${response.status}`)
      }

      let data = await response.json()
      let gamesData = Array.isArray(data) ? data : []

      // Filtrar jogos pela data selecionada
      const selectedDate = new Date(date).toISOString().split('T')[0]
      gamesData = gamesData.filter((game: Game) => {
        const gameDate = new Date(game.date).toISOString().split('T')[0]
        return gameDate === selectedDate
      })

      // Se não há jogos futuros, tentar buscar jogos ao vivo
      if (gamesData.length === 0) {
        response = await fetch(`https://alertapostas.ecarvalho140.workers.dev/api/v1/live-games`)
        
        if (response.ok) {
          data = await response.json()
          const liveGames = Array.isArray(data) ? data : []
          
          // Filtrar jogos ao vivo pela data selecionada
          gamesData = liveGames.filter((game: Game) => {
            const gameDate = new Date(game.date).toISOString().split('T')[0]
            return gameDate === selectedDate
          })
        }
      }

      setGames(gamesData)
    } catch (err) {
      console.error('Erro ao buscar jogos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearGames = useCallback(() => {
    setGames([])
    setError(null)
  }, [])

  const getGamesByStatus = useCallback((status: 'NS' | 'LIVE' | 'FT' | 'AET' | 'PEN') => {
    return games.filter(game => game.status === status)
  }, [games])

  const getGamesByLeague = useCallback((leagueId: number) => {
    return games.filter(game => game.league_id === leagueId)
  }, [games])

  return {
    games,
    loading,
    error,
    fetchGames,
    clearGames,
    getGamesByStatus,
    getGamesByLeague
  }
}
