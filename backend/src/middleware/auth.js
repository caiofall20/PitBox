import jwt from 'jsonwebtoken';
import { q } from '../db.js';
export async function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  let p; try { p = jwt.verify(t, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Sessão expirada. Entre de novo.' }); }
  const [u] = await q('SELECT id, name, handle, role, blocked, password_changed_at FROM users WHERE id=$1', [p.id]);
  if (!u || u.blocked) return res.status(401).json({ error: 'Conta indisponível' });
  // Trocar a senha encerra as sessões abertas antes da troca
  if (u.password_changed_at && p.iat < Math.floor(new Date(u.password_changed_at).getTime() / 1000)) return res.status(401).json({ error: 'Sua senha foi alterada. Entre de novo.' });
  delete u.password_changed_at;
  req.user = u; next();
}
// Visitante (sem token) segue com req.user = null; token presente mas inválido continua dando 401
export const optionalAuth = (req, res, next) => req.headers.authorization ? auth(req, res, next) : (req.user = null, next());
export const signedIn = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Crie uma conta ou entre para continuar' });
export const role = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Sem permissão' });
