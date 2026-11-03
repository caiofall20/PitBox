export const brl = v => (v == null || isNaN(v)) ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const brlShort = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');

export const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '') : '—';

export const today = () => new Date().toISOString().slice(0, 10);

export const pad2 = n => String(n).padStart(2, '0');

export const parsePrice = s => {
  s = String(s || '').trim(); if (!s) return null;
  const n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
  return isNaN(n) ? null : n;
};
