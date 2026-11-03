# Pitbox

Gerenciador de coleção de miniaturas (Hot Wheels, Matchbox, Jada, Tomica…) com scan por foto, garagem com pastas, desejos, comunidade e moderação.

```
pitbox/
├─ api/         Entrada serverless da Vercel (Express)
├─ backend/     API Node + Express + PostgreSQL (migrations, seed, uploads, JWT)
├─ frontend/    App React + Vite
├─ docs/        Arquitetura e telas
├─ vercel.json  Deploy front+API na Vercel
├─ docker-compose.yml / docker-compose.dev.yml / Caddyfile
└─ .env.example
```

## Desenvolvimento local

```bash
docker compose -f docker-compose.dev.yml up -d          # Postgres em localhost:5432

cd backend
cp .env.example .env                                    # ajuste DATABASE_URL=postgres://pitbox:pitbox@localhost:5432/pitbox
npm install
npm run migrate && npm run seed                         # cria tabelas, admin e catálogo inicial
npm run dev                                             # http://localhost:3333

cd ../frontend
npm install
npm run dev                                             # http://localhost:5173 (proxy /api → 3333)
```

Entre com o `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env` do backend.

## Produção

- **Grátis (Supabase + Vercel, front+API):** [DEPLOY.md](DEPLOY.md) (opção B) — `vercel.json` + `api/`.
- **VPS com Docker:** [DEPLOY.md](DEPLOY.md) (opção A).
