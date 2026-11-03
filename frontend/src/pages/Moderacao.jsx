import { useState } from 'react';
import { useAsync } from '../lib/useAsync.js';
import { api, fileUrl } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { useCelebrate } from '../lib/celebrate.jsx';
import { ago } from '../lib/format.js';
export default function Moderacao() {
  const toast = useToast(), celebrate = useCelebrate();
  const { data, setData } = useAsync(() => api.moderation.queue(), []);
  const [tab, setTab] = useState('models');
  const list = data ? data[tab] : [];
  const act = async (x, action) => {
    try { await api.moderation.decide(tab === 'models' ? 'model' : 'photo', x.id, action); setData({ ...data, [tab]: data[tab].filter(y => y.id !== x.id) }); action === 'aprovar' ? celebrate('quadriculada', { title: 'Aprovado!', sub: x.model + ' entrou no catálogo' }) : toast(x.model + ' rejeitado'); }
    catch (e) { toast(e.message); }
  };
  return (
    <main className="page" style={{ gap: 20 }}>
      <p className="lead" style={{ maxWidth: '70ch' }}>Aprove modelos e fotos enviados pelos colecionadores antes de entrarem no catálogo compartilhado. Cada foto aprovada melhora o reconhecimento do scan.</p>
      <div className="seg" role="tablist" aria-label="Fila">{[['models', 'Modelos novos'], ['photos', 'Fotos novas']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l} · {data?.[k].length ?? 0}</button>)}</div>
      {data && !list.length && <div className="empty"><b>Bandeira verde</b><span className="muted" style={{ fontSize: 14 }}>Nada para revisar nesta fila.</span></div>}
      {list.map(x => {
        const img = fileUrl(x.photo || x.url);
        const fields = [['Marca', x.brand], ['Ano', x.year], ['Série', x.series], ['Escala', x.scale], ['Código do produto', x.toy_code]].filter(([, v]) => v);
        return (
          <article key={x.id} className="queue-item">
            <span className="ph">{img ? <img src={img} alt={x.model} /> : <span className="none">Sem foto</span>}</span>
            <div className="stack" style={{ minWidth: 0 }}>
              <div className="between" style={{ gap: 12 }}><span className="mono" style={{ fontSize: 11 }}>{tab === 'models' ? 'Modelo novo' : 'Foto nova'}{x.brand ? ' · ' + x.brand : ''}</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Enviado por {x.by || 'colecionador'} · {ago(x.created_at)}</span></div>
              <span style={{ fontSize: 20, fontWeight: 800, marginTop: -6 }}>{x.model}</span>
              {!!fields.length && <dl className="fields">{fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn xs primary" style={{ minHeight: 42, borderRadius: 11 }} onClick={() => act(x, 'aprovar')}><span className="ms" aria-hidden="true">check_circle</span>Aprovar no catálogo</button>
                <button className="btn xs soft danger" style={{ minHeight: 42, borderRadius: 11 }} onClick={() => act(x, 'rejeitar')}><span className="ms" aria-hidden="true">block</span>Rejeitar</button>
              </div>
            </div>
          </article>
        );
      })}
    </main>
  );
}
