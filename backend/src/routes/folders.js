import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
r.get('/', async (req, res) => res.json(await q('SELECT f.*, (SELECT count(*) FROM items i WHERE i.folder_id = f.id)::int AS count FROM folders f WHERE user_id=$1 ORDER BY name', [req.user.id])));
r.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 30);
  if (!name) return res.status(400).json({ error: 'Dê um nome à pasta' });
  if ((await q('SELECT 1 FROM folders WHERE user_id=$1 AND lower(name)=lower($2)', [req.user.id, name])).length) return res.status(409).json({ error: 'Já existe uma pasta com esse nome' });
  const [f] = await q('INSERT INTO folders (user_id, name) VALUES ($1,$2) RETURNING *', [req.user.id, name]); res.status(201).json({ ...f, count: 0 });
});
r.patch('/:id', async (req, res) => { const [f] = await q('UPDATE folders SET name=$3 WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id, String(req.body.name || '').trim().slice(0, 30)]); f ? res.json(f) : res.sendStatus(404); });
r.delete('/:id', async (req, res) => { await q('DELETE FROM folders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.sendStatus(204); });
export default r;
