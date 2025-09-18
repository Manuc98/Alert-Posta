# Componente CalendarHorizontal

## Descrição
Componente de calendário horizontal para seleção de dias e visualização de jogos do Alert@Postas.

## Funcionalidades
- ✅ Calendário horizontal com navegação semanal
- ✅ Seleção de dias com destaque visual
- ✅ Integração com API de jogos existente
- ✅ Exibição de jogos futuros e ao vivo
- ✅ Estados de loading e erro
- ✅ Design responsivo e acessível
- ✅ Mensagem "Sem jogos disponíveis" quando não há jogos

## Props

### CalendarHorizontalProps
```typescript
interface CalendarHorizontalProps {
  onDateSelect: (date: string) => void    // Callback quando um dia é selecionado
  onGamesLoad: (games: Game[]) => void    // Callback quando jogos são carregados
  selectedDate?: string                   // Data selecionada (formato YYYY-MM-DD)
}
```

### Game Interface
```typescript
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
```

## Uso

```tsx
import { CalendarHorizontal } from '@/components/ui/calendar-horizontal'

function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [games, setGames] = useState<Game[]>([])

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
  }

  const handleGamesLoad = (loadedGames: Game[]) => {
    setGames(loadedGames)
  }

  return (
    <CalendarHorizontal 
      onDateSelect={handleDateSelect}
      onGamesLoad={handleGamesLoad}
      selectedDate={selectedDate}
    />
  )
}
```

## API Integration

O componente faz chamadas para:
- `GET /api/v1/future-games` - Jogos futuros
- `GET /api/v1/live-games` - Jogos ao vivo

Filtra automaticamente os jogos pela data selecionada.

## Estilos

- Usa Tailwind CSS para estilização
- Compatível com modo escuro/claro
- Design consistente com o tema do dashboard
- Responsivo para diferentes tamanhos de tela

## Testes

Testes unitários incluídos em `__tests__/calendar-horizontal.test.tsx`:
- ✅ Renderização do componente
- ✅ Seleção de dias
- ✅ Navegação entre semanas
- ✅ Carregamento de jogos
- ✅ Estados de erro
- ✅ Mensagem "Sem jogos disponíveis"

## Dependências

- React 18+
- Lucide React (ícones)
- Tailwind CSS
- Componentes UI existentes (Button, Card, Badge)

## Compatibilidade

- ✅ Next.js 14+
- ✅ TypeScript
- ✅ React 18+
- ✅ Tailwind CSS
- ✅ Sistema de autenticação existente (não alterado)
- ✅ API existente (não alterada)
