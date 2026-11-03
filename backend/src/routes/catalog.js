import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
const PHOTO = "(SELECT url FROM catalog_photos p WHERE p.model_id = m.id AND p.status = 'aprovado' ORDER BY p.created_at LIMIT 1) AS photo";
// Índice leve usado pelo scan no aparelho (comparação aproximada local)
r.get('/index', async (req, res) => { res.set('Cache-Control', 'private, max-age=300'); res.json(await q("SELECT m.id, toy_code, brand, model, year, series, series_num, col_num, scale, cast_text, wiki_url, " + PHOTO + " FROM catalog_models m WHERE status='aprovado'")); });
r.get('/toy/:code', async (req, res) => { const [m] = await q("SELECT m.*, " + PHOTO + " FROM catalog_models m WHERE toy_code = upper($1) AND status = 'aprovado'", [req.params.code]); m ? res.json(m) : res.sendStatus(404); });
r.get('/search', async (req, res) => res.json(await q("SELECT m.*, similarity(brand || ' ' || model || ' ' || coalesce(cast_text,''), $1) AS score, " + PHOTO + " FROM catalog_models m WHERE status = 'aprovado' AND (brand || ' ' || model || ' ' || coalesce(cast_text,'')) % $1 ORDER BY score DESC LIMIT 3", [String(req.query.q || '')])));
// Sugestão de modelo novo (+ foto) para moderação
r.post('/suggestions', async (req, res) => {
  const d = req.body;
  if (!String(d.model || '').trim()) return res.status(400).json({ error: 'Informe o modelo' });
  let [m] = d.toy_code ? await q('SELECT * FROM catalog_models WHERE toy_code=upper($1)', [d.toy_code]) : await q('SELECT * FROM catalog_models WHERE lower(brand)=lower($1) AND lower(model)=lower($2) LIMIT 1', [d.brand || '', d.model]);
  if (!m) [m] = await q('INSERT INTO catalog_models (toy_code, brand, model, year, series, scale, cast_text, suggested_by) VALUES (upper(nullif($1,\'\')),$2,$3,$4,$5,$6,$7,$8) RETURNING *', [d.toy_code || '', d.brand || '', d.model.trim(), d.year, d.series, d.scale, d.cast_text, req.user.id]);
  if (d.photo_url) await q('INSERT INTO catalog_photos (model_id, url, sent_by) VALUES ($1,$2,$3)', [m.id, d.photo_url, req.user.id]);
  res.status(201).json(m);
});
export default r;
