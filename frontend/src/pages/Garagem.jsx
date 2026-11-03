import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import CarCard, { CarPhoto, sub } from '../components/CarCard.jsx';
import CarDetails, { numLabel } from '../components/CarDetails.jsx';
import { norm } from '../core/text.js';
import { brl } from '../lib/format.js';
import { useMobile } from '../lib/useMobile.js';
const SORTS = { recentes: (a, b) => b.num - a.num, preco: (a, b) => (b.avg_price || 0) - (a.avg_price || 0), ano: (a, b) => (a.year || 9999) - (b.year || 9999), az: (a, b) => a.model.localeCompare(b.model) };
const readView = () => { try { return localStorage.getItem('pitbox-view') || 'grid'; } catch { return 'grid'; } };
export default function Garagem() {
  const toast = useToast(), mobile = useMobile();
  const { data: items, setData: setItems } = useAsync(() => api.items.list(), []);
  const folders = useAsync(() => api.folders.list(), []);
  const [params, setParams] = useSearchParams();
  const [brands, setBrands] = useState([]), [scales, setScales] = useState([]), [sort, setSort] = useState('recentes'), [folder, setFolder] = useState('all');
  const [view, setView] = useState(readView), [adding, setAdding] = useState(false), [fname, setFname] = useState('');
  // A busca fica na URL (?q=): o campo do cabeçalho (desktop) e o da página (celular) filtram enquanto digita
  const q = params.get('q') || '';
  const setQ = v => { const p = new URLSearchParams(params); v ? p.set('q', v) : p.delete('q'); setParams(p, { replace: true }); };
  useEffect(() => { try { localStorage.setItem('pitbox-view', view); } catch { /* sem storage */ } }, [view]);
  const list = items || [], fl = folders.data || [];
  const shown = useMemo(() => {
    const s = norm(q);
    return list.filter(i => (folder === 'all' || (folder === 'none' ? !i.folder_id : String(i.folder_id) === String(folder))) && (!brands.length || brands.includes(i.brand)) && (!scales.length || scales.includes(i.scale)) && (!s || norm([i.brand, i.model, i.series, i.year].join(' ')).includes(s))).sort(SORTS[sort]);
  }, [list, q, brands, scales, sort, folder]);
  const units = list.reduce((a, i) => a + i.qty, 0), total = list.reduce((a, i) => a + (Number(i.avg_price) || 0) * i.qty, 0);
  const tally = k => Object.entries(list.reduce((a, i) => { if (i[k]) a[i[k]] = (a[i[k]] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const count = id => list.filter(i => id === 'none' ? !i.folder_id : String(i.folder_id) === String(id)).length;
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const folderName = id => id === 'none' ? 'Sem pasta' : fl.find(f => String(f.id) === String(id))?.name;
  const clear = () => { setQ(''); setBrands([]); setScales([]); setFolder('all'); };
  const chips = [
    ...(folder !== 'all' ? [['Pasta: ' + folderName(folder), () => setFolder('all')]] : []),
    ...brands.map(b => [b, () => toggle(brands, setBrands, b)]),
    ...scales.map(s => [s, () => toggle(scales, setScales, s)]),
    ...(q ? [['“' + q + '”', () => setQ('')]] : []),
  ];
  const addFolder = async e => { e.preventDefault(); try { const f = await api.folders.create(fname); folders.setData([...fl, f]); setAdding(false); setFname(''); setFolder(f.id); toast('Pasta “' + f.name + '” criada. Abra uma miniatura para colocá-la aqui.'); } catch (er) { toast(er.message); } };
  const delFolder = async () => { const f = fl.find(x => String(x.id) === String(folder)); if (!f || !confirm('Excluir a pasta “' + f.name + '”? As miniaturas continuam na garagem.')) return; await api.folders.remove(f.id); folders.setData(fl.filter(x => x.id !== f.id)); setFolder('all'); toast('Pasta excluída'); };
  // Gaveta de detalhes: ?car=<id> na URL
  const selId = params.get('car'), sel = list.find(i => String(i.id) === selId);
  const open = i => { const p = new URLSearchParams(params); p.set('car', i.id); setParams(p); };
  const close = () => { const p = new URLSearchParams(params); p.delete('car'); setParams(p); };
  useEffect(() => { if (!sel) return; const onKey = e => e.key === 'Escape' && close(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [sel]);

  const newFolderForm = <form onSubmit={addFolder} className="row" style={{ gap: 6 }}><input className="input" style={{ minHeight: 40, flex: 1 }} autoFocus value={fname} onChange={e => setFname(e.target.value)} maxLength={30} aria-label="Nome da nova pasta" placeholder="Ex.: Speed Racer" /><button className="btn xs primary">Criar</button><button type="button" className="btn xs soft" onClick={() => setAdding(false)}>Cancelar</button></form>;
  const mobileView = <>
    <div className="between" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
      <div className="stack" style={{ gap: 4 }}><h1 className="m-title">Garagem</h1><span style={{ fontSize: 14, color: 'var(--t2)' }}>{list.length} modelos · {brl(total)} investidos</span></div>
      <Link className="btn xs" style={{ minHeight: 44, borderRadius: 12, flexShrink: 0 }} to="/cadastro"><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>add</span>Manual</Link>
    </div>
    <div className="m-search"><label htmlFor="busca" className="sr-only">Buscar na garagem</label><input id="busca" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar modelo, marca, série ou ano" /><span className="ms" aria-hidden="true">search</span></div>
    <div className="stack" style={{ gap: 10 }}>
      <span className="legend" style={{ padding: 0, fontSize: 11, color: 'var(--t3)' }}>Pastas</span>
      <div className="m-chips" role="group" aria-label="Pastas">
        {[{ id: 'all', name: 'Todas', n: list.length }, ...fl.map(f => ({ ...f, n: count(f.id) })), { id: 'none', name: 'Sem pasta', n: count('none') }].map(f => <button key={f.id} className="m-chip" aria-pressed={String(folder) === String(f.id)} onClick={() => setFolder(f.id)}>{f.name}<small>{f.n}</small></button>)}
        {!adding && <button className="m-chip add" onClick={() => setAdding(true)}>+ Nova pasta</button>}
      </div>
      {adding && newFolderForm}
      {folder !== 'all' && folder !== 'none' && <button className="link" style={{ color: 'var(--coral)', fontSize: 13, minHeight: 32, alignSelf: 'flex-start' }} onClick={delFolder}>Excluir esta pasta</button>}
    </div>
    {tally('brand').length > 0 && <div className="stack" style={{ gap: 10 }}>
      <span className="legend" style={{ padding: 0, fontSize: 11, color: 'var(--t3)' }}>Marca</span>
      <div className="m-chips" role="group" aria-label="Marca">
        <button className="m-chip" aria-pressed={!brands.length} onClick={() => setBrands([])}>Todas</button>
        {tally('brand').map(([b]) => <button key={b} className="m-chip" aria-pressed={brands.includes(b)} onClick={() => toggle(brands, setBrands, b)}>{b}</button>)}
      </div>
    </div>}
    <div className="between" style={{ paddingTop: 12, borderTop: '1px solid var(--k5)', flexWrap: 'nowrap' }}>
      <span style={{ fontSize: 14, color: 'var(--t2)' }} aria-live="polite">{shown.length} {shown.length === 1 ? 'modelo' : 'modelos'}</span>
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        <label><span className="sr-only">Escala</span><select className="select" value={scales[0] || ''} onChange={e => setScales(e.target.value ? [e.target.value] : [])}><option value="">Todas escalas</option>{tally('scale').map(([s]) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="sr-only">Ordenar</span><select className="select" value={sort} onChange={e => setSort(e.target.value)}><option value="recentes">Recentes</option><option value="preco">Preço</option><option value="ano">Ano</option><option value="az">A–Z</option></select></label>
      </div>
    </div>
    {items && !list.length && <div className="empty"><b>Sua garagem está vazia</b><Link className="btn primary" to="/escanear">Escanear miniatura</Link></div>}
    {items && !!list.length && !shown.length && <p style={{ margin: 0, padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 15, border: '1.5px dashed var(--k6)', borderRadius: 16 }}>Nenhum modelo encontrado.</p>}
    <div className="m-cars">{shown.map(i => (
      <button key={i.id} className="m-car" onClick={() => open(i)}>
        <CarPhoto item={i} num={false} label="Foto" />
        <span className="stack" style={{ gap: 3, padding: '10px 12px 12px' }}>
          <span className="mono" style={{ fontSize: 10 }}>{i.brand}{i.scale ? ' · ' + i.scale : ''}</span>
          <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{i.model}</span>
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{sub(i)}</span>
        </span>
      </button>))}
    </div>
  </>;

  return (
    <main className="page">
      {mobile ? mobileView : <div className="garage">
        <aside className="filters" aria-label="Filtros">
          <div className="between"><span style={{ fontSize: 15, fontWeight: 800 }}>Filtros</span>{chips.length > 0 && <button className="btn soft" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, fontSize: 12, color: 'var(--ink)' }} onClick={clear}>Limpar</button>}</div>
          <fieldset>
            <legend className="legend">Pastas</legend>
            {[{ id: 'all', name: 'Todas', n: list.length }, ...fl.map(f => ({ ...f, n: count(f.id) })), { id: 'none', name: 'Sem pasta', n: count('none') }].map(f => (
              <button key={f.id} className="folder-btn" aria-pressed={String(folder) === String(f.id)} onClick={() => setFolder(f.id)}><span><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>folder</span>{f.name}</span><small>{f.n}</small></button>
            ))}
            {adding
              ? <div style={{ marginTop: 4 }}>{newFolderForm}</div>
              : <button className="dashed-btn" onClick={() => setAdding(true)}><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>create_new_folder</span>Nova pasta</button>}
            {folder !== 'all' && folder !== 'none' && <button className="link" style={{ color: 'var(--coral)', fontSize: 13, minHeight: 32 }} onClick={delFolder}>Excluir esta pasta</button>}
          </fieldset>
          {tally('brand').length > 0 && <fieldset style={{ gap: 2 }}>
            <legend className="legend">Fabricante</legend>
            {tally('brand').map(([b, n]) => <label key={b} className="check"><input type="checkbox" checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} /><span style={{ flex: 1 }}>{b}</span><small>{n}</small></label>)}
          </fieldset>}
          {tally('scale').length > 0 && <fieldset>
            <legend className="legend">Escala</legend>
            <div className="row" style={{ gap: 6 }}>{tally('scale').map(([s]) => <button key={s} className="pill" aria-pressed={scales.includes(s)} onClick={() => toggle(scales, setScales, s)}>{s}</button>)}</div>
          </fieldset>}
        </aside>

        <section aria-label="Miniaturas" className="stack" style={{ gap: 18, minWidth: 0 }}>
          <div className="between">
            <div className="stack" style={{ gap: 2 }} aria-live="polite">
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>{shown.length} {shown.length === 1 ? 'miniatura' : 'miniaturas'}</span>
              <span style={{ fontSize: 13.5, color: 'var(--t3)' }}>{list.length} modelos · {units} unidades · {brl(total)} investidos</span>
            </div>
            <div className="row">
              <label className="row" style={{ gap: 8, fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>Ordenar
                <select className="select" value={sort} onChange={e => setSort(e.target.value)}><option value="recentes">Mais recentes</option><option value="preco">Maior preço</option><option value="ano">Mais antigas</option><option value="az">A–Z</option></select>
              </label>
              <div className="seg sm" role="radiogroup" aria-label="Visualização">
                <button role="radio" aria-checked={view === 'grid'} onClick={() => setView('grid')}><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>grid_view</span>Grade</button>
                <button role="radio" aria-checked={view === 'list'} onClick={() => setView('list')}><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>view_list</span>Lista</button>
              </div>
              <Link className="btn xs" to="/cadastro"><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>edit_note</span>Cadastro manual</Link>
            </div>
          </div>
          {chips.length > 0 && <div className="row" style={{ gap: 8 }}>{chips.map(([l, rm]) => <button key={l} className="chip-x" onClick={rm} aria-label={'Remover filtro ' + l}>{l}<span aria-hidden="true" style={{ opacity: .7 }}>×</span></button>)}</div>}
          {items && !list.length && <div className="empty"><b>Sua garagem está vazia</b><span className="muted">Escaneie a primeira miniatura ou cadastre à mão.</span><Link className="btn primary" to="/escanear">Escanear miniatura</Link></div>}
          {items && !!list.length && !shown.length && <div className="empty"><b>Nenhuma miniatura nessa pista</b><span className="muted" style={{ fontSize: 14 }}>Ajuste os filtros ou a busca.</span><button className="btn xs" onClick={clear}>Limpar filtros</button></div>}
          {view === 'grid'
            ? <div className="cars">{shown.map(i => <CarCard key={i.id} item={i} onClick={() => open(i)} />)}</div>
            : !!shown.length && <div className="rows" role="list">{shown.map(i => (
              <button key={i.id} role="listitem" onClick={() => open(i)}>
                <CarPhoto item={i} num={false} label="" />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ font: '800 14.5px Manrope,sans-serif' }}>{i.model}</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{i.brand} · {sub(i)}</span></span>
                <span style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--t2)' }}>{i.scale || '—'}</span>
                <span style={{ font: '800 14px Manrope,sans-serif', textAlign: 'right' }}>{brl(i.avg_price)}</span>
              </button>))}
            </div>}
        </section>
      </div>}

      {sel && <>
        <div className="drawer-bg" aria-hidden="true" onClick={close} />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={'Detalhes de ' + sel.model}>
          <div className="between" style={{ padding: '16px 20px', flexShrink: 0 }}>
            <span style={{ font: "500 12px 'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'var(--t3)', textTransform: 'uppercase' }}>{numLabel(sel)}</span>
            <button className="round plain" onClick={close} aria-label="Fechar" autoFocus><span className="ms" aria-hidden="true">close</span></button>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <CarDetails it={sel} folders={fl} onChange={u => setItems(list.map(x => x.id === u.id ? { ...x, ...u } : x))} onDeleted={d => { setItems(list.filter(x => x.id !== d.id)); close(); }} />
          </div>
        </aside>
      </>}
    </main>
  );
}
