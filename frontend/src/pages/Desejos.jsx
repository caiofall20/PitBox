import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { useCelebrate } from '../lib/celebrate.jsx';
const EMPTY = { brand: '', model: '', year: '', series: '', scale: '' };
export default function Desejos() {
  const toast = useToast(), celebrate = useCelebrate();
  const { data, setData } = useAsync(() => api.wishlist.list(), []);
  const [f, setF] = useState(EMPTY), [adding, setAdding] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const add = async e => { e.preventDefault(); try { const w = await api.wishlist.add({ ...f, year: f.year ? Number(f.year) : null }); setData([w, ...(data || [])]); setF(EMPTY); setAdding(false); celebrate('mira', { title: 'Na mira!', sub: [w.brand, w.model].filter(Boolean).join(' · ') }); } catch (er) { toast(er.message); } };
  const remove = async w => { await api.wishlist.remove(w.id); setData(data.filter(x => x.id !== w.id)); toast(w.model + ' saiu da mira'); };
  return (
    <main className="page">
      <div className="between" style={{ alignItems: 'flex-end', gap: 20 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="m-title m-only">Na mira</h1>
          <p className="lead" style={{ maxWidth: '60ch' }}>Miniaturas que você ainda quer para a sua coleção. Achou uma? Confira se ela já está na sua garagem antes de adicionar.</p>
        </div>
        <div className="row wish-actions">
          <button className="btn md" aria-expanded={adding} onClick={() => setAdding(a => !a)}><span className="ms" aria-hidden="true">add</span>Adicionar</button>
          <Link className="btn md primary" to="/escanear?modo=verificar"><span className="ms" aria-hidden="true">fact_check</span>Já tenho essa?</Link>
        </div>
      </div>
      {adding && <form onSubmit={add} className="card form-grid" style={{ animation: 'pbIn .3s both' }}>
        <label className="field"><span>Marca</span><input className="input" value={f.brand} onChange={set('brand')} placeholder="Hot Wheels" autoFocus /></label>
        <label className="field"><span>Modelo</span><input className="input" required value={f.model} onChange={set('model')} placeholder="Datsun 510" /></label>
        <label className="field"><span>Ano</span><input className="input" inputMode="numeric" value={f.year} onChange={set('year')} /></label>
        <label className="field"><span>Série</span><input className="input" value={f.series} onChange={set('series')} /></label>
        <label className="field"><span>Escala</span><input className="input" value={f.scale} onChange={set('scale')} placeholder="1:64" /></label>
        <div className="row" style={{ alignSelf: 'end' }}><button className="btn md primary">Pôr na mira</button><button type="button" className="btn md soft" onClick={() => setAdding(false)}>Cancelar</button></div>
      </form>}
      {data && !data.length && <div className="empty"><b>Nada na mira ainda</b><span className="muted">Adicione as miniaturas que você está caçando, aqui ou pelo Paddock.</span></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {(data || []).map(w => (
          <article key={w.id} className="tile" style={{ gap: 16, padding: 18, animation: 'pbIn .4s both' }}>
            <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, border: '1.5px dashed var(--k8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontWeight: 700, fontSize: 18 }}>?</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="mono">{w.brand || '—'}</span>
                <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{w.model}</span>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>{[w.year, w.series, w.scale].filter(Boolean).join(' · ') || '—'}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <Link className="btn xs primary" style={{ minHeight: 42, borderRadius: 11 }} to="/cadastro" state={{ form: { brand: w.brand, model: w.model, year: w.year || '', series: w.series || '', scale: w.scale || '' } }}>Encontrei</Link>
              <button className="btn xs soft" style={{ minHeight: 42, borderRadius: 11 }} onClick={() => remove(w)} aria-label={'Remover ' + w.model}>Remover</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
