import { Router } from 'express';
import { q } from '../db.js';
const r = Router();
r.get('/queue', async (req, res) => res.json({
  models: await q("SELECT m.*, u.name AS by, (SELECT url FROM catalog_photos p WHERE p.model_id=m.id ORDER BY created_at LIMIT 1) AS photo FROM catalog_models m LEFT JOIN users u ON u.id=m.suggested_by WHERE status='pendente' ORDER BY created_at"),
  photos: await q("SELECT p.*, m.brand, m.model, u.name AS by FROM catalog_photos p JOIN catalog_models m ON m.id=p.model_id LEFT JOIN users u ON u.id=p.sent_by WHERE p.status='pendente' AND m.status='aprovado' ORDER BY p.created_at"),
}));
r.post('/:kind/:id', async (req, res) => {
  const status = req.body.action === 'aprovar' ? 'aprovado' : 'rejeitado';
  if (req.params.kind === 'photo') await q('UPDATE catalog_photos SET status=$1 WHERE id=$2', [status, req.params.id]);
  else { await q('UPDATE catalog_models SET status=$1, reviewed_by=$3 WHERE id=$2', [status, req.params.id, req.user.id]); await q('UPDATE catalog_photos SET status=$1 WHERE model_id=$2 AND status=\'pendente\'', [status, req.params.id]); }
  res.sendStatus(204);
});
export default r;
