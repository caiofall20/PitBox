import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import { CarPhoto } from '../components/CarCard.jsx';
import { useMobile } from '../lib/useMobile.js';
import { brl } from '../lib/format.js';
import { CountUp, Gauge, TrackCar, tilt, untilt, useRev } from '../components/HomeFx.jsx';
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const brl0 = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
// [rota, título, descrição (desktop), ícone, fundo, cor, descrição curta (celular)]
const SHORTCUTS = [
  ['/escanear', 'Escanear e cadastrar', 'A foto preenche marca, modelo, ano e série.', 'photo_camera', 'rgba(215,38,30,0.16)', 'var(--coral)', 'A foto preenche os dados'],
  ['/escanear?modo=verificar', 'Já tenho essa?', 'Confira se ela já está na sua garagem.', 'fact_check', 'rgba(255,201,60,0.14)', 'var(--yel)', 'Confira na garagem'],
  ['/cadastro', 'Cadastro manual', 'Digite os dados sem foto.', 'edit_note', 'var(--k5)', 'var(--t1)', 'Sem foto'],
];
export default function Home() {
  const { user } = useAuth(), mobile = useMobile(), car = useRev();
  const { data: items } = useAsync(() => api.items.list(), []);
  const { data: wishes } = useAsync(() => api.wishlist.list(), []);
  const list = items || [], wish = wishes || [];
  const units = list.reduce((a, i) => a + i.qty, 0), total = list.reduce((a, i) => a + (Number(i.avg_price) || 0) * i.qty, 0);
  const brands = Object.entries(list.reduce((a, i) => { const k = i.brand || '—'; a[k] = (a[k] || 0) + i.qty; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const stats = [['miniaturas', <CountUp value={units} />], ['investidos', <CountUp value={total} format={brl0} />], ['na mira', <CountUp value={wish.length} />, true]];
  const rise = i => ({ className: 'rise', style: { '--d': i * 0.08 + 's' } });
  // carro que acelera: a chave muda a cada clique e reinicia a animação
  const revFx = <>{car.revs > 0 && <span key={car.revs} className="rev-burst" aria-hidden="true"><i /><i /><i /><i /><b>VRUUM!</b></span>}</>;
  const goalCard = <section aria-labelledby="meta" className="card stack goal-card" style={{ gap: 6 }}><div className="between"><h2 id="meta" className="h2" style={{ fontSize: 17 }}>Meta da coleção</h2><span className="mono">conta-giros</span></div>{items ? <Gauge units={units} /> : <div className="spinner" />}</section>;
  if (mobile) return (
    <main className="page" style={{ gap: 32 }}>
      <section className="m-hero force-dark" aria-label="Resumo">
        <button type="button" className={"pic rev-target" + (car.revs ? " revving" : "")} key={"m" + car.revs} onClick={car.rev} aria-label="Acelerar o carro"><TrackCar mode={car.revs ? "rev" : "enter"} />{revFx}</button>
        <div className="body">
          <div className="stack" style={{ gap: 4 }}>
            <span style={{ fontSize: 15, color: 'var(--t2)', fontWeight: 500 }}>{greet()}, {user.name.split(' ')[0]}</span>
            <h1 className="m-title">Sua garagem</h1>
          </div>
          <dl className="m-stats">{stats.map(([l, v, hi]) => <div key={l}><dt>{l}</dt><dd style={hi ? { color: 'var(--hi)' } : undefined}>{v}</dd></div>)}</dl>
          <div className="m-pair">
            <Link className="btn primary" to="/escanear"><span className="ms" aria-hidden="true">photo_camera</span>Escanear</Link>
            <Link className="btn" to="/garagem"><span className="ms" aria-hidden="true">garage</span>Coleção</Link>
          </div>
        </div>
      </section>

      <div {...rise(1)}>{goalCard}</div>

      <section className="m-sec" aria-labelledby="atalhos">
        <h2 id="atalhos">Atalhos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {SHORTCUTS.map(([to, t, , icon, bg, fg, d]) => (
            <Link key={to} to={to} className="m-shortcut">
              <span className="ic" aria-hidden="true" style={{ background: bg, color: fg }}><span className="ms" style={{ fontSize: 22 }}>{icon}</span></span>
              <span><b>{t}</b><small>{d}</small></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="m-sec" aria-labelledby="ultimos">
        <div className="between"><h2 id="ultimos">Chegaram por último</h2><Link className="m-link" to="/garagem">Ver todas ({list.length})</Link></div>
        {items && !list.length && <div className="empty"><span className="muted">Sua garagem está vazia. Escaneie a primeira miniatura.</span></div>}
        {!!list.length && <div className="hscroll">{list.slice(0, 6).map(i => (
          <Link key={i.id} to={'/garagem?car=' + i.id} className="m-recent">
            <span style={{ position: 'relative', display: 'block' }}><CarPhoto item={i} num={false} label="Sem foto" />{i.scale && <span className="m-tag">{i.scale}</span>}</span>
            <span className="stack" style={{ gap: 4, padding: 14 }}>
              <span className="mono" style={{ fontSize: 11 }}>{i.brand}</span>
              <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{i.model}</span>
              <span className="between" style={{ alignItems: 'baseline', gap: 8, marginTop: 4, flexWrap: 'nowrap' }}><span style={{ fontSize: 13, color: 'var(--t2)' }}>{[i.year, i.series].filter(Boolean).join(' · ') || '—'}</span><span style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{i.avg_price != null ? brl(i.avg_price) : ''}</span></span>
            </span>
          </Link>))}
        </div>}
      </section>

      <section className="m-sec" aria-labelledby="mira">
        <div className="between"><h2 id="mira">Na mira</h2><Link className="m-link" to="/desejos">Ver lista</Link></div>
        {wishes && !wish.length ? <span className="muted" style={{ fontSize: 14 }}>Nenhuma miniatura na mira ainda.</span>
          : <ul className="m-list m-box">{wish.slice(0, 3).map(w => (
            <li key={w.id}>
              <span className="q" aria-hidden="true" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, border: '1.5px dashed var(--k8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontWeight: 700 }}>?</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{w.model}</span><span style={{ fontSize: 13, color: 'var(--t3)' }}>{[w.brand, w.scale].filter(Boolean).join(' · ')}</span></span>
              <Link className="pbtn" style={{ flexShrink: 0, borderColor: 'var(--k7)', fontSize: 13 }} to="/cadastro" state={{ form: { brand: w.brand, model: w.model, year: w.year || '', series: w.series || '', scale: w.scale || '' } }}>Encontrei</Link>
            </li>))}
          </ul>}
      </section>

      <section className="m-sec" aria-labelledby="marca">
        <div className="between"><h2 id="marca">Por marca</h2><Link className="m-link" to="/numeros">Ver números</Link></div>
        {items && !brands.length ? <span className="muted" style={{ fontSize: 14 }}>Os números aparecem quando você cadastrar miniaturas.</span>
          : <div className="m-box stack" style={{ padding: '18px 16px' }}>{brands.map(([b, n]) => (
            <div key={b} className="bar-row"><div style={{ fontSize: 14 }}><span>{b}</span><span>{n}</span></div><div className="progress"><span style={{ width: Math.round(n / brands[0][1] * 100) + '%' }} /></div></div>
          ))}</div>}
      </section>
    </main>
  );
  return (
    <main className="page box">
      <section className="hero force-dark" ref={car.ref} onPointerMove={car.onMove} onPointerLeave={car.onLeave}>
        <div className="flag" aria-hidden="true" />
        <div className="copy">
          <div className="stack" style={{ gap: 8 }}>
            <span className="kicker">{greet()}, {user.name.split(' ')[0]} · Volta {units}</span>
            <h2>Sua garagem</h2>
          </div>
          <dl>{stats.map(([l, v, hi]) => <div key={l}><dt>{l}</dt><dd className={hi ? 'hi' : undefined}>{v}</dd></div>)}</dl>
          <div className="row">
            <Link className="btn primary" to="/escanear"><span className="ms" aria-hidden="true">center_focus_strong</span>Escanear miniatura</Link>
            <Link className="btn" to="/garagem"><span className="ms" aria-hidden="true">garage</span>Abrir garagem</Link>
          </div>
        </div>
        <button type="button" className={"art rev-target" + (car.revs ? " revving" : "")} key={"d" + car.revs} onClick={car.rev} aria-label="Acelerar o carro" title="Clique para acelerar">
          <div className="streak" style={{ left: '4%', top: '46%', width: 180, background: 'linear-gradient(90deg,transparent,var(--yel))' }} />
          <div className="streak" style={{ left: 0, top: '62%', width: 140, background: 'linear-gradient(90deg,transparent,#D7261E)', animationDelay: '.8s' }} />
          <div className="streak" style={{ left: '8%', top: '74%', width: 110, background: 'linear-gradient(90deg,transparent,var(--t0))', animationDelay: '1.5s' }} />
          <TrackCar mode={car.revs ? "rev" : "enter"} />
          {revFx}
        </button>
      </section>

      <section aria-labelledby="pit" className="stack rise" style={{ '--d': '.08s' }}>
        <h2 id="pit" className="h2">Pit stop rápido</h2>
        <div className="shortcuts">
          {SHORTCUTS.map(([to, t, d, icon, bg, fg]) => (
            <Link key={to} to={to} className="shortcut">
              <span className="ic" aria-hidden="true" style={{ background: bg, color: fg }}><span className="ms" style={{ fontSize: 24 }}>{icon}</span></span>
              <span style={{ minWidth: 0 }}><b>{t}</b><small>{d}</small></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="ult" className="stack rise" style={{ '--d': '.16s' }}>
        <div className="between">
          <h2 id="ult" className="h2">Últimas no box</h2>
          <Link className="btn sm" to="/garagem">Ver todas ({list.length})</Link>
        </div>
        {items && !list.length && <div className="empty"><span className="muted">Sua garagem está vazia. Escaneie a primeira miniatura.</span></div>}
        <div className="latest">
          {list.slice(0, 4).map(i => (
            <Link key={i.id} to={'/garagem?car=' + i.id} className="car tilt" onPointerMove={tilt} onPointerLeave={untilt}>
              <CarPhoto item={i} />
              <span className="info">
                <span className="mono">{i.brand}{i.scale ? ' · ' + i.scale : ''}</span>
                <span style={{ font: '800 15px Manrope,sans-serif', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{i.model}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--t2)' }}>{[i.year, i.series].filter(Boolean).join(' · ') || '—'}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="three rise" style={{ '--d': '.24s' }}>
        {goalCard}
        <section aria-labelledby="hmira" className="card stack" style={{ gap: 12 }}>
          <div className="between"><h2 id="hmira" className="h2" style={{ fontSize: 17 }}>Na mira</h2><Link className="link" to="/desejos">Ver lista</Link></div>
          {wishes && !wish.length && <span className="muted" style={{ fontSize: 14 }}>Nenhuma miniatura na mira ainda.</span>}
          {wish.slice(0, 3).map(w => (
            <div key={w.id} className="mini-row">
              <span className="q" aria-hidden="true">?</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14.5, fontWeight: 700 }}>{w.model}</span><span className="muted" style={{ fontSize: 12.5 }}>{[w.brand, w.scale].filter(Boolean).join(' · ')}</span></span>
            </div>
          ))}
        </section>
        <section aria-labelledby="htel" className="card stack" style={{ gap: 12 }}>
          <div className="between"><h2 id="htel" className="h2" style={{ fontSize: 17 }}>Telemetria por marca</h2><Link className="link" to="/numeros">Ver tudo</Link></div>
          {items && !brands.length && <span className="muted" style={{ fontSize: 14 }}>Os números aparecem quando você cadastrar miniaturas.</span>}
          {brands.map(([b, n]) => (
            <div key={b} className="stack" style={{ gap: 6 }}>
              <div className="between" style={{ fontSize: 13.5, fontWeight: 600 }}><span>{b}</span><span style={{ color: 'var(--t2)' }}>{n}</span></div>
              <div className="progress"><span style={{ width: Math.max(6, Math.round(n / brands[0][1] * 100)) + '%' }} /></div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
