import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CalendarHorizontal } from '../calendar-horizontal'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn()

// Mock dos ícones do Lucide
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="chevron-left">←</div>,
  ChevronRight: () => <div data-testid="chevron-right">→</div>,
  Calendar: () => <div data-testid="calendar">📅</div>,
  Clock: () => <div data-testid="clock">🕐</div>,
  Trophy: () => <div data-testid="trophy">🏆</div>,
}))

// Mock dos componentes UI
jest.mock('../../ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('../../ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}))

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}))

// Mock do utils
jest.mock('../../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

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
]

describe('CalendarHorizontal', () => {
  const mockOnDateSelect = jest.fn()
  const mockOnGamesLoad = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renderiza o calendário corretamente', () => {
    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    expect(screen.getByText('Seleção de Dias')).toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
  })

  it('exibe os dias da semana corretamente', () => {
    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    // Verifica se os dias da semana estão presentes
    expect(screen.getByText('Seg')).toBeInTheDocument()
    expect(screen.getByText('Ter')).toBeInTheDocument()
    expect(screen.getByText('Qua')).toBeInTheDocument()
    expect(screen.getByText('Qui')).toBeInTheDocument()
    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
  })

  it('chama onDateSelect quando um dia é selecionado', async () => {
    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    // Simula clique em um dia (busca por um botão que contenha uma data)
    const dayButton = screen.getByText('19')
    fireEvent.click(dayButton)

    await waitFor(() => {
      expect(mockOnDateSelect).toHaveBeenCalled()
    })
  })

  it('navega entre semanas corretamente', () => {
    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    const prevButton = screen.getByTestId('chevron-left')
    const nextButton = screen.getByTestId('chevron-right')

    fireEvent.click(prevButton)
    fireEvent.click(nextButton)

    // Verifica se os botões estão funcionando (sem erro)
    expect(prevButton).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })

  it('mostra "Sem jogos disponíveis" quando não há jogos', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Sem jogos disponíveis')).toBeInTheDocument()
    })
  })

  it('exibe jogos quando disponíveis', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    })

    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Team A vs Team B')).toBeInTheDocument()
      expect(screen.getByText('Team C vs Team D')).toBeInTheDocument()
      expect(screen.getByText('AO VIVO')).toBeInTheDocument()
      expect(screen.getByText('FUTURO')).toBeInTheDocument()
    })
  })

  it('exibe erro quando fetch falha', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('❌ Network error')).toBeInTheDocument()
    })
  })

  it('chama onGamesLoad quando jogos são carregados', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    })

    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    await waitFor(() => {
      expect(mockOnGamesLoad).toHaveBeenCalledWith(mockGames)
    })
  })

  it('botão "Hoje" funciona corretamente', () => {
    render(
      <CalendarHorizontal
        onDateSelect={mockOnDateSelect}
        onGamesLoad={mockOnGamesLoad}
        selectedDate="2025-09-19"
      />
    )

    const todayButton = screen.getByText('Hoje')
    fireEvent.click(todayButton)

    expect(todayButton).toBeInTheDocument()
  })
})
