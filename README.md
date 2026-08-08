# Casagrande SaaS — monorepo (Portal + Sistema de Confeitaria + Sistema de Joias)

Unifica dois sistemas sob **Login → Hub → sistema isolado**, sem fundir lógica de negócio.

## Estrutura

```
apps/
  portal/     # Login único + Hub (porta 3000)
  dona-lu/    # Sistema de Confeitaria (basePath /dona-lu, porta 3001)
  allativa/   # Sistema de Joias (basePath /allativa, porta 3002)
packages/
  auth/       # Auth.js compartilhado (JWT + cookie SSO)
```

## Fluxo

1. `http://localhost:3000/login` — autenticação central
2. `http://localhost:3000/hub` — escolha do sistema (2 cards)
3. Card A → `/dona-lu/painel` | Card B → `/allativa/painel`

## Pré-requisitos

- Node.js 18.18+ (recomendado 20 LTS)
- PostgreSQL para cada sistema (DBs separados)

## Setup

```bash
npm install
```

Configure env em cada app (mesmo `AUTH_SECRET` e mesmas credenciais de admin):

- `apps/portal/.env.local` — copie de `apps/portal/.env.example`
- `apps/dona-lu/.env` — copie de `apps/dona-lu/.env.example`
- `apps/allativa/.env` — copie de `apps/allativa/.env.example`

Nos sistemas filhos, defina também:

```env
NEXT_PUBLIC_PORTAL_URL="http://localhost:3000"
AUTH_SECRET="<igual ao portal>"
ADMIN_EMAIL="<igual ao portal>"
ADMIN_PASSWORD="<igual ao portal>"
```

## Desenvolvimento

Sobe os três apps de uma vez:

```bash
npm run dev
```

- Portal: http://localhost:3000
- Sistema de Confeitaria (direto): http://localhost:3001/dona-lu
- Sistema de Joias (direto): http://localhost:3002/allativa

O portal faz rewrite de `/dona-lu/*` e `/allativa/*` para os apps filhos.

## Deploy (Vercel) — um único site

Fluxo do usuário (mesmo domínio):

1. `/login` → autentica  
2. `/hub` → escolhe o sistema  
3. `/dona-lu/painel` ou `/allativa/painel` → painel escolhido  

**Root Directory recomendado:** `apps/portal`

Variáveis necessárias no portal:

| Variável | Uso |
|----------|-----|
| `AUTH_SECRET` | Sessão JWT |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Login do Hub |

`NEXT_PUBLIC_PORTAL_URL` é **opcional** na Vercel (usa `VERCEL_URL` automaticamente).

Não é necessário `DONA_LU_ORIGIN` / `ALLATIVA_ORIGIN` em produção (isso era só proxy entre deploys separados / dev local).

Os apps `dona-lu` e `allativa` ainda são pacotes do monorepo; em dev local o portal pode proxyar para as portas 3001/3002.