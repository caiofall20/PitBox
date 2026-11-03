# Pitbox

Gerenciador de coleção de miniaturas (Hot Wheels, Matchbox, Jada, Tomica…) com scan por foto, garagem com pastas, desejos, comunidade e moderação.

```
pitbox/
├─ backend/     API Node + Express + PostgreSQL (migrations, seed, uploads, JWT, perfis)
├─ frontend/    App React + Vite (todas as telas, scan no aparelho, editor de foto)
├─ docs/        Arquitetura, mapa de telas e o protótipo original (design-reference/)
├─ docker-compose.yml       Produção: banco + API + front + HTTPS (Caddy)
├─ docker-compose.dev.yml   Desenvolvimento: só o banco
├─ Caddyfile
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

- **VPS com Docker:** [DEPLOY.md](DEPLOY.md) (opção A).
- **Grátis (Supabase + Render + Vercel):** [DEPLOY.md](DEPLOY.md) (opção B) — arquivos `render.yaml` e `frontend/vercel.json` já inclusos.
