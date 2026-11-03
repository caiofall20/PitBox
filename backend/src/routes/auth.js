import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { q, pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { appUrl, resetEmail, sendMail } from '../mail.js';
const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const sign = u => jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
async function newHandle(email) {
  const base = '@' + (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'colecionador');
  let handle = base, i = 1;
  while ((await q('SELECT 1 FROM users WHERE handle=$1', [handle])).length) handle = base + (++i);
  return handle;
}
const pub = u => ({ id: u.id, name: u.name, handle: u.handle, email: u.email, role: u.role, city: u.city, bio: u.bio, garage_visible: u.garage_visible, follow_policy: u.follow_policy });
r.post('/register', limiter, async (req, res) => {
  const name = String(req.body.name || '').trim(), email = String(req.body.email || '').trim().toLowerCase(), password = String(req.body.password || '');
  if (name.length < 2) return res.status(400).json({ error: 'Informe seu nome' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
  if (password.length < 8) return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });
  if ((await q('SELECT 1 FROM users WHERE email=$1', [email])).length) return res.status(409).json({ error: 'Este e-mail já tem conta' });
  const [u] = await q('INSERT INTO users (name, handle, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING *', [name, await newHandle(email), email, await bcrypt.hash(password, 12)]);
  res.status(201).json({ token: sign(u), user: pub(u) });
});
r.post('/login', limiter, async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE email = $1', [String(req.body.email || '').trim().toLowerCase()]);
  if (u && !u.password_hash) return res.status(401).json({ error: 'Esta conta entra pelo Google. Use “Continuar com Google” ou crie uma senha em “Esqueci a senha”.' });
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  if (u.blocked) return res.status(403).json({ error: 'Conta bloqueada. Fale com o suporte.' });
  res.json({ token: sign(u), user: pub(u) });
});
// Login com Google (Google Identity Services). Sem GOOGLE_CLIENT_ID o botão não aparece no app.
const googleId = () => process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client();
r.get('/config', (req, res) => res.json({ googleClientId: googleId() || null }));
r.post('/google', limiter, async (req, res) => {
  if (!googleId()) return res.status(503).json({ error: 'Login com Google não está configurado.' });
  let p;
  try { p = (await googleClient.verifyIdToken({ idToken: String(req.body.credential || ''), audience: googleId() })).getPayload(); }
  catch { return res.status(401).json({ error: 'Não foi possível confirmar sua conta Google. Tente de novo.' }); }
  const email = String(p.email || '').toLowerCase();
  if (!email || !p.email_verified) return res.status(400).json({ error: 'Sua conta Google não tem e-mail verificado.' });
  // 1) já vinculada  2) mesma pessoa que tinha conta com e-mail e senha (e-mail verificado pelo Google): vincula  3) conta nova
  let [u] = await q('SELECT * FROM users WHERE google_sub=$1', [p.sub]);
  if (!u) {
    [u] = await q('SELECT * FROM users WHERE email=$1', [email]);
    if (u && u.google_sub && u.google_sub !== p.sub) return res.status(409).json({ error: 'Este e-mail já está ligado a outra conta Google.' });
    if (u) [u] = await q('UPDATE users SET google_sub=$2 WHERE id=$1 RETURNING *', [u.id, p.sub]);
    else {
      const name = String(p.name || p.given_name || email.split('@')[0]).trim().slice(0, 80);
      [u] = await q('INSERT INTO users (name, handle, email, google_sub) VALUES ($1,$2,$3,$4) RETURNING *', [name, await newHandle(email), email, p.sub]);
      return res.status(201).json({ token: sign(u), user: pub(u), created: true });
    }
  }
  if (u.blocked) return res.status(403).json({ error: 'Conta bloqueada. Fale com o suporte.' });
  res.json({ token: sign(u), user: pub(u) });
});

// Recuperação de senha. A resposta é sempre a mesma, exista ou não a conta, para não revelar e-mails cadastrados.
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitos pedidos. Tente de novo em alguns minutos.' } });
const hashToken = t => crypto.createHash('sha256').update(String(t || '')).digest('hex');
const findReset = async t => (await q('SELECT r.id, r.user_id, u.email FROM password_resets r JOIN users u ON u.id = r.user_id WHERE r.token_hash=$1 AND r.used_at IS NULL AND r.expires_at > now() AND NOT u.blocked', [hashToken(t)]))[0];
r.post('/forgot', resetLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  res.json({ ok: true });
  try {
    const [u] = await q('SELECT id, name, email, blocked FROM users WHERE email=$1', [email]);
    if (!u || u.blocked) return;
    // Um link novo a cada 2 minutos por conta, no máximo
    if ((await q("SELECT 1 FROM password_resets WHERE user_id=$1 AND created_at > now() - interval '2 minutes'", [u.id])).length) return;
    const token = crypto.randomBytes(32).toString('base64url');
    await q("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2, now() + interval '1 hour')", [u.id, hashToken(token)]);
    await sendMail({ to: u.email, ...resetEmail(u.name, appUrl() + '/redefinir-senha?token=' + token) });
  } catch (e) { console.error('Falha no pedido de nova senha:', e.message); }
});
r.post('/reset/check', resetLimiter, async (req, res) => {
  const row = await findReset(req.body.token);
  if (!row) return res.status(400).json({ error: 'Este link é inválido ou expirou.' });
  const [name, domain] = row.email.split('@');
  res.json({ email: name.slice(0, 2) + '•••@' + domain });
});
r.post('/reset', resetLimiter, async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });
  const row = await findReset(req.body.token);
  if (!row) return res.status(400).json({ error: 'Este link é inválido ou expirou. Peça um novo.' });
  const c = await pool.connect();
  let u;
  try {
    await c.query('BEGIN');
    // Marca o link como usado primeiro; se outra requisição já usou, não troca a senha duas vezes
    const used = await c.query('UPDATE password_resets SET used_at=now() WHERE id=$1 AND used_at IS NULL', [row.id]);
    if (!used.rowCount) { await c.query('ROLLBACK'); return res.status(400).json({ error: 'Este link já foi usado. Peça um novo.' }); }
    await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [row.user_id]);
    u = (await c.query('UPDATE users SET password_hash=$2, password_changed_at=now() WHERE id=$1 RETURNING *', [row.user_id, await bcrypt.hash(password, 12)])).rows[0];
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  res.json({ token: sign(u), user: pub(u) });
});
r.get('/me', auth, async (req, res) => { const [u] = await q('SELECT * FROM users WHERE id=$1', [req.user.id]); res.json(pub(u)); });
r.patch('/me', auth, async (req, res) => {
  const allowed = ['name', 'city', 'bio', 'garage_visible', 'follow_policy'];
  const keys = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'Nada para alterar' });
  const [u] = await q('UPDATE users SET ' + keys.map((k, i) => k + '=$' + (i + 2)).join(', ') + ' WHERE id=$1 RETURNING *', [req.user.id, ...keys.map(k => req.body[k])]);
  res.json(pub(u));
});
export default r;
