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

## Opção B — Stack gratuita (Supabase + Vercel) · recomendada sem VPS

Tudo num lugar: **front + API na Vercel**, **banco + fotos no Supabase**.  
Arquivos: `vercel.json`, `api/index.js` (Express serverless).

Limites do Free:
- Vercel: cold start na 1ª chamada da API; timeout das functions.
- Supabase: pausa após ~1 semana sem uso; 500 MB de banco + 1 GB de Storage.
- Fotos ficam no Supabase Storage (não no disco da Vercel).

### 1. Supabase (já pode estar pronto)

1. Projeto em [supabase.com](https://supabase.com).
2. Extensions → `pg_trgm`.
3. **Connect → Session pooler** (IPv4) → URI em `DATABASE_URL` + `DATABASE_SSL=true`.  
   Evite Direct `db.*` se sua rede não tem IPv6; evite Transaction pooler.
4. **Settings → API**: `SUPABASE_URL` + secret (`SUPABASE_SECRET_KEY` ou `service_role`).
5. Rode **uma vez** no seu PC (contra o Supabase):
   ```bash
   cd backend && npm run migrate && npm run seed
   ```
   (Na Vercel a API **não** roda migrate a cada request.)

### 2. Vercel — front + API

1. Push do repo (raiz = pasta `pitbox/` com `vercel.json` e `api/`).
2. Em [vercel.com](https://vercel.com): **Add New Project** → importe o GitHub.
3. **Root Directory:** deixe a raiz do `pitbox` (não escolha só `frontend/`).
4. Environment Variables (Production):

| Nome | Valor |
|------|--------|
| `DATABASE_URL` | URI Session pooler do Supabase |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | frase longa (≥24 chars) |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | secret do Supabase |
| `SUPABASE_STORAGE_BUCKET` | `pitbox-photos` |
| `APP_URL` | `https://seu-projeto.vercel.app` (depois do 1º deploy, ajuste) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | só se for re-seed local; produção já tem admin do seed |
| `CORS_ORIGIN` | opcional no mesmo domínio; local ainda usa `http://localhost:5173` |

Não defina `VITE_API_URL` (front e API no mesmo domínio).

5. Deploy. Teste `https://seu-projeto.vercel.app/api/health` → `{"ok":true}`.
6. Atualize `APP_URL` (e Google OAuth, se usar) com a URL final.

### Opção B2 — Render + Vercel (legado)

Se preferir API sempre quente: use `render.yaml` + front na Vercel com `VITE_API_URL` apontando para a Render. Ver histórico do repo / comentários no `render.yaml`.

## Opção C — Outros serviços gerenciados

- **Banco:** Neon ou Supabase. `DATABASE_URL` + `DATABASE_SSL=true`.
- **API:** Render, Railway ou Fly.io (`backend/`).
- **Front:** Netlify/Vercel/Pages com `VITE_API_URL` da API.

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
