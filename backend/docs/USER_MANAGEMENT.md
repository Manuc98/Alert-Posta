# 🔑 Sistema de Gestão de Utilizadores - Alert@Postas

## 📋 Visão Geral

O sistema de gestão de utilizadores do Alert@Postas implementa um sistema RBAC (Role-Based Access Control) com três níveis de acesso:

- **super_admin**: Acesso total ao sistema
- **developer**: Acesso administrativo limitado  
- **client**: Acesso básico ao sistema

## 🏗️ Estrutura de Roles

### super_admin
- **Descrição**: Administrador principal com acesso total ao sistema
- **Permissões**:
  - Gerir utilizadores (criar, editar, listar, eliminar)
  - Aceder ao painel admin
  - Modificar configurações do sistema
  - Aceder aos modelos ML
  - Eliminar utilizadores
  - Criar outros super_admin

### developer
- **Descrição**: Desenvolvedor com acesso administrativo limitado
- **Permissões**:
  - Gerir utilizadores (criar, editar, listar - não pode eliminar)
  - Aceder ao painel admin
  - Aceder aos modelos ML
  - Ver estatísticas

### client
- **Descrição**: Cliente com acesso básico ao sistema
- **Permissões**:
  - Ver dashboard
  - Receber sinais
  - Ver histórico próprio

## 🚀 Setup Inicial

### 1. Criar Utilizadores Iniciais

Execute o script para criar os utilizadores iniciais:

```bash
cd backend
python run_create_users.py
```

Isso criará:
- **Super Admin**: `admin@alertapostas.pt` / `Alert@Postas2025!`
- **Developer**: `developer@alertapostas.pt` / `Dev@Postas2025!`

### 2. Configurar Base de Dados

Certifique-se de que a base de dados está configurada e as tabelas criadas:

```bash
# Se usando PostgreSQL
psql -U alertapostas -d alertapostas_db -f init.sql
```

## 📚 API Endpoints

### Autenticação
Todos os endpoints (exceto login) requerem autenticação JWT válida.

### Endpoints Disponíveis

#### GET `/api/v1/users`
Listar utilizadores com filtros e paginação.

**Parâmetros**:
- `role`: Filtrar por role (opcional)
- `is_active`: Filtrar por status ativo (opcional)
- `limit`: Limite de resultados (default: 100)
- `offset`: Offset para paginação (default: 0)

**Permissões**: Apenas admin (super_admin ou developer)

#### GET `/api/v1/users/{user_id}`
Obter utilizador específico.

**Permissões**: Admin ou próprio perfil

#### POST `/api/v1/users`
Criar novo utilizador.

**Body**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Nome Completo",
  "role": "client",
  "is_active": true,
  "is_verified": false
}
```

**Permissões**: Apenas admin
**Validações**:
- Apenas super_admin pode criar outros super_admin
- Email e username devem ser únicos

#### PATCH `/api/v1/users/{user_id}`
Atualizar utilizador.

**Permissões**: Apenas admin
**Validações**:
- Apenas super_admin pode alterar outros utilizadores para super_admin
- Utilizador não pode alterar o seu próprio role para super_admin

#### DELETE `/api/v1/users/{user_id}`
Eliminar utilizador.

**Permissões**: Apenas super_admin
**Validações**:
- Não pode eliminar a si mesmo

#### GET `/api/v1/users/stats/overview`
Obter estatísticas de utilizadores.

**Retorna**:
```json
{
  "total_users": 10,
  "active_users": 8,
  "inactive_users": 2,
  "verified_users": 6,
  "unverified_users": 4,
  "users_by_role": {
    "super_admin": 1,
    "developer": 1,
    "client": 8
  }
}
```

**Permissões**: Apenas admin

#### GET `/api/v1/users/roles/info`
Obter informações sobre roles disponíveis.

**Retorna**:
```json
{
  "roles": [
    {
      "name": "super_admin",
      "description": "Administrador principal com acesso total ao sistema",
      "permissions": ["gerir_utilizadores", "acessar_painel_admin", ...]
    },
    ...
  ]
}
```

**Permissões**: Apenas admin

## 🔒 Validações de Segurança

### Criação de Utilizadores
- Apenas super_admin pode criar outros super_admin
- Email e username devem ser únicos
- Password deve ter pelo menos 8 caracteres

### Atualização de Utilizadores
- Apenas super_admin pode alterar outros utilizadores para super_admin
- Utilizador não pode alterar o seu próprio role para super_admin
- Validação de roles usando regex: `^(super_admin|developer|client)$`

### Eliminação de Utilizadores
- Apenas super_admin pode eliminar utilizadores
- Não pode eliminar a si mesmo

## 🧪 Exemplos de Uso

### 1. Login como Super Admin

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@alertapostas.pt",
    "password": "Alert@Postas2025!"
  }'
```

### 2. Criar Novo Cliente

```bash
curl -X POST "http://localhost:8000/api/v1/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "username": "cliente1",
    "password": "password123",
    "full_name": "Cliente Exemplo",
    "role": "client"
  }'
```

### 3. Listar Utilizadores

```bash
curl -X GET "http://localhost:8000/api/v1/users?role=client&is_active=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Obter Estatísticas

```bash
curl -X GET "http://localhost:8000/api/v1/users/stats/overview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛠️ Desenvolvimento

### Adicionar Novo Role

1. Atualizar o modelo `User` em `backend/app/models/user.py`
2. Atualizar validação regex em `backend/app/schemas/user.py`
3. Atualizar informações de roles em `backend/app/api/v1/endpoints/users.py`
4. Atualizar propriedades de verificação no modelo `User`

### Adicionar Nova Permissão

1. Adicionar propriedade no modelo `User`
2. Atualizar endpoint `/roles/info` com a nova permissão
3. Usar a propriedade nos endpoints que precisam da permissão

## 📝 Logs

Todos os endpoints geram logs estruturados incluindo:
- Ação realizada
- ID do utilizador que realizou a ação
- Detalhes da operação
- Timestamps

## 🔍 Troubleshooting

### Erro: "Apenas super_admin pode criar outros super_admin"
- Certifique-se de que está autenticado como super_admin
- Verifique se o JWT token é válido

### Erro: "Email já existe"
- O email deve ser único no sistema
- Verifique se já existe um utilizador com esse email

### Erro: "Username já existe"
- O username deve ser único no sistema
- Verifique se já existe um utilizador com esse username

### Erro: "Role inválido"
- Roles válidos: `super_admin`, `developer`, `client`
- Verifique a sintaxe exata (sem espaços, com underscore)
