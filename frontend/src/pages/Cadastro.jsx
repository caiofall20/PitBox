import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, uploadDataUrl } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { findExact, findSimilar } from '../services/garage/duplicates.js';
import PhotoEditor from '../components/PhotoEditor.jsx';
import Photo from '../components/Photo.jsx';
import { eqOpt } from '../core/text.js';
import { fileUrl } from '../services/api.js';
import { pad2 } from '../lib/format.js';
import Largada from '../components/Largada.jsx';
import { useCelebrate } from '../lib/celebrate.jsx';
const FIELDS = [['brand', 'Marca', 'Hot Wheels'], ['model', 'Modelo', "Ex.: '94 Bugatti EB110 SS"], ['year', 'Ano', '2025'], ['series', 'Série / coleção', 'HW Race Day 9/10'], ['scale', 'Escala', '1:64'], ['price', 'Preço pago (R$)', '12,90']];
export default function Cadastro() {
  const { id } = useParams(), { state } = useLocation(), nav = useNavigate(), toast = useToast(), celebrate = useCelebrate();
  const [f, setF] = useState({ brand: '', model: '', year: '', series: '', scale: '', price: '', toy_code: '', ...(state?.form || {}) });
  const [photo, setPhoto] = useState(state?.photo || null), [conf] = useState(state?.conf || {}), [items, setItems] = useState([]), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [suggest, setSuggest] = useState(!state?.form?.model_id), [launch, setLaunch] = useState(null);
  useEffect(() => { api.items.list().then(setItems).catch(() => {}); if (id) api.items.get(id).then(it => { setF({ ...it, price: it.avg_price ?? '' }); setPhoto(it.photo_url); }); }, [id]);
  const probe = { ...f, toy: f.toy_code };
  const exact = useMemo(() => id ? null : findExact(items, probe), [items, f, id]);
  const similar = useMemo(() => exact ? exact : findSimilar(items.map(i => ({ ...i, toy: i.toy_code })), probe, id ? Number(id) : null), [items, f, exact, id]);
  const diffs = similar && !exact ? [['brand', 'o fabricante'], ['model', 'o modelo'], ['series', 'a coleção'], ['scale', 'a escala']].filter(([k]) => !eqOpt(f[k], similar[k])).map(x => x[1]) : [];
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async forceNew => {
    if (!f.model.trim()) return toast('Informe o modelo para salvar');
    setBusy(true);
    try {
      const photo_url = photo && photo.startsWith('data:') ? await uploadDataUrl(photo) : photo;
      if (id) { await api.items.update(id, { brand: f.brand, model: f.model, year: f.year, series: f.series, scale: f.scale, avg_price: f.price === '' ? null : Number(String(f.price).replace(',', '.')), photo_url }); celebrate('pitstop', { title: 'Ajuste feito', sub: [f.brand, f.model].filter(Boolean).join(' · '), onDone: () => nav('/garagem?car=' + id, { replace: true }) }); return; }
      const r = await api.items.create({ ...f, photo_url, forceNew: !!forceNew });
      if (suggest && !f.model_id) api.catalog.suggest({ ...f, photo_url, cast_text: state?.castText }).catch(() => {});
      toast(r.grouped ? 'Agora você tem ' + r.item.qty + ' unidades da Nº ' + pad2(r.item.num) : 'Nº ' + pad2(r.item.num) + ' estacionada na garagem');
      setLaunch(r.item);
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const wish = async () => { if (!f.model.trim()) return toast('Informe o modelo para salvar'); try { await api.wishlist.add(f); toast('Foi para os seus desejos'); nav('/desejos'); } catch (e) { toast(e.message); } };
  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <div className="stack" style={{ gap: 6 }}><span className="kicker">{id ? 'Editar' : state ? 'Conferir leitura' : 'Cadastro manual'}</span><h1 className="h1">{id ? 'Editar miniatura' : 'Nova miniatura'}</h1></div>
      {similar && <section className="card stack" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
        <strong className="h2">{exact ? 'Você já tem esta miniatura' : 'Parecida com uma da sua garagem'}</strong>
        <span>Nº {pad2(similar.num)} · {similar.qty} unidade(s). {exact ? 'Mesmo modelo, coleção e fabricante. Ao salvar, somamos +1 à quantidade.' : 'Muda ' + (diffs.join(', ').replace(/, ([^,]*)$/, ' e $1') || 'algum detalhe') + '. Ao salvar, ela entra como uma miniatura separada.'}</span>
        <Link className="link" to={'/garagem/' + similar.id}>Abrir a que já tenho</Link>
      </section>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
        <div className="stack">
          <Photo src={photo} radius={18} alt="Foto da miniatura" />
          <div className="row">
            <label className="btn sm"><input type="file" accept="image/*" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setEdit(file); }} />{photo ? 'Trocar foto' : 'Adicionar foto'}</label>
            {photo && <button className="link" onClick={() => setEdit(fileUrl(photo))}>Girar ou cortar</button>}
          </div>
        </div>
        <div className="form-grid">
          {FIELDS.map(([k, l, ph]) => <label key={k} className="field" style={k === 'model' ? { gridColumn: '1 / -1' } : null}><span>{l}{conf[k] ? <span className="muted" style={{ fontWeight: 600 }}> · {conf[k]}% de confiança</span> : null}</span><input className="input" value={f[k] ?? ''} onChange={set(k)} placeholder={ph} inputMode={k === 'price' || k === 'year' ? 'decimal' : undefined} /></label>)}
          {f.toy_code && <label className="field"><span>Código do produto</span><input className="input" value={f.toy_code} onChange={set('toy_code')} /></label>}
          {!id && !f.model_id && <label className="row" style={{ gridColumn: '1 / -1', fontSize: 14 }}><input type="checkbox" checked={suggest} onChange={e => setSuggest(e.target.checked)} style={{ width: 22, height: 22 }} />Sugerir este modelo ao catálogo compartilhado (passa pela moderação)</label>}
        </div>
      </div>
      <div className="row">
        <button className="btn primary" disabled={busy} onClick={() => save(false)}>{busy ? 'Salvando…' : id ? 'Salvar alterações' : exact ? 'Somar +1 · ficar com ' + (exact.qty + 1) : 'Salvar na garagem'}</button>
        {exact && <button className="btn" disabled={busy} onClick={() => save(true)}>Cadastrar como nova</button>}
        {!id && <button className="btn" onClick={wish}>Salvar nos desejos</button>}
        <button className="link" onClick={() => nav(-1)}>Cancelar</button>
      </div>
      {launch && <Largada item={launch} onDone={() => nav('/garagem?car=' + launch.id, { replace: true })} />}
      {edit && <PhotoEditor source={edit} onCancel={() => setEdit(null)} onDone={u => { setPhoto(u); setEdit(null); }} />}
    </main>
  );
}
