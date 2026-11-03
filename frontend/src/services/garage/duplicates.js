import { norm, dice, sameVariant } from '../../core/text.js';
// Repetidas: mesma variante soma +1; parecida vira item separado.
const T = x => ({ ...x, toy: x.toy || x.toy_code || undefined });
export function findExact(items, f, exclude) {
  items = items.map(T); f = T(f);
  if (!norm(f.model) && !f.toy) return null;
  return items.find(i => i.id !== exclude && sameVariant(f, i)) || null;
}
export function findSimilar(items, f, exclude) {
  items = items.map(T); f = T(f);
  const ex = findExact(items, f, exclude); if (ex) return ex;
  if (f.toy) { const t = items.find(i => i.id !== exclude && i.toy === f.toy); if (t) return t; }
  const m = norm(f.model); if (!m) return null;
  return items.find(i => i.id !== exclude && (norm(i.model) === m || dice(norm(i.model), m) >= 0.85)) || null;
}
