import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { auth, optionalAuth, role } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import items from './routes/items.js';
import folders from './routes/folders.js';
import wishlist from './routes/wishlist.js';
import catalog from './routes/catalog.js';
import social from './routes/social.js';
import moderation from './routes/moderation.js';
import users from './routes/users.js';
import uploads, { uploadDir } from './routes/uploads.js';
import { ensureStorageBucket, useObjectStorage } from './storage.js';
import { pool } from './db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) { console.error('Defina JWT_SECRET com pelo menos 24 caracteres'); process.exit(1); }
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean), credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (req, res) => { await pool.query('SELECT 1'); res.json({ ok: true }); });
if (!useObjectStorage) app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));
app.use('/api/auth', authRoutes);
app.use('/api/uploads', auth, uploads);
app.use('/api/items', auth, items);
app.use('/api/folders', auth, folders);
app.use('/api/wishlist', auth, wishlist);
app.use('/api/catalog', auth, catalog);
// Social aceita visitante só nas leituras públicas; o resto exige conta (ver routes/social.js)
app.use('/api/social', optionalAuth, social);
app.use('/api/moderation', auth, role('moderador', 'admin'), moderation);
app.use('/api/users', auth, role('admin'), users);
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.expose ? err.message : 'Erro interno. Tente de novo.' }); });
const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log('Pitbox API na porta', port);
  if (useObjectStorage) ensureStorageBucket().catch((e) => console.error('Storage:', e.message || e));
  else console.log('Storage: disco local (./uploads) — em produção no Free use SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
});
