import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import { brl } from '../lib/format.js';
import { useMobile } from '../lib/useMobile.js';
const group = (list, k) => Object.entries(list.reduce((a, i) => { const key = i[k] || '—'; a[key] = (a[key] || 0) + i.qty; return a; }, {})).sort((a, b) => b[1] - a[1]);
const Bars = ({ rows, hi, mono }) => rows.slice(0, 8).map(([k, n]) => (
  <div key={k} className="bar-row">
    <div style={mono ? { fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 } : undefined}><span>{k}</span><span>{n}</span></div>
    <div className={'progress' + (hi ? ' hi' : '')}><span style={{ width: Math.max(6, Math.round(n / Math.max(1, rows[0][1]) * 100)) + '%' }} /></div>
  </div>
));
export default function Numeros() {
  const mobile = useMobile();
  const { data } = useAsync(() => api.items.list(), []);
  const list = data || [], units = list.reduce((a, i) => a + i.qty, 0), total = list.reduce((a, i) => a + (Number(i.avg_price) || 0) * i.qty, 0);
  const priced = list.filter(i => i.avg_price != null), punits = priced.reduce((a, i) => a + i.qty, 0);
  const brands = group(list, 'brand'), scales = group(list.filter(i => i.scale), 'scale'), series = group(list.filter(i => i.series), 'series');
  const top = (arr, f) => arr.length ? arr.reduce((a, b) => f(b) > f(a) ? b : a) : null;
  const priciest = top(priced, i => Number(i.avg_price)), oldest = top(list.filter(i => i.year), i => -i.year), newest = top(list, i => i.num);
  const highlights = [
    ['Mais cara', priciest, i => i.brand + ' · ' + brl(i.avg_price)],
    ['Modelo mais antigo', oldest, i => i.brand + ' · ' + i.year],
    ['Última a chegar', newest, i => [i.brand, i.series].filter(Boolean).join(' · ')],
  ];
  const kpis = [['directions_car', 'Miniaturas', units], ['payments', 'Investido', brl(total)], ['sell', 'Preço médio', brl(punits ? total / punits : 0)], ['factory', mobile ? 'Marcas' : 'Fabricantes', brands.length]];
  return (
    <main className="page" style={{ gap: 18 }}>
      <h1 className="m-title m-only" style={{ fontSize: 22 }}>Painel da coleção</h1>
      <dl className="stats">{kpis.map(([icon, l, v]) => <div key={l}><dt><span className="ms" aria-hidden="true">{icon}</span>{l}</dt><dd>{v}</dd></div>)}</dl>
      {data && !list.length && <div className="empty"><b>Sem números por enquanto</b><span className="muted">A telemetria aparece quando você cadastrar miniaturas.</span></div>}
      {!!list.length && <>
        <div className="two">
          <section className="card stack"><h2 className="h2" style={{ fontSize: 17 }}>Por fabricante</h2><Bars rows={brands} /></section>
          <div className="stack">
            <section className="card stack"><h2 className="h2" style={{ fontSize: 17 }}>Por escala</h2>{scales.length ? <Bars rows={scales} hi mono /> : <span className="muted" style={{ fontSize: 14 }}>Nenhuma escala informada.</span>}</section>
            <section className="card" style={{ display: 'flex', flexDirection: 'column', padding: '22px 22px 10px' }}>
              <h2 className="h2" style={{ fontSize: 17, margin: '0 0 6px' }}>Séries</h2>
              {series.length ? series.slice(0, 6).map(([s, n]) => <div key={s} className="between" style={{ padding: '11px 0', borderTop: '1px solid var(--k5)', fontSize: 14, flexWrap: 'nowrap' }}><span>{s}</span><span style={{ color: 'var(--t2)', fontWeight: 700 }}>{n}</span></div>) : <span className="muted" style={{ fontSize: 14, paddingBottom: 12 }}>Nenhuma série informada.</span>}
            </section>
          </div>
        </div>
        <h2 className="h2 m-only">Destaques</h2>
        <section className="hl-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {highlights.filter(([, i]) => i).map(([l, i, m]) => (
            <article key={l} className="tile">
              <span style={{ font: "500 11px 'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'var(--accent-text)', textTransform: 'uppercase' }}>{l}</span>
              <span style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{i.model}</span>
              <span style={{ fontSize: 13.5, color: 'var(--t2)' }}>{m(i)}</span>
            </article>
          ))}
        </section>
      </>}
    </main>
  );
}
