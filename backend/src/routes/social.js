import { Router } from 'express';
import { q } from '../db.js';
import { signedIn } from '../middleware/auth.js';
const r = Router();
// Visitante vira o id 0 (nunca existe): não segue ninguém e só enxerga garagens públicas
const me = req => req.user ? req.user.id : 0;
// Visitante só encontra quem deixou a garagem aberta a qualquer pessoa
const PUBLIC_ONLY = req => req.user ? '' : " AND u.garage_visible AND u.follow_policy = 'publico'";
async function access(viewer, ownerId) {
  if (Number(viewer) === Number(ownerId)) return { visible: true, follow: 'eu' };
  const [o] = await q('SELECT garage_visible, follow_policy FROM users WHERE id=$1', [ownerId]);
  const [f] = await q('SELECT status FROM follows WHERE follower_id=$1 AND followed_id=$2', [viewer, ownerId]);
  const follow = f ? f.status : null;
  const visible = !!o && o.garage_visible && (o.follow_policy === 'publico' || follow === 'seguindo');
  return { visible, follow };
}
const COUNTS = (alias, type) => `(SELECT count(*) FROM likes l WHERE l.target='${type}' AND l.target_id=${alias}.id)::int AS likes,
  (SELECT count(*) FROM comments c WHERE c.target='${type}' AND c.target_id=${alias}.id)::int AS comments,
  EXISTS (SELECT 1 FROM likes l WHERE l.target='${type}' AND l.target_id=${alias}.id AND l.user_id=$1) AS liked`;
const VISIBLE = "u.garage_visible AND (u.follow_policy = 'publico' OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.followed_id=u.id AND f.status='seguindo'))";

r.get('/search', async (req, res) => {
  const s = '%' + String(req.query.q || '').trim() + '%';
  const people = await q('SELECT u.id, u.name, u.handle, u.city, u.follow_policy, (SELECT status FROM follows f WHERE f.follower_id=$1 AND f.followed_id=u.id) AS follow FROM users u WHERE u.id <> $1 AND NOT u.blocked' + PUBLIC_ONLY(req) + ' AND (u.name ILIKE $2 OR u.handle ILIKE $2) LIMIT 20', [me(req), s]);
  const cars = await q(`SELECT i.id, i.brand, i.model, i.year, i.series, i.photo_url, u.name AS owner_name, u.handle, ${COUNTS('i', 'item')} FROM items i JOIN users u ON u.id = i.user_id
    WHERE u.id <> $1 AND ${VISIBLE} AND (i.brand || ' ' || i.model || ' ' || coalesce(i.series,'')) ILIKE $2 ORDER BY i.created_at DESC LIMIT 40`, [me(req), s]);
  res.json({ people, cars });
});
r.get('/discover', async (req, res) => res.json(await q(`SELECT u.id, u.name, u.handle, u.city, u.bio, u.follow_policy,
  (SELECT count(*) FROM items i WHERE i.user_id=u.id)::int AS items, (SELECT count(*) FROM follows f WHERE f.followed_id=u.id AND f.status='seguindo')::int AS followers,
  (SELECT status FROM follows f WHERE f.follower_id=$1 AND f.followed_id=u.id) AS follow
  FROM users u WHERE u.id <> $1 AND NOT u.blocked AND u.garage_visible${PUBLIC_ONLY(req)} ORDER BY followers DESC LIMIT 30`, [me(req)])));
r.get('/users/:handle', async (req, res) => {
  const [u] = await q(`SELECT u.id, u.name, u.handle, u.city, u.bio, u.follow_policy, u.garage_visible,
    (SELECT count(*) FROM items i WHERE i.user_id=u.id)::int AS items, (SELECT count(*) FROM follows f WHERE f.followed_id=u.id AND f.status='seguindo')::int AS followers,
    (SELECT count(*) FROM follows f WHERE f.follower_id=u.id AND f.status='seguindo')::int AS following, ${COUNTS('u', 'garagem')}
    FROM users u WHERE handle=$2 AND NOT blocked${PUBLIC_ONLY(req)}`, [me(req), req.params.handle]);
  if (!u) return res.sendStatus(404);
  const a = await access(me(req), u.id);
  const items = a.visible ? await q(`SELECT i.id, i.brand, i.model, i.year, i.series, i.scale, i.photo_url, i.qty, ${COUNTS('i', 'item')} FROM items i WHERE user_id=$2 ORDER BY created_at DESC`, [me(req), u.id]) : [];
  // item_count = total de miniaturas; items = a lista (só quando a garagem é visível)
  res.json({ ...u, ...a, item_count: u.items, items });
});
r.get('/items/:id', async (req, res) => {
  const [it] = await q(`SELECT i.id, i.user_id, i.brand, i.model, i.year, i.series, i.scale, i.photo_url, i.created_at, u.name AS owner_name, u.handle, ${COUNTS('i', 'item')} FROM items i JOIN users u ON u.id=i.user_id WHERE i.id=$2`, [me(req), req.params.id]);
  if (!it || !(await access(me(req), it.user_id)).visible) return res.sendStatus(404);
  res.json(it);
});
async function targetOwner(type, id) { if (type === 'garagem') return id; const [i] = await q('SELECT user_id FROM items WHERE id=$1', [id]); return i ? i.user_id : null; }
async function canInteract(req, type, id) { if (!['item', 'garagem'].includes(type)) return false; const owner = await targetOwner(type, id); return owner != null && (await access(me(req), owner)).visible; }
r.get('/comments/:type/:id', async (req, res) => { if (!(await canInteract(req, req.params.type, req.params.id))) return res.sendStatus(404); res.json(await q('SELECT c.id, c.text, c.created_at, c.user_id, u.name AS author, (c.user_id=$3) AS mine FROM comments c JOIN users u ON u.id=c.user_id WHERE target=$1 AND target_id=$2 ORDER BY created_at', [req.params.type, req.params.id, me(req)])); });

