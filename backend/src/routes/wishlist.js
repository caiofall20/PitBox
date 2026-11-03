import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
r.get('/', async (req, res) => res.json(await q('SELECT * FROM wishlist WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id])));
r.post('/', async (req, res) => {
  const d = req.body;
  if (!String(d.model || '').trim()) return res.status(400).json({ error: 'Informe o modelo' });
  if ((await q('SELECT 1 FROM wishlist WHERE user_id=$1 AND lower(brand)=lower($2) AND lower(model)=lower($3)', [req.user.id, d.brand || '', d.model])).length) return res.status(409).json({ error: 'Já está nos seus desejos' });
  const [w] = await q('INSERT INTO wishlist (user_id, brand, model, year, series, scale) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [req.user.id, d.brand || '', d.model.trim(), d.year || null, d.series || null, d.scale || null]); res.status(201).json(w);
});
r.delete('/:id', async (req, res) => { await q('DELETE FROM wishlist WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.sendStatus(204); });
export default r;
