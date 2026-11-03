import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
r.get('/', async (req, res) => res.json(await q("SELECT id, name, handle, email, role, blocked, created_at, (SELECT count(*) FROM items i WHERE i.user_id=u.id)::int AS items FROM users u WHERE ($1 = '' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%') ORDER BY created_at DESC LIMIT 200", [String(req.query.q || '')])));
r.patch('/:id', async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Você não pode alterar o próprio perfil por aqui' });
  const sets = [], p = [req.params.id];
  if (req.body.role) { if (!['colecionador', 'moderador', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Perfil inválido' }); p.push(req.body.role); sets.push('role=$' + p.length); }
  if (typeof req.body.blocked === 'boolean') { p.push(req.body.blocked); sets.push('blocked=$' + p.length); }
  if (!sets.length) return res.status(400).json({ error: 'Nada para alterar' });
  const [u] = await q('UPDATE users SET ' + sets.join(', ') + ' WHERE id=$1 RETURNING id, name, handle, email, role, blocked', p);
  u ? res.json(u) : res.sendStatus(404);
});
export default r;
