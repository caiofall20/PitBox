# Subir em produção

## Opção A — Um servidor (VPS) com Docker  ·  recomendado

Funciona em qualquer VPS Linux com 1 GB de RAM (ex.: Hetzner, DigitalOcean, Contabo, Oracle Cloud Free Tier).

1. **Domínio:** crie um registro DNS **A** apontando `pitbox.seudominio.com.br` para o IP do servidor.
2. **Servidor:** instale Docker e o plugin Compose.
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Código:** envie a pasta `pitbox/` para o servidor (git clone ou scp).
4. **Configuração:**
   ```bash
   cd pitbox
   cp .env.example .env
   nano .env      # DOMAIN, senhas e JWT_SECRET (gere com: openssl rand -base64 48)
   ```
5. **Subir:**
   ```bash
   docker compose up -d --build
   docker compose logs -f backend   # deve mostrar "migração aplicada", "admin criado" e "Pitbox API na porta 3333"
   ```
6. Abra `https://pitbox.seudominio.com.br`. O Caddy emite o certificado HTTPS sozinho na primeira visita (portas 80 e 443 precisam estar abertas no firewall).

### Atualizar
```bash
git pull && docker compose up -d --build
```
As migrations novas (`backend/db/migrations/00X_*.sql`) rodam automaticamente na inicialização.

### Backup do banco e das fotos
```bash
docker compose exec -T db pg_dump -U pitbox pitbox | gzip > backup-$(date +%F).sql.gz
docker run --rm -v pitbox_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```
Agende com `cron` diariamente e copie para fora do servidor.

## Opção B — Stack gratuita (Supabase + Render + Vercel)

Ideal para testar sem VPS. Stack recomendada: **Supabase (Postgres + Storage) + Render (API) + Vercel (front)**.

Limites reais do Free (mesmo com Storage):
- Render: API “dorme” após ~15 min ociosos (~1 min para acordar).
- Supabase: pausa o projeto após 1 semana sem uso; 500 MB de banco + **1 GB de fotos** no Storage.

### O que eram as “fotos apagadas”?

Só as fotos que o usuário **envia** (garagem, cadastro, catálogo). Se ficassem no disco da Render Free, sumiam em todo restart/redeploy/spin-down. **Com Supabase Storage isso não acontece mais** — o código grava no bucket quando `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` estão definidos.

### 1. Supabase (Free) — banco + fotos

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Database → Extensions** → ative **pg_trgm** (ou deixe a migration criar).
3. **Project Settings → Database → Connection string → URI**.
   - Use conexão **direta** (porta `5432`) ou **Session** pooler.
   - Evite Transaction pooler com este backend.
4. **Project Settings → API**: copie **Project URL** e a chave **`service_role`** (secret — só no backend).
5. Opcional: em **Storage**, crie o bucket público `pitbox-photos`. Se não criar, a API cria sozinha na primeira subida.

### 2. API — Render (Free)

Arquivo pronto: `render.yaml` na raiz do `pitbox/`.

1. Suba o código para um repositório Git (GitHub) com a pasta `pitbox` na raiz do repo **ou** aponte o Root Directory.
2. Em [render.com](https://render.com): **New → Blueprint** → selecione o repo.
3. Preencha as env vars:
   - `DATABASE_URL` = URI do Postgres  
   - `SUPABASE_URL` = Project URL  
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role  
   - `CORS_ORIGIN` / `APP_URL` = URL da Vercel (pode preencher depois)  
   - `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`  
   - `JWT_SECRET` é gerado pelo Blueprint; `DATABASE_SSL=true` já vem no YAML  
4. Após o deploy, anote a URL (ex. `https://pitbox-api.onrender.com`). O `npm start` roda migrate + seed. No log deve aparecer `Storage: bucket pitbox-photos (Supabase)`.

### 3. Front — Vercel (Free)

Arquivo pronto: `frontend/vercel.json` (SPA rewrite).

1. Em [vercel.com](https://vercel.com): importe o repo.
2. **Root Directory:** `frontend` (ou `pitbox/frontend` se o monorepo for o pai).
3. Build: `npm run build` · Output: `dist`.
4. `VITE_API_URL` = `https://pitbox-api.onrender.com` (sem barra no final).
5. Deploy → volte na Render e ajuste `CORS_ORIGIN` + `APP_URL` → **Manual Deploy** na API.

## Opção C — Outros serviços gerenciados

- **Banco:** Neon ou Supabase (Postgres com `pg_trgm`). `DATABASE_URL` + `DATABASE_SSL=true`.
- **API:** Render, Railway ou Fly.io apontando para `backend/` (Dockerfile incluso). Variáveis: as mesmas do `backend/.env.example`.
  - Fotos: monte um volume persistente (Railway/Fly pago) ou storage S3 compatível.
- **Front:** Netlify, Vercel ou Cloudflare Pages com raiz `frontend/`, build `npm run build`, saída `dist`.
  - `VITE_API_URL=https://sua-api.onrender.com` e, na API, `CORS_ORIGIN=https://seu-front.vercel.app`.
  - Netlify: `frontend/public/_redirects` já incluso. Vercel: `frontend/vercel.json` já incluso.

## Checklist antes de abrir para o público
- [ ] `JWT_SECRET` longo e único; senhas fortes no `.env` (nunca no git).
- [ ] Login com Google (opcional): em console.cloud.google.com > APIs e serviços > Credenciais, crie um "ID do cliente OAuth" do tipo "Aplicativo da Web", adicione `https://SEU_DOMINIO` em "Origens JavaScript autorizadas" e coloque o ID em `GOOGLE_CLIENT_ID`. É gratuito.
- [ ] SMTP configurado (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) para o e-mail de "Esqueci a senha". Sem ele o link só aparece no log da API. Fora do Docker, defina também `APP_URL` com o endereço do front.
- [ ] Trocar a senha do admin depois do primeiro login.
- [ ] HTTPS ativo (obrigatório para a câmera no celular).
- [ ] Backup diário do banco e das fotos.
- [ ] Revisar termos de uso e política de privacidade (dados pessoais: LGPD).
- [ ] Confirmar os termos de uso da Hot Wheels Wiki para exibir imagens com crédito.

## Limites conhecidos
- O scan baixa os leitores (Tesseract e PaddleOCR) de CDNs públicas na primeira vez; o celular precisa de internet nesse momento.
- Reconhecimento pela forma do carro (DINOv2 + pgvector) é a fase 2; o esquema já prevê `catalog_photos` para isso.
