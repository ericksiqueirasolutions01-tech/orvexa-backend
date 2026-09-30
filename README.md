# Orvexa Backend — checkout InfinitePay + entrega automática (Vercel)

Backend do site de vendas da Orvexa / Prime Digital. Gera links de pagamento na
**InfinitePay**, confirma via webhook e entrega o produto automaticamente por e-mail.

**Produtos:** Google Flow + Google AI Pro 18 meses (R$ 49,99) · MUSE IA (R$ 59,99) ·
Super Duolingo 1 ano (R$ 37,00)

## Como funciona

1. O site chama `POST /api/checkout` com `{ email, produto }` → recebe `{ checkout_url }`
2. O cliente paga (Pix ou cartão) no checkout da InfinitePay
3. A InfinitePay chama `POST /api/webhook` → o backend entrega:
   - **MUSE IA:** retira 1 conta do estoque (Vercel KV, atômico — nunca vende a mesma 2x) e envia login+senha por e-mail
   - **Flow + AI Pro / Super Duolingo:** envia e-mail com as orientações de ativação por link + WhatsApp
4. O cliente clica em "Continuar" e cai em `/api/entrega` — a aba **"Seu produto está aqui"**

## Subindo (Antigravity → GitHub → Vercel)

### 1. GitHub
```bash
cd orvexa-backend
git init
git add .
git commit -m "backend inicial"
# crie um repositório vazio no GitHub e rode:
git remote add origin https://github.com/SEU-USUARIO/orvexa-backend.git
git branch -M main
git push -u origin main
```

### 2. Vercel
1. [vercel.com](https://vercel.com) → **Add New… → Project** → importe o repositório `orvexa-backend`
2. Não precisa mudar nada no build → **Deploy**

### 3. Banco de dados (Vercel KV) — obrigatório
O disco da Vercel é temporário, então estoque e pedidos ficam no KV:
1. No projeto da Vercel: aba **Storage → Create Database → KV**
2. Conecte ao projeto `orvexa-backend` (a Vercel preenche `KV_REST_API_URL` e `KV_REST_API_TOKEN` sozinha)

### 4. Variáveis de ambiente
Em **Settings → Environment Variables**, adicione (veja `.env.example`):

| Variável | Valor |
|---|---|
| `INFINITEPAY_HANDLE` | `erick-siqueira-bg2` (sua InfiniteTag, sem o $) |
| `PUBLIC_URL` | URL do backend (ex: `https://orvexa-backend.vercel.app`) |
| `SITE_URL` | URL do site de vendas |
| `RESEND_API_KEY` | Chave do Resend (resend.com → API Keys) |
| `FROM_EMAIL` | `Orvexa Digital <acesso@seudominio.com>` (domínio verificado no Resend) |
| `ADMIN_EMAIL` | Seu e-mail (alertas de estoque) |
| `ADMIN_TOKEN` | Uma senha forte (protege o painel de estoque) |
| `WHATSAPP_URL` | `https://wa.me/5521992936790` |

Depois de salvar: **Deployments → Redeploy** (ou faça um novo push).

### 5. Testar
Abra `https://SEU-BACKEND.vercel.app/api/health` — deve mostrar `"ok": true`.

### 6. Cadastrar estoque da MUSE IA
Abra `https://SEU-BACKEND.vercel.app/admin.html`, digite o `ADMIN_TOKEN` e cadastre as
contas (uma por linha, formato `login;senha`). Sem estoque, vendas da MUSE IA geram
alerta por e-mail em vez de entrega automática.

### 7. Ligar o site
No site de vendas, em `assets/config.js`, troque `BACKEND_URL` pela URL do backend.
Pronto: os botões "Quero meu acesso" passam a gerar o pagamento na InfinitePay.

## Estrutura

```
api/
  checkout.js   → gera o link de pagamento (InfinitePay)
  webhook.js    → confirma o pagamento e dispara a entrega
  entrega.js    → página "Seu produto está aqui" (pós-pagamento)
  health.js     → status do backend
  admin.js      → API do painel de estoque (protegida por token)
lib/
  products.js   → catálogo e constantes
  store.js      → persistência no Vercel KV
  email.js      → Resend + templates de e-mail
public/
  admin.html    → painel visual de estoque
```
