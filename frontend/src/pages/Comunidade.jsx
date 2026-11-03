import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, fileUrl } from '../services/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { useAsync } from '../lib/useAsync.js';
import { LikeButton, FollowButton, withFollow } from '../components/Social.jsx';
import { shareLink } from '../components/CarDetails.jsx';
import { ago, colorOf, initial, meta } from '../lib/format.js';
const policyLabel = p => p === 'publico' ? 'Garagem aberta' : p === 'aprovacao' ? 'Seguir com aprovação' : 'Não aceita seguidores';
const userPath = h => '/u/' + encodeURIComponent(h);
const Avatar = ({ name, size = 42 }) => <span aria-hidden="true" style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', background: colorOf(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: size * .4 }}>{initial(name)}</span>;
function Person({ p, onChange }) {
  return (
    <li className="tile" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '12px 16px', padding: 18 }}>
      <Avatar name={p.name} size={52} />
      <Link to={userPath(p.handle)} style={{ flex: '1 1 220px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ fontSize: 16 }}>{p.name}</strong>
        <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{p.handle}{p.city ? ' · ' + p.city : ''}</span>
        {p.bio && <span style={{ fontSize: 14, color: 'var(--t1)', marginTop: 4 }}>{p.bio}</span>}
        {p.items != null && <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{p.items} miniaturas · {p.followers} seguidores</span>}
      </Link>
      <span className="stack" style={{ alignItems: 'flex-end', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>{policyLabel(p.follow_policy)}</span><FollowButton person={p} onChange={onChange} /></span>
    </li>
  );
}
function Post({ f, toast }) {
  const car = userPath(f.handle) + '/' + f.id, img = fileUrl(f.photo_url);
  return (
    <article className="post">
      <Link to={userPath(f.handle)} className="row" style={{ gap: 12, padding: '16px 18px', textDecoration: 'none', flexWrap: 'nowrap' }}>
        <Avatar name={f.owner_name} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: 14.5 }}><strong style={{ fontWeight: 800 }}>{f.owner_name}</strong> estacionou uma miniatura</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{ago(f.created_at)}</span></span>
      </Link>
      <Link to={car} className="media" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, padding: '0 18px', textDecoration: 'none' }}>
        <span className="ph" style={{ aspectRatio: '16/10', borderRadius: 14 }}>{img ? <img src={img} alt={f.model} /> : <span className="none">Sem foto</span>}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: 11 }}>{f.brand}</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{f.model}</span>
          <span style={{ fontSize: 13.5, color: 'var(--t2)' }}>{meta(f) || '—'}</span>
        </span>
      </Link>
      <div className="post-actions">
        <LikeButton type="item" id={f.id} liked={f.liked} count={f.likes} />
        <Link className="pbtn" to={car}><span className="ms" aria-hidden="true">chat_bubble</span>{f.comments}</Link>
        <button className="pbtn" onClick={() => shareLink(f.model, car, toast)}><span className="ms" aria-hidden="true">share</span>Compartilhar</button>
      </div>
    </article>
  );
}
export default function Comunidade() {
  const { user, setUser, goToLogin } = useAuth(), toast = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(user ? 'feed' : 'discover'), [q, setQ] = useState(params.get('q') || ''), [res, setRes] = useState(null);
  // Busca vinda do cabeçalho (?q=)
  useEffect(() => { if (params.has('q')) setQ(params.get('q')); }, [params]);
  // Visitante não tem feed, pedidos nem privacidade: só Descobrir e a busca
  const mineOnly = fn => () => user ? fn() : Promise.resolve(null);
  const feed = useAsync(mineOnly(api.social.feed), [!!user]), disc = useAsync(() => api.social.discover(), [!!user]), reqs = useAsync(mineOnly(api.social.requests), [!!user]), fol = useAsync(mineOnly(api.social.followers), [!!user]);
  const mine = useAsync(mineOnly(api.items.list), [!!user]);
  const tabs = user ? [['feed', 'Seguindo'], ['discover', 'Descobrir'], ['privacy', 'Privacidade' + (reqs.data?.length ? ' · ' + reqs.data.length : '')]] : [['discover', 'Garagens abertas']];
  useEffect(() => { if (!q.trim()) { setRes(null); return; } const t = setTimeout(() => api.social.search(q).then(setRes).catch(() => {}), 300); return () => clearTimeout(t); }, [q]);
  const upd = async d => { try { setUser(await api.updateMe(d)); } catch (e) { toast(e.message); } };
  const setFollow = (list, setList) => id => st => setList(list.map(x => x.id === id ? withFollow(x, st) : x));
  const stars = [...(disc.data || [])].sort((a, b) => (b.items || 0) - (a.items || 0)).slice(0, 4);
  const answer = async (r, ok) => { await api.social.answer(r.id, ok); reqs.setData(reqs.data.filter(x => x.id !== r.id)); if (ok) { fol.reload(); toast(r.name.split(' ')[0] + ' agora segue você'); } };
  return (
    <main className="page">
      <h1 className="m-title m-only">Comunidade</h1>
      <div className="paddock">
        <div className="stack" style={{ flex: '999 1 520px', gap: 18, minWidth: 0 }}>
          {!user && <p className="lead d-only">Veja as garagens que os colecionadores abriram ao público. Para seguir, curtir e comentar, crie sua conta.</p>}
          <div style={{ maxWidth: 520 }}>
            <label htmlFor="psearch" className="sr-only">Buscar colecionadores e miniaturas</label>
            <input id="psearch" className="input" style={{ minHeight: 44 }} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar colecionador, @usuário ou modelo" />
          </div>
          {res ? <div className="stack" aria-live="polite">
            <span className="muted" style={{ fontSize: 14 }}>{res.people.length + res.cars.length ? res.people.length + ' colecionadores · ' + res.cars.length + ' miniaturas' : 'Nada encontrado para “' + q + '”.'}</span>
            {!!res.people.length && <ul className="list">{res.people.map(p => <Person key={p.id} p={p} onChange={st => setRes({ ...res, people: res.people.map(x => x.id === p.id ? withFollow(x, st) : x) })} />)}</ul>}
            {!!res.cars.length && <div className="cars">{res.cars.map(c => (
              <Link key={c.id} to={userPath(c.handle) + '/' + c.id} className="car">
                <span className="ph">{fileUrl(c.photo_url) ? <img src={fileUrl(c.photo_url)} alt={c.model} /> : <span className="none">Sem foto</span>}</span>
                <span className="info"><span className="mono">{c.brand}</span><span className="name">{c.model}</span><span className="sub">de {c.owner_name}</span></span>
                <span className="foot"><span>♥ {c.likes}</span></span>
              </Link>))}
            </div>}
          </div> : <>
            <div className="seg" role="tablist" aria-label="Paddock">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
            {tab === 'feed' && user && <>
              {feed.data && !feed.data.length && <div className="empty"><b>Seu feed está vazio</b><span className="muted" style={{ fontSize: 14 }}>Siga colecionadores para ver as miniaturas que eles estacionam.</span><button className="btn xs primary" onClick={() => setTab('discover')}>Descobrir colecionadores</button></div>}
              {(feed.data || []).map(f => <Post key={f.id} f={f} toast={toast} />)}
            </>}
            {tab === 'discover' && disc.data && !disc.data.length && <div className="empty"><b>Nenhuma garagem aberta ainda</b></div>}
            {tab === 'discover' && <ul className="list">{(disc.data || []).map(p => <Person key={p.id} p={p} onChange={setFollow(disc.data, disc.setData)(p.id)} />)}</ul>}
            {tab === 'privacy' && user && <>
              <section className="card stack">
                <h2 className="h2" style={{ fontSize: 16 }}>Pedidos para seguir você</h2>
                {reqs.data && !reqs.data.length && <span className="muted" style={{ fontSize: 14 }}>Nenhum pedido pendente.</span>}
                {(reqs.data || []).map(r => (
                  <div key={r.id} className="row" style={{ gap: 12, padding: '10px 0', borderTop: '1px solid var(--k5)' }}>
                    <span className="av" aria-hidden="true">{initial(r.name)}</span>
                    <span style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.name}</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{r.handle}</span></span>
                    <button className="btn xs primary" style={{ minHeight: 38 }} onClick={() => answer(r, true)}>Aceitar</button>
                    <button className="btn xs soft" style={{ minHeight: 38 }} onClick={() => answer(r, false)}>Recusar</button>
                  </div>))}
              </section>
              <section className="card stack">
                <h2 className="h2" style={{ fontSize: 16 }}>Sua garagem</h2>
                <label className="box-row" style={{ cursor: 'pointer' }}><span className="stack" style={{ gap: 3, flex: '1 1 240px' }}><strong style={{ fontSize: 14.5 }}>Garagem visível para outros colecionadores</strong><span className="muted" style={{ fontSize: 13 }}>Desligado, só você vê suas miniaturas, curtidas e comentários.</span></span>
                  <input type="checkbox" role="switch" checked={!!user.garage_visible} onChange={e => upd({ garage_visible: e.target.checked })} style={{ width: 24, height: 24, accentColor: '#D7261E' }} /></label>
                <div className="stack" style={{ gap: 10 }}><strong style={{ fontSize: 14.5 }}>Quem pode seguir você</strong>
                  <div className="opts" role="radiogroup" aria-label="Quem pode seguir você" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
                    {[['publico', 'Qualquer pessoa', 'Quem quiser segue e vê sua garagem.'], ['aprovacao', 'Só com aprovação', 'Você aceita cada pedido antes.'], ['ninguem', 'Ninguém', 'Ninguém pode seguir você.']].map(([k, l, s]) => (
                      <button key={k} className="opt" role="radio" aria-checked={user.follow_policy === k} onClick={() => upd({ follow_policy: k })}><span className="dot" aria-hidden="true" /><span><b>{l}</b><small>{s}</small></span></button>
                    ))}
                  </div>
                </div>
              </section>
            </>}
          </>}
        </div>

        <aside className="stack" style={{ flex: '1 1 300px', maxWidth: '100%', position: 'sticky', top: 96, gap: 14 }}>
          {user ? <section className="side-card" aria-label="Meu perfil">
            <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{initial(user.name)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: 15.5, fontWeight: 800 }}>{user.name}</span><span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{user.handle} · {user.garage_visible ? 'garagem aberta' : 'garagem fechada'}</span></div>
            </div>
            <dl className="mini-stats">{[['miniaturas', mine.data?.length ?? '—'], ['seguidores', fol.data?.count ?? '—'], ['pedidos', reqs.data?.length ?? '—']].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl>
            <button className="btn light" style={{ minHeight: 44, borderRadius: 12, fontSize: 13.5, whiteSpace: 'nowrap', padding: '0 12px' }} onClick={() => shareLink('garagem de ' + user.name, userPath(user.handle), toast)}><span className="ms" aria-hidden="true">ios_share</span>Compartilhar minha garagem</button>
            {!user.garage_visible && <span className="muted" style={{ fontSize: 12.5 }}>Sua garagem está fechada: o link só funciona depois de abri-la em Privacidade.</span>}
          </section> : <section className="side-card" aria-label="Modo visitante">
            <span className="pill-tag">Modo visitante</span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--t1)' }}>Você está vendo a comunidade. Crie uma conta para montar sua garagem, seguir colecionadores, curtir e comentar.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn primary" style={{ minHeight: 48, borderRadius: 14, fontSize: 14.5 }} onClick={() => goToLogin('criar')}>Criar conta</button>
              <button className="btn" style={{ minHeight: 48, borderRadius: 14, fontSize: 14.5 }} onClick={() => goToLogin('entrar')}>Entrar</button>
            </div>
          </section>}
          {!!stars.length && <section className="m-sec m-only" aria-labelledby="mstars">
            <div className="between"><h2 id="mstars">Colecionadores estrela</h2><button className="m-link" onClick={() => { setQ(''); setTab('discover'); }}>Ver todos</button></div>
            <div className="hscroll" style={{ gap: 10 }}>{stars.map((p, i) => (
              <article key={p.id} className="m-star">
                <Link to={userPath(p.handle)} style={{ position: 'relative', textDecoration: 'none' }}><Avatar name={p.name} size={60} /><span className="rank">★ {i + 1}</span></Link>
                <Link to={userPath(p.handle)} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, width: '100%', textDecoration: 'none' }}><span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span><span style={{ fontSize: 12, color: 'var(--t2)' }}>{p.items ?? 0} miniaturas</span></Link>
                <FollowButton small person={p} onChange={setFollow(disc.data, disc.setData)(p.id)} />
              </article>))}
            </div>
          </section>}
          {!!stars.length && <section className="side-card d-only" aria-labelledby="stars" style={{ gap: 4 }}>
            <h2 id="stars" className="h2" style={{ fontSize: 16, marginBottom: 8 }}>Pilotos estrela</h2>
            {stars.map((p, i) => (
              <div key={p.id} className="row" style={{ gap: 10, padding: '8px 0', flexWrap: 'nowrap' }}>
                <Link to={userPath(p.handle)} style={{ position: 'relative', flexShrink: 0, textDecoration: 'none' }}><Avatar name={p.name} size={40} /><span className="rank">P{i + 1}</span></Link>
                <Link to={userPath(p.handle)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', textDecoration: 'none' }}><span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span><span style={{ fontSize: 12, color: 'var(--t3)' }}>{p.items ?? 0} miniaturas</span></Link>
                <FollowButton small person={p} onChange={setFollow(disc.data, disc.setData)(p.id)} />
              </div>
            ))}
          </section>}
        </aside>
      </div>
    </main>
  );
}
