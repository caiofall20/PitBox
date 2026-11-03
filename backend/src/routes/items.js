import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
r.get('/', async (req, res) => res.json(await q(`SELECT i.*, (SELECT url FROM catalog_photos p WHERE p.model_id=i.model_id AND p.status='aprovado' LIMIT 1) AS ref_photo
  FROM items i WHERE user_id=$1 ORDER BY created_at DESC`, [req.user.id])));
r.get('/:id', async (req, res) => { const [it] = await q('SELECT * FROM items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); it ? res.json(it) : res.sendStatus(404); });
// Mesma variante soma +1; parecida entra como nova
r.post('/', async (req, res) => {
  const d = req.body, u = req.user.id;
  if (!String(d.model || '').trim()) return res.status(400).json({ error: 'Informe o modelo' });
  const price = d.price === '' || d.price == null ? null : Number(String(d.price).replace(',', '.'));
  const [same] = d.forceNew ? [] : await q(`SELECT * FROM items WHERE user_id=$1 AND ((toy_code IS NOT NULL AND toy_code=$2) OR (toy_code IS NULL AND lower(brand)=lower($3) AND lower(model)=lower($4) AND coalesce(lower(series),'')=coalesce(lower($5),'') AND coalesce(scale,'')=coalesce($6,''))) LIMIT 1`, [u, d.toy_code || null, d.brand || '', d.model, d.series || null, d.scale || null]);
  if (same) {
    const [it] = await q('UPDATE items SET qty = qty + 1, avg_price = CASE WHEN $2::numeric IS NULL THEN avg_price ELSE round(((coalesce(avg_price,$2) * qty) + $2) / (qty + 1), 2) END, photo_url = coalesce(photo_url, $3) WHERE id = $1 RETURNING *', [same.id, price, d.photo_url || null]);
    return res.json({ grouped: true, item: it });
  }
  const [{ n }] = await q('SELECT coalesce(max(num),0)+1 AS n FROM items WHERE user_id=$1', [u]);
  const [it] = await q('INSERT INTO items (user_id, num, brand, model, year, series, scale, toy_code, avg_price, photo_url, folder_id, loose, model_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
    [u, n, d.brand || '', d.model.trim(), d.year || null, d.series || null, d.scale || null, d.toy_code || null, price, d.photo_url || null, d.folder_id || null, !!d.loose, d.model_id || null]);
  await q('DELETE FROM wishlist WHERE user_id=$1 AND lower(brand)=lower($2) AND lower(model)=lower($3)', [u, it.brand, it.model]);
  res.status(201).json({ grouped: false, item: it });
});
r.patch('/:id', async (req, res) => {
  const allowed = ['brand', 'model', 'year', 'series', 'scale', 'avg_price', 'photo_url', 'folder_id', 'qty', 'toy_code'];
  const keys = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!keys.length) return res.status(400).json({ error: 'Nada para alterar' });
  if (keys.includes('qty') && !(Number(req.body.qty) >= 1)) return res.status(400).json({ error: 'Quantidade mínima é 1' });
  const [it] = await q('UPDATE items SET ' + keys.map((k, i) => k + ' = $' + (i + 3)).join(', ') + ' WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id, ...keys.map(k => req.body[k] === '' ? null : req.body[k])]);
  it ? res.json(it) : res.sendStatus(404);
});
r.delete('/:id', async (req, res) => { await q('DELETE FROM items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.sendStatus(204); });
export default r;
