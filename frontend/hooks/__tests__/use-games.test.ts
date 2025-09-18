import { renderHook, act } from '@testing-library/react'
import { useGames } from '../use-games'

// Mock fetch
global.fetch = jest.fn()

const mockGames = [
  {
    id: 1,
    home_team: 'Team A',
    away_team: 'Team B',
    league: 'Test League',
    league_id: 1,
    date: '2025-09-19T15:00:00Z',
    country: 'Portugal',
    status: 'NS' as const,
  },
  {
    id: 2,
    home_team: 'Team C',
    away_team: 'Team D',
    league: 'Test League 2',
    league_id: 2,
    date: '2025-09-19T17:00:00Z',
    country: 'Spain',
    status: 'LIVE' as const,
  },
  {
    id: 3,
    home_team: 'Team E',
    away_team: 'Team F',
    league: 'Test League',
    league_id: 1,
    date: '2025-09-19T19:00:00Z',
    country: 'Portugal',
    status: 'FT' as const,
  },
]

describe('useGames', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('inicializa com estado vazio', () => {
    const { result } = renderHook(() => useGames())

    expect(result.current.games).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('busca jogos com sucesso', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    })

    const { result } = renderHook(() => useGames())

    await act(async () => {
      await result.current.fetchGames('2025-09-19')
    })

    expect(result.current.games).toEqual(mockGames)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      'https://alertapostas.ecarvalho140.workers.dev/api/v1/future-games'
    )
  })

  it('lida com erro de fetch', async () => {
    const errorMessage = 'Network error'
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

    const { result } = renderHook(() => useGames())

    await act(async () => {
      await result.current.fetchGames('2025-09-19')
    })

    expect(result.current.games).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('lida com resposta não-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useGames())

    await act(async () => {
      await result.current.fetchGames('2025-09-19')
    })

    expect(result.current.games).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Erro ao buscar jogos: 500')
  })

  it('filtra jogos por status corretamente', () => {
    const { result } = renderHook(() => useGames())

    // Simula jogos carregados
    act(() => {
      result.current.games.push(...mockGames)
    })

    const liveGames = result.current.getGamesByStatus('LIVE')
    const futureGames = result.current.getGamesByStatus('NS')
    const finishedGames = result.current.getGamesByStatus('FT')

    expect(liveGames).toHaveLength(1)
    expect(liveGames[0].id).toBe(2)
    expect(futureGames).toHaveLength(1)
    expect(futureGames[0].id).toBe(1)
    expect(finishedGames).toHaveLength(1)
    expect(finishedGames[0].id).toBe(3)
  })

  it('filtra jogos por liga corretamente', () => {
    const { result } = renderHook(() => useGames())

    // Simula jogos carregados
    act(() => {
      result.current.games.push(...mockGames)
    })

    const league1Games = result.current.getGamesByLeague(1)
    const league2Games = result.current.getGamesByLeague(2)

    expect(league1Games).toHaveLength(2)
    expect(league1Games[0].id).toBe(1)
    expect(league1Games[1].id).toBe(3)
    expect(league2Games).toHaveLength(1)
    expect(league2Games[0].id).toBe(2)
  })

  it('limpa jogos corretamente', () => {
    const { result } = renderHook(() => useGames())

    // Simula jogos carregados
    act(() => {
      result.current.games.push(...mockGames)
      result.current.error = 'Some error'
    })

    act(() => {
      result.current.clearGames()
    })

    expect(result.current.games).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('tenta buscar jogos ao vivo quando futuros não existem', async () => {
    // Primeiro fetch (futuros) retorna array vazio
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Segundo fetch (ao vivo) retorna jogos
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames.filter(game => game.status === 'LIVE'),
    })

    const { result } = renderHook(() => useGames())

    await act(async () => {
      await result.current.fetchGames('2025-09-19')
    })

    expect(result.current.games).toHaveLength(1)
    expect(result.current.games[0].status).toBe('LIVE')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('lida com dados não-array na resposta', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: mockGames }),
    })

    const { result } = renderHook(() => useGames())

    await act(async () => {
      await result.current.fetchGames('2025-09-19')
    })

    expect(result.current.games).toEqual(mockGames)
  })
})
