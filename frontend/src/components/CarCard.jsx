import { Link } from 'react-router-dom';
import { fileUrl } from '../services/api.js';
import { brl, pad2 } from '../lib/format.js';
export const sub = i => [i.year, i.series].filter(Boolean).join(' · ') || '—';
// Foto da miniatura em capa; sem foto, mostra a pista listrada do design
export function CarPhoto({ item, label = 'Adicione uma foto', num = true }) {
  const u = fileUrl(item.photo_url || item.ref_photo);
  return (
    <span className="ph">
      {u ? <img src={u} alt={item.model} loading="lazy" /> : <span className="none">{label}</span>}
      {num && item.num && <span className="num-tag">#{pad2(item.num)}</span>}
    </span>
  );
}
export default function CarCard({ item, to, onClick, footer, noPhoto }) {
  const body = <>
    <CarPhoto item={item} label={noPhoto} />
    <span className="info">
      <span className="mono">{item.brand}</span>
      <span className="name">{item.model}</span>
      <span className="sub">{sub(item)}</span>
    </span>
    <span className="foot">{footer || <><span>{item.scale || '—'}{item.qty > 1 ? ' · ×' + item.qty : ''}</span><b>{brl(item.avg_price)}</b></>}</span>
  </>;
  return to ? <Link to={to} className="car">{body}</Link> : <button type="button" className="car" onClick={onClick}>{body}</button>;
}
