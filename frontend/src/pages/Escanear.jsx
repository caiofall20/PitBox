import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { engine, loadCatalog, listen, setEngineItems } from '../services/scan/engine.js';
import { searchWiki, googleImagesUrl } from '../services/scan/wiki.js';
import { api, fileUrl } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { findExact } from '../services/garage/duplicates.js';
import PhotoEditor from '../components/PhotoEditor.jsx';
import LiveScanner from '../components/LiveScanner.jsx';
import CameraCapture, { canCamera } from '../components/CameraCapture.jsx';
import Photo from '../components/Photo.jsx';
import { norm, dice } from '../core/text.js';
import { pad2 } from '../lib/format.js';
import { useMobile } from '../lib/useMobile.js';
import { useCelebrate } from '../lib/celebrate.jsx';

// Botão de foto. Com "capture", abre a câmera do próprio app (o atributo capture do input é ignorado
// no computador e em alguns Android, que abrem a galeria); se a câmera falhar, cai no seletor do sistema.
function FileBtn({ label, onFile, capture, primary, icon, hint }) {
  const [cam, setCam] = useState(false), input = useRef(), toast = useToast();
  const cls = 'btn' + (primary ? ' primary' : '');
  const picker = <input ref={input} type="file" accept="image/*" capture={capture ? 'environment' : undefined} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />;
  const content = <>{icon && <span className="ms" aria-hidden="true">{icon}</span>}{label}</>;
  if (capture && canCamera()) return (
    <>
      <button type="button" className={cls} style={{ position: 'relative' }} onClick={() => setCam(true)}>{content}{picker}</button>
      {cam && <CameraCapture title={label} hint={hint} onCancel={() => setCam(false)} onShot={f => { setCam(false); onFile(f); }} onFail={m => { setCam(false); toast(m); input.current?.click(); }} />}
    </>
  );
  return <label className={cls} style={{ position: 'relative' }}>{picker}{content}</label>;
}
const canLive = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
const sampleFile = async url => new File([await (await fetch(url)).blob()], url.split('/').pop(), { type: 'image/jpeg' });
const MODES = [[false, 'Cadastrar', 'Preenche o cadastro a partir da foto'], [true, 'Só verificar', 'Confere se você já tem, sem cadastrar']];
const CONDS = [
  ['card', 'Na cartela', 'Fotografe o verso da embalagem. Lemos o código, o nome e a série impressos.', 'Mais preciso', { height: 56, borderRadius: 8, background: 'var(--t1)' }, '#D7261E'],
  ['loose', 'Fora da cartela', 'Foto do carrinho e da base. Mostramos as opções mais prováveis, ou você preenche.', '', { height: 44, borderRadius: '50%', border: '4px solid var(--t0)' }, 'var(--yel)'],
];
const STEP_OF = { start: 0, live: 0, pickPhoto: 1, looseBase: 1, candidates: 2, verify: 2 };

