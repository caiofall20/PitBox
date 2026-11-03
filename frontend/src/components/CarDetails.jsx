import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { CarPhoto } from './CarCard.jsx';
import { brl, fmtDate, pad2 } from '../lib/format.js';
// Copia o link público da miniatura (ou abre o compartilhamento do aparelho)
export async function shareLink(title, path, toast) {
  const url = location.origin + path;
  try { if (navigator.share) { await navigator.share({ title: 'PitBox · ' + title, url }); return; } await navigator.clipboard.writeText(url); toast('Link copiado'); } catch { /* compartilhamento cancelado */ }
}
// Ficha da miniatura na garagem: usada na gaveta da Garagem e na página /garagem/:id
export default function CarDetails({ it, folders, onChange, onDeleted }) {
  const toast = useToast(), { user } = useAuth();
  const patch = async d => { try { onChange(await api.items.update(it.id, d)); } catch (e) { toast(e.message); } };
  const del = async () => { if (!confirm('Excluir ' + it.model + ' da garagem?')) return; await api.items.remove(it.id); toast(it.model + ' saiu da garagem'); onDeleted(it); };
  const specs = [['Ano', it.year], ['Escala', it.scale], ['Série / coleção', it.series], [it.qty > 1 ? 'Preço médio' : 'Preço pago', it.avg_price != null ? brl(it.avg_price) : null], ['Cadastrada em', fmtDate(it.created_at)], ['Fabricante', it.brand], ...(it.toy_code ? [['Código do produto', it.toy_code]] : []), ['Estado', it.loose ? 'Fora da cartela' : 'Na cartela']];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div style={{ borderRadius: 16, overflow: 'hidden' }}><CarPhoto item={it} num={false} label="Sem foto" /></div>
      <div className="stack" style={{ gap: 4 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em' }}>{it.brand}</span>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.15 }}>{it.model}</h2>
      </div>
      <dl className="facts">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
      <label className="box-row"><span style={{ fontSize: 14, fontWeight: 700 }}>Pasta</span>
        <select className="select" style={{ minWidth: 170, background: 'var(--kin)' }} value={it.folder_id || ''} onChange={e => patch({ folder_id: e.target.value || null })}><option value="">Sem pasta</option>{(folders || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </label>
      <div className="box-row">
        <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 700 }}>Unidades</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{it.qty > 1 ? 'Repetidas na garagem' : 'Comprou outra igual? Some aqui.'}</span></span>
        <div className="row" role="group" aria-label="Quantidade" style={{ flexWrap: 'nowrap' }}>
          <button className="round" disabled={it.qty <= 1} onClick={() => patch({ qty: it.qty - 1 })} aria-label="Diminuir"><span className="ms" aria-hidden="true">remove</span></button>
          <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>{it.qty}</span>
          <button className="round" onClick={() => patch({ qty: it.qty + 1 })} aria-label="Aumentar"><span className="ms" aria-hidden="true">add</span></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link className="btn primary" style={{ minHeight: 48, borderRadius: 13 }} to={'/garagem/' + it.id + '/editar'}><span className="ms" aria-hidden="true">edit</span>Editar</Link>
        <button className="btn" style={{ minHeight: 48, borderRadius: 13 }} onClick={() => shareLink(it.model, '/u/' + encodeURIComponent(user.handle) + '/' + it.id, toast)}><span className="ms" aria-hidden="true">share</span>Compartilhar</button>
      </div>
      <button className="link" style={{ alignSelf: 'center', color: 'var(--coral)', gap: 6 }} onClick={del}><span className="ms" aria-hidden="true">delete</span>Excluir da garagem</button>
    </div>
  );
}
export const numLabel = it => 'Nº ' + pad2(it.num) + ' na garagem';
