# Configuração do Domínio Personalizado - Alert@Postas

## 🌐 Configurar alertapostas.pt

### Passo 1: Configurar no Cloudflare Dashboard

1. **Acesse o Cloudflare Dashboard:**
   - URL: https://dash.cloudflare.com
   - Faça login na sua conta

2. **Adicionar Domínio:**
   - Clique em "Add a Site"
   - Digite: `alertapostas.pt`
   - Escolha o plano (Free é suficiente)

3. **Configurar DNS:**
   - Adicione um registro CNAME:
     ```
     Tipo: CNAME
     Nome: @
     Destino: alertapostas.ecarvalho140.workers.dev
     Proxy: Ativado (nuvem laranja)
     ```

4. **Configurar Worker Route:**
   - Vá para Workers & Pages
   - Clique em "alertapostas"
   - Vá para a aba "Settings" → "Triggers"
   - Clique em "Add Custom Domain"
   - Digite: `alertapostas.pt`
   - Clique em "Add Custom Domain"

### Passo 2: Configurar no Registrar do Domínio

1. **Configurar Nameservers:**
   - Acesse o painel do seu registrar (onde comprou o domínio)
   - Altere os nameservers para:
     ```
     alex.ns.cloudflare.com
     claire.ns.cloudflare.com
     ```

2. **Aguardar Propagação:**
   - Pode levar até 24 horas para propagar
   - Use ferramentas como https://dnschecker.org para verificar

### Passo 3: Verificar Configuração

```bash
# Testar domínio
curl https://alertapostas.pt/health

# Verificar DNS
nslookup alertapostas.pt
```

## ✅ URLs Finais

- **Domínio Principal:** https://alertapostas.pt
- **Worker Original:** https://alertapostas.ecarvalho140.workers.dev
- **Health Check:** https://alertapostas.pt/health
- **API:** https://alertapostas.pt/api/v1/*
- **Site Data:** https://alertapostas.pt/site/*

## 🔧 Configurações Automáticas

O worker já está configurado para aceitar requisições de:
- `alertapostas.pt`
- `www.alertapostas.pt`
- `alertapostas.ecarvalho140.workers.dev`

## 📋 Checklist

- [ ] Domínio adicionado no Cloudflare
- [ ] DNS configurado (CNAME)
- [ ] Worker Route adicionada
- [ ] Nameservers atualizados no registrar
- [ ] Propagação DNS verificada
- [ ] Teste de conectividade realizado