// Daqui para baixo só com conta: seguir, pedidos, feed, curtir e comentar
r.use(signedIn);
r.get('/feed', async (req, res) => res.json(await q(`SELECT i.id, i.brand, i.model, i.year, i.series, i.scale, i.photo_url, i.created_at, u.name AS owner_name, u.handle, ${COUNTS('i', 'item')}
  FROM follows f JOIN users u ON u.id=f.followed_id JOIN items i ON i.user_id=u.id
  WHERE f.follower_id=$1 AND f.status='seguindo' AND u.garage_visible ORDER BY i.created_at DESC LIMIT 50`, [req.user.id])));
r.post('/follow/:id', async (req, res) => {
  const [o] = await q('SELECT follow_policy FROM users WHERE id=$1 AND NOT blocked', [req.params.id]);
  if (!o || o.follow_policy === 'ninguem' || Number(req.params.id) === req.user.id) return res.status(403).json({ error: 'Este colecionador não aceita seguidores' });
  const status = o.follow_policy === 'publico' ? 'seguindo' : 'pendente';
  await q('INSERT INTO follows (follower_id, followed_id, status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.user.id, req.params.id, status]);
  res.json({ status });
});
r.delete('/follow/:id', async (req, res) => { await q('DELETE FROM follows WHERE follower_id=$1 AND followed_id=$2', [req.user.id, req.params.id]); res.sendStatus(204); });
r.get('/requests', async (req, res) => res.json(await q("SELECT u.id, u.name, u.handle FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.followed_id=$1 AND f.status='pendente' ORDER BY f.created_at", [req.user.id])));
r.get('/followers/count', async (req, res) => { const [{ n }] = await q("SELECT count(*)::int AS n FROM follows WHERE followed_id=$1 AND status='seguindo'", [req.user.id]); res.json({ count: n }); });
r.post('/requests/:id', async (req, res) => {
  if (req.body.accept) await q("UPDATE follows SET status='seguindo' WHERE follower_id=$1 AND followed_id=$2", [req.params.id, req.user.id]);
  else await q('DELETE FROM follows WHERE follower_id=$1 AND followed_id=$2', [req.params.id, req.user.id]);
  res.sendStatus(204);
});
r.post('/likes', async (req, res) => { if (!(await canInteract(req, req.body.type, req.body.id))) return res.sendStatus(404); await q('INSERT INTO likes (user_id, target, target_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.user.id, req.body.type, req.body.id]); res.sendStatus(204); });
r.delete('/likes/:type/:id', async (req, res) => { await q('DELETE FROM likes WHERE user_id=$1 AND target=$2 AND target_id=$3', [req.user.id, req.params.type, req.params.id]); res.sendStatus(204); });
r.post('/comments', async (req, res) => {
  const t = String(req.body.text || '').trim(); if (!t) return res.status(400).json({ error: 'Escreva algo antes de publicar' });
  if (!(await canInteract(req, req.body.type, req.body.id))) return res.sendStatus(404);
  const [c] = await q('INSERT INTO comments (user_id, target, target_id, text) VALUES ($1,$2,$3,$4) RETURNING id, text, created_at', [req.user.id, req.body.type, req.body.id, t.slice(0, 280)]);
  res.status(201).json({ ...c, author: req.user.name, mine: true });
});
r.delete('/comments/:id', async (req, res) => { await q("DELETE FROM comments WHERE id=$1 AND (user_id=$2 OR $3 IN ('moderador','admin'))", [req.params.id, req.user.id, req.user.role]); res.sendStatus(204); });
export default r;