export default function Escanear() {
  const [params, setParams] = useSearchParams(), verify = params.get('modo') === 'verificar';
  const nav = useNavigate(), toast = useToast(), mobile = useMobile(), celebrate = useCelebrate();
  const [picked, setPicked] = useState(false), [capture, setCapture] = useState(false);
  const [step, setStep] = useState('start'), [flow, setFlow] = useState('card'), [progress, setProgress] = useState(0), [preview, setPreview] = useState(null);
  const [info, setInfo] = useState(null), [edit, setEdit] = useState(null), [kept, setKept] = useState(null), [base, setBase] = useState(null), [wikiBusy, setWikiBusy] = useState(false), [items, setItems] = useState([]);
  useEffect(() => { loadCatalog(); api.items.list().then(l => { setItems(l); setEngineItems(l); }).catch(() => {}); listen(p => p != null && setProgress(Math.round(p)), setPreview); }, []);
  // Fora da cartela: o leitor da base (PaddleOCR) é grande; começa a baixar já, enquanto a pessoa fotografa o carrinho
  useEffect(() => { if (flow === 'loose') { engine.ocr().catch(() => {}); engine.paddle().catch(() => {}); } }, [flow]);

  const toForm = (form, conf, photo, extra = {}) => nav('/cadastro', { state: { form, conf, photo, ...extra } });
  const finishCard = acc => {
    const form = { ...acc.fields }; if (acc.found.toy) form.toy_code = acc.found.toy;
    if (verify) { setInfo(acc); setStep('verify'); return; }
    setInfo(acc); setStep('pickPhoto');
    if (!acc.fields.model) toast('Não conseguimos ler o nome do modelo. Você preenche na próxima etapa.');
  };
  const readCard = async file => {
    setStep('reading'); setProgress(5);
    try {
      await engine.ocr(); setProgress(25);
      const { img, done } = await engine.loadImg(file);
      const rot = await engine.detectRot(img); setProgress(55);
      setPreview(engine.rotCanvas(img, rot, 800).toDataURL('image/jpeg', .7));
      let { data } = await engine._worker.recognize(engine.prep(engine.rotCanvas(img, rot, 1800)));
      let text = data.text || '';
      if (!/\b[A-Z0-9]{3}[0-9OILSBZ]{2}\s*[-–—~_]\s*[A-Z0-9]{4}\b/.test(text.toUpperCase())) {
        const full = engine.rotCanvas(img, rot, 2400), bh = Math.round(full.height * .2), band = document.createElement('canvas');
        band.width = full.width * 1.5; band.height = bh * 1.5; band.getContext('2d').drawImage(full, 0, 0, full.width, bh, 0, 0, band.width, band.height);
        text = ((await engine._worker.recognize(engine.prep(band))).data.text || '') + '\n' + text;
      }
      done(); setPreview(null); finishCard(engine.parseCard(text));
    } catch { setStep('start'); toast('Não foi possível ler agora. Tente de novo ou preencha manualmente.'); }
  };
  const readBase = async file => {
    setStep('reading'); setProgress(5); setBase(null);
    try {
      await engine.ocr(); await loadCatalog();
      const { img, done } = await engine.loadImg(file);
      const text = await engine.readBase(img, () => true); done(); setPreview(null);
      const res = engine.parseBase(text); setBase(res); setStep('candidates'); enrich(res);
    } catch { setStep('looseBase'); toast('Não foi possível ler a base agora.'); }
  };
  const enrich = async res => {
    const brand = res.brand || res.cands[0]?.brand || '';
    if (brand && brand !== 'Hot Wheels') return;
    const targets = res.cands.filter(c => (!c.brand || c.brand === 'Hot Wheels') && !c.own && (!c.photo || c.fromOcr)).map(c => c.model.replace(/^'\d{2}\s*/, ''));
    const qs = [...new Set(targets.concat(!res.cands.length && res.guess ? [res.guess] : []))].slice(0, 3);
    if (!qs.length) return; setWikiBusy(true);
    try {
      for (const q of qs) {
        const hits = await searchWiki(q).catch(() => []); if (!hits.length) continue; const top = hits[0];
        setBase(b => {
          const list = [...b.cands], i = list.findIndex(c => norm(c.model.replace(/^'\d{2}\s*/, '')) === norm(q));
          const wk = { wiki: top.url, photo: top.thumb, wikiImg: !!top.thumb };
          if (i >= 0) list[i] = { ...list[i], ...wk, model: list[i].fromOcr || dice(norm(top.title), norm(list[i].model)) >= .6 ? top.title : list[i].model, reason: list[i].reason + ' · encontrado na Hot Wheels Wiki' };
          else if (!list.some(c => norm(c.model) === norm(top.title))) list.push({ brand: 'Hot Wheels', model: top.title, scale: '1:64', pct: 60, reason: 'Encontrado na Hot Wheels Wiki pelo texto da base', fromWiki: true, ...wk });
          return { ...b, cands: list.sort((a, c) => c.pct - a.pct).slice(0, 3) };
        });
      }
    } finally { setWikiBusy(false); }
  };
  const pickCand = c => {
    const form = { brand: c.brand, model: c.model, year: c.year || '', series: [c.series, c.seriesNum].filter(Boolean).join(' '), scale: c.scale || '', toy_code: c.toy || '', model_id: c.id && !c.own ? c.id : undefined, loose: true };
    const k = c.pct, conf = { brand: k, model: k, year: c.year ? k - 10 : null, series: c.series ? k - 5 : null, scale: c.scale ? k : null };
    if (verify) { setInfo({ fields: form, found: {}, conf }); setStep('verify'); return; }
    toForm(form, conf, kept, { castText: base?.text });
  };
  const exact = info && step === 'verify' ? findExact(items, { ...info.fields, toy: info.found?.toy }) : null;
  // Resultado do "Só verificar": bandeira verde (pode levar) ou amarela (já está na garagem)
  useEffect(() => { if (step !== 'verify' || !info) return; const name = [info.fields.brand, info.fields.model].filter(Boolean).join(' · '); exact ? celebrate('amarela', { title: 'Já está no box', sub: name + ' · Nº ' + pad2(exact.num) }) : celebrate('verde', { title: 'Pode levar!', sub: (name || 'Esta miniatura') + ' ainda não está na garagem' }); }, [step, info]);
  const card = flow === 'card';
  const takeLoose = f => setEdit({ src: f, done: url => { setKept(url); setStep('looseBase'); } });
  const sample = async () => { try { const f = await sampleFile(card ? '/assets/exemplo-verso.jpg' : '/assets/exemplo-frente.jpg'); card ? readCard(f) : takeLoose(f); } catch { toast('Não foi possível abrir a foto de exemplo.'); } };
  const setMode = v => { const p = new URLSearchParams(params); v ? p.set('modo', 'verificar') : p.delete('modo'); setParams(p, { replace: true }); };
  const stepIdx = step === 'reading' ? (card ? 0 : 1) : STEP_OF[step] ?? 0;
  // Celular: primeiro escolhe o tipo (Continuar), depois vem a tela da foto
  const choosing = mobile && step === 'start' && !capture;
  const labels = choosing ? ['Tipo', 'Foto', 'Conferir'] : card ? ['Verso', 'Foto', 'Conferir'] : ['Carrinho', 'Base', 'Escolher'];
  const tips = card ? ['A cartela inteira dentro da foto, sem cortar o topo.', 'Boa luz e sem reflexo no plástico.', 'Pode estar de lado ou de cabeça para baixo: a gente endireita.'] : ['O carrinho inteiro, ocupando a moldura.', 'Fundo liso e boa luz.', 'Esta foto vai para a sua garagem. Você ajusta em seguida.'];
  const condCards = CONDS.map(([k, t, d, badge, shape, dot]) => (
    <button key={k} className="opt big" role="radio" aria-checked={mobile ? picked && flow === k : flow === k} onClick={() => { setFlow(k); setPicked(true); }}>
      <span aria-hidden="true" style={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', ...shape }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: dot }} /></span>
      <span><b>{t}</b><small style={{ fontSize: 13.5 }}>{mobile ? d.replace(' impressos', '').replace(', ou você preenche', '') : d}</small></span>
      {badge && <span className="badge">{badge}</span>}
    </button>
  ));
  const stage = <>
    <div className="frame" style={{ aspectRatio: card ? '3/4' : '4/3', borderRadius: mobile ? 20 : 16 }}><div>{card ? 'Verso da cartela aqui' : 'Carrinho de lado aqui'}</div></div>
    <div className="stack" style={{ gap: mobile ? 8 : 6 }}>
      <span className="stage">{card ? 'Na cartela · Etapa 1' : 'Fora da cartela · 1 de 2'}</span>
      <h2 style={{ margin: 0, fontSize: mobile ? 24 : 22, fontWeight: 800, lineHeight: 1.2 }}>{card ? 'Fotografe o verso da cartela' : 'Fotografe o carrinho de lado'}</h2>
    </div>
    <ul className="tips">{tips.map(t => <li key={t}>{t}</li>)}</ul>
  </>;

  return (
    <main className="page" style={{ gap: mobile ? 24 : 28 }}>
      <ol className="steps" aria-label="Etapas">{labels.map((l, i) => <li key={l} className={i <= stepIdx ? 'on' : undefined} aria-current={i === stepIdx ? 'step' : undefined}>{i + 1}. {l}</li>)}</ol>

      {choosing && <div className="stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="m-title" style={{ fontSize: 22 }}>Escanear miniatura</h1>
          <p className="lead" style={{ fontSize: 15, lineHeight: 1.5 }}>Identificamos o modelo e conferimos se ele já está na sua garagem. A leitura acontece no seu aparelho, sem custo.</p>
        </div>
        <div className="m-seg" role="radiogroup" aria-label="O que fazer">{[[false, 'Cadastrar', 'Preenche a partir da foto'], [true, 'Só verificar', 'Confere se você já tem']].map(([v, t, d]) => (
          <button key={t} role="radio" aria-checked={verify === v} onClick={() => setMode(v)}><b>{t}</b><small>{d}</small></button>
        ))}</div>
        <div className="stack" style={{ gap: 12 }}>
          <h2 className="h2">Como está a miniatura?</h2>
          <div className="opts" role="radiogroup" aria-label="Condição">{condCards}</div>
        </div>
        <button className="btn primary" style={{ minHeight: 56, borderRadius: 14, fontSize: 16, ...(picked ? {} : { background: 'var(--k5)', color: 'var(--t4)', boxShadow: 'none', opacity: 1 }) }} disabled={!picked} onClick={() => { setCapture(true); scrollTo(0, 0); }}>Continuar</button>
      </div>}

      {mobile && step === 'start' && capture && <div className="stack" style={{ gap: 20 }}>
        {stage}
        <div className="stack" style={{ gap: 10 }}>
          {card && canLive ? <button className="btn primary" style={{ minHeight: 56, borderRadius: 14, fontSize: 16 }} onClick={() => setStep('live')}><span className="ms" aria-hidden="true">photo_camera</span>Escanear com a câmera</button>
            : <FileBtn label={card ? 'Tirar foto' : 'Fotografar'} icon="photo_camera" capture primary onFile={card ? readCard : takeLoose} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {card && canLive && <FileBtn label="Tirar foto" capture onFile={readCard} />}
            <FileBtn label="Galeria" icon="photo_library" onFile={card ? readCard : takeLoose} />
          </div>
        </div>
        <div className="between">
          <button className="link" style={{ color: 'var(--ink)', fontSize: 15 }} onClick={() => setCapture(false)}>← Voltar</button>
          <button className="m-link" onClick={sample}>Testar com foto de exemplo</button>
        </div>
      </div>}

      {!mobile && step === 'start' && <div className="scan-grid">
        <div className="stack" style={{ gap: 26 }}>
          <p className="lead">Identificamos o modelo e conferimos se ele já está na sua garagem. A leitura acontece no seu aparelho, sem custo.</p>
          <div className="stack" style={{ gap: 10 }}>
            <h2 className="h2" style={{ fontSize: 16 }}>O que você quer fazer?</h2>
            <div className="opts" role="radiogroup" aria-label="O que fazer">{MODES.map(([v, t, d]) => (
              <button key={t} className="opt" role="radio" aria-checked={verify === v} onClick={() => setMode(v)}><span className="dot" aria-hidden="true" /><span><b>{t}</b><small>{d}</small></span></button>
            ))}</div>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <h2 className="h2" style={{ fontSize: 16 }}>Como está a miniatura?</h2>
            <div className="opts" role="radiogroup" aria-label="Condição">{condCards}</div>
          </div>
        </div>
        <div className="scan-panel">
          {stage}
          <div className={'scan-btns' + (card && canLive ? '' : ' pair')}>
            {card && canLive ? <button className="btn primary" onClick={() => setStep('live')}><span className="ms" aria-hidden="true">photo_camera</span>Escanear com a câmera</button>
              : <FileBtn label={card ? 'Tirar foto' : 'Fotografar'} icon="photo_camera" capture primary onFile={card ? readCard : takeLoose} />}
            {card && canLive && <FileBtn label="Foto" icon="add_a_photo" capture onFile={readCard} />}
            <FileBtn label="Galeria" icon="photo_library" onFile={card ? readCard : takeLoose} />
          </div>
          <button className="link" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={sample}>Testar com uma foto de exemplo</button>
        </div>
      </div>}

      {step === 'live' && <LiveScanner onResult={finishCard} onCancel={() => setStep('start')} onError={m => { toast(m); setStep('start'); }} />}

      {step === 'reading' && <div role="status" aria-live="polite" className="stack" style={{ maxWidth: 560 }}>
        {preview && <img src={preview} alt="Foto tratada para leitura" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 18 }} />}
        <span className="h2">{flow === 'loose' ? 'Lendo a base do carrinho' : 'Lendo o verso da cartela'}</span>
        <div className="progress"><span style={{ width: progress + '%' }} /></div>
        <span className="muted">{flow === 'loose' ? 'Na primeira vez o leitor da base é baixado para o aparelho e pode levar até 1 minuto. Depois fica bem mais rápido.' : 'Na primeira vez o leitor é baixado para o aparelho (cerca de 10 MB). Depois fica mais rápido.'}</span>
      </div>}

      {step === 'pickPhoto' && info && <div className="stack">
        <section className="panel stack">
          <span className="h2">{info.fields.model ? 'Lemos o verso' : 'Leitura incompleta'}</span>
          {info.hit && <strong>{info.hit.byToy ? 'Encontrado no catálogo pelo código ' + info.fields.toy + '.' : 'Nome parecido com “' + info.hit.model + '”.'}</strong>}
          <dl className="specs">{[['Código', info.found.toy], ['Marca', info.fields.brand], ['Modelo', info.fields.model], ['Série', info.found.series], ['Nº na série', info.found.seriesNum], ['Nº na coleção', info.found.colNum], ['Ano', info.fields.year], ['Escala', info.fields.scale]].map(([l, v]) => <div key={l}><dt>{l}</dt><dd style={{ opacity: v ? 1 : .5 }}>{v || 'Não lido'}</dd></div>)}</dl>
          <span style={{ fontSize: 13, opacity: .75 }}>Você pode corrigir qualquer campo na próxima etapa.</span>
        </section>
        <h2 className="h2">Agora, a foto para a sua garagem</h2>
        <p className="muted" style={{ margin: 0 }}>Pode ser a frente da cartela ou o carrinho solto. Em seguida você gira e corta como quiser.</p>
        <div className="row"><FileBtn label="Fotografar" capture primary onFile={f => setEdit({ src: f, done: url => toForm({ ...info.fields, toy_code: info.found.toy || info.fields.toy || '' }, info.conf, url) })} /><FileBtn label="Galeria" onFile={f => setEdit({ src: f, done: url => toForm({ ...info.fields, toy_code: info.found.toy || '' }, info.conf, url) })} /><button className="btn" onClick={() => toForm({ ...info.fields, toy_code: info.found.toy || '' }, info.conf, null)}>Continuar sem foto</button></div>
        <button className="link" onClick={() => setStep('start')}>Ler o verso de novo</button>
      </div>}

      {step === 'looseBase' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28, alignItems: 'center' }}>
        <div className="stack"><Photo src={kept} radius={18} alt="Foto do carrinho" /><button className="link" onClick={() => setEdit({ src: kept, done: setKept })}>Ajustar esta foto</button></div>
        <div className="stack">
          <h2 className="h2">Agora vire e fotografe a base</h2>
          <p className="muted" style={{ margin: 0 }}>Embaixo do carrinho costumam estar gravados o nome do modelo, a marca e o ano do molde. Chegue perto e use boa luz.</p>
          <div className="row"><FileBtn label="Fotografar a base" hint="Vire o carrinho e chegue perto da base" capture primary onFile={readBase} /><FileBtn label="Galeria" onFile={readBase} /></div>
          <button className="link" onClick={() => { setBase({ cands: [], text: '' }); setStep('candidates'); }}>Pular esta etapa</button>
        </div>
      </div>}

      {step === 'candidates' && base && <div className="stack">
        <h2 className="h2">{base.cands.length ? 'Pode ser uma destas?' : 'Não encontramos uma opção segura'}</h2>
        <p className="muted" style={{ margin: 0 }}>{base.cands.length ? 'Compare com a sua foto e toque na certa. Você pode corrigir tudo no cadastro.' : 'Preencha os dados. Eles ajudam a reconhecer este modelo nas próximas vezes.'}</p>
        {base.text && <div className="card" style={{ padding: '12px 16px', overflowWrap: 'anywhere' }}><strong>Lemos na base:</strong> {base.text}</div>}
        <div className="grid">{base.cands.map((c, i) => (
          <article key={i} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="compare">
              <figure><div className="photo" style={{ position: 'absolute', inset: 0, aspectRatio: 'auto' }}><div className="img" style={{ backgroundImage: `url("${fileUrl(kept) || '/assets/sem-foto.svg'}")` }} /></div><figcaption>Sua foto</figcaption></figure>
              <figure><div className="photo" style={{ position: 'absolute', inset: 0, aspectRatio: 'auto' }}><div className="img" style={{ backgroundImage: `url("${fileUrl(c.photo) || '/assets/sem-foto.svg'}")` }} /></div><figcaption>Referência</figcaption></figure>
            </div>
            <div className="stack" style={{ padding: 16, gap: 6 }}>
              <div className="row" style={{ gap: 6 }}><span className="chip" style={{ minHeight: 28, background: 'var(--ink)', color: 'var(--bg)' }}>{c.pct}% de chance</span><span className="chip" style={{ minHeight: 28 }}>{c.fromWiki || c.wikiImg ? 'Hot Wheels Wiki' : c.own ? 'Sua garagem' : c.fromOcr ? 'Lido na base' : 'Catálogo Pitbox'}</span></div>
              <span className="mono muted">{c.brand}</span><strong style={{ fontSize: 17 }}>{c.model}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{c.reason}</span>
              <button className="btn primary" onClick={() => pickCand(c)}>É esta</button>
              <div className="row" style={{ gap: '0 14px' }}>{c.wiki && <a className="link" href={c.wiki} target="_blank" rel="noopener">Ver página ↗</a>}<a className="link" href={googleImagesUrl((c.brand || 'Hot Wheels') + ' ' + c.model)} target="_blank" rel="noopener">Ver no Google ↗</a></div>
              {c.wikiImg && <span className="muted" style={{ fontSize: 11 }}>Imagem: Hot Wheels Wiki (Fandom)</span>}
            </div>
          </article>))}
        </div>
        {wikiBusy && <span role="status" className="muted">Procurando também na Hot Wheels Wiki…</span>}
        <div className="row"><button className={'btn' + (base.cands.length ? '' : ' primary')} onClick={() => toForm({ brand: base.brand || '', year: base.year || '', loose: true }, base.brand ? { brand: 80 } : {}, kept, { castText: base.text })}>Nenhuma destas · preencher manualmente</button><button className="link" onClick={() => setStep('looseBase')}>Tentar outra foto da base</button></div>
      </div>}

      {step === 'verify' && info && <section className="panel stack">
        <span className="h2">{exact ? 'Já está na garagem' : 'Você ainda não tem'}</span>
        <strong style={{ fontSize: 20 }}>{info.fields.brand} {info.fields.model}</strong>
        <span>{exact ? `Nº ${pad2(exact.num)} · ${exact.qty} unidade(s). Não precisa comprar de novo.` : 'Pode levar sem medo de repetir.'}</span>
        <div className="row">{exact ? <Link className="btn dark" to={'/garagem/' + exact.id}>Abrir na garagem</Link> : <button className="btn primary" onClick={() => toForm({ ...info.fields, toy_code: info.found?.toy || '' }, info.conf, null)}>Cadastrar agora</button>}<button className="btn" onClick={() => { setInfo(null); setStep('start'); }}>Verificar outra</button></div>
      </section>}

      {edit && <PhotoEditor source={edit.src} onCancel={() => setEdit(null)} onDone={url => { const d = edit.done; setEdit(null); d(url); }} />}
    </main>
  );
}
