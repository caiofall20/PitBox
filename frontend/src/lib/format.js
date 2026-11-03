export const brl = v => v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pad2 = n => String(n).padStart(2, '0');
export const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
export const ago = d => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'agora'; if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.floor(s / 3600) + ' h'; if (s < 172800) return 'ontem'; return 'há ' + Math.floor(s / 86400) + ' dias'; };
export const meta = i => [i.year, i.series, i.scale].filter(Boolean).join(' · ');
export const initial = n => (n || '?').trim().charAt(0).toUpperCase();
const COLORS = ['#c2410c', '#1d4ed8', '#047857', '#7c3aed', '#be185d', '#0f766e'];
export const colorOf = n => COLORS[[...(n || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
