// Utilitários de texto e comparação aproximada (extraídos do protótipo)
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export const titleCase = s => s.split(/\s+/).filter(Boolean).map(w => /\d/.test(w) || w.replace(/[^A-Za-z]/g, '').length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

export const bigrams = s => { s = ' ' + s + ' '; const o = []; for (let i = 0; i < s.length - 1; i++) o.push(s.slice(i, i + 2)); return o; };

export const dice = (a, b) => { if (!a || !b) return 0; if (a === b) return 1; const A = bigrams(a), B = bigrams(b); const m = new Map(); A.forEach(x => m.set(x, (m.get(x) || 0) + 1)); let n = 0; B.forEach(x => { const c = m.get(x); if (c) { n++; m.set(x, c - 1); } }); return 2 * n / (A.length + B.length); };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const eqOpt = (a, b) => !norm(a) || !norm(b) || norm(a) === norm(b);

export const sameVariant = (a, b) => (a.toy && b.toy) ? a.toy === b.toy : (norm(a.brand) === norm(b.brand) && norm(a.model) === norm(b.model) && eqOpt(a.series, b.series) && eqOpt(a.scale, b.scale));
