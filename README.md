# Alert@Postas - Sistema de Gestão de Apostas

Sistema React moderno para gestão de apostas desportivas com interface intuitiva e funcionalidades avançadas.

## 🚀 Tecnologias

- **React 18.2.0** - Framework principal
- **React Router DOM 6.26.1** - Roteamento
- **Vite 5.2.0** - Build tool e dev server
- **CSS3** - Estilização moderna

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── pages/              # Páginas da aplicação
│   ├── BotControl/     # Controlo do bot de apostas
│   ├── Historico/      # Histórico de performance
│   ├── Notificacoes/   # Gestão de notificações
│   ├── Logs/           # Logs do sistema
│   ├── Subscricao/     # Gestão de subscrições
│   ├── Admin/          # Painel administrativo
│   ├── Configuracoes/  # Configurações do sistema
│   └── Dashboard/      # Dashboard principal
├── layout/             # Layout principal com sidebar/topbar
├── App.jsx             # Configuração de rotas
└── main.jsx            # Ponto de entrada
```

## 🎯 Funcionalidades

### Dashboard
- Visão geral do sistema
- Estatísticas em tempo real
- Sinais recentes
- Ações rápidas

### Controlo do Bot
- Iniciar/parar bot
- Gestão de módulos (Over/Under, Winner, Value Bet, etc.)
- Monitorização de status

### Histórico
- Análise de performance
- Estatísticas detalhadas
- Relatórios de resultados

### Notificações
- Configuração de alertas
- Histórico de notificações
- Preferências personalizadas

### Logs
- Monitorização do sistema
- Registos de atividade
- Debugging avançado

### Subscrição
- Gestão de planos
- Faturação
- Upgrades/downgrades

### Admin
- Gestão de utilizadores
- Configurações do sistema
- Monitorização avançada

### Configurações
- API keys
- Preferências
- Personalização

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install
```

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev
```
A aplicação estará disponível em http://localhost:5173/

### Build para Produção
```bash
# Criar build otimizado
npm run build

# Preview do build
npm run preview
```

### Linting
```bash
# Verificar código
npm run lint
```

## 🎨 Design

- **Interface moderna** com sidebar retrátil
- **Design responsivo** para todos os dispositivos
- **Tema claro/escuro** (preparado)
- **Componentes reutilizáveis**
- **Navegação intuitiva**

## 📱 Responsividade

- Desktop: Layout completo com sidebar
- Tablet: Sidebar retrátil
- Mobile: Menu hambúrguer

## 🔧 Configuração

### Variáveis de Ambiente
Criar `.env` para configurações específicas:
```env
VITE_API_URL=https://api.alertapostas.com
VITE_APP_NAME=Alert@Postas
```

## 📊 Funcionalidades Técnicas

- **React Router** para navegação SPA
- **CSS Grid/Flexbox** para layouts responsivos
- **Componentes funcionais** com hooks
- **Estado local** com useState
- **Estrutura modular** e escalável

## 🚀 Próximos Passos

1. Integração com APIs
2. Autenticação
3. Estado global (Redux/Zustand)
4. Testes unitários
5. Deploy automatizado

## 📝 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build
- `npm run lint` - Verificação de código

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para a feature
3. Commit das mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Alert@Postas** - Sistema profissional de gestão de apostas desportivas 🎯
