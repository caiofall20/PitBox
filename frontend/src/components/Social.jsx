import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ago, colorOf, initial } from '../lib/format.js';

export function LikeButton({ type, id, liked: l0, count: c0 }) {
  const [liked, setLiked] = useState(!!l0), [count, setCount] = useState(c0 || 0), [tick, setTick] = useState(0);
  const toast = useToast(), { user, askAccount } = useAuth();
  const toggle = async () => {
    if (!user) return askAccount('Crie uma conta para curtir ' + (type === 'garagem' ? 'esta garagem.' : 'esta miniatura.'));
    const nv = !liked; setLiked(nv); setCount(c => c + (nv ? 1 : -1)); setTick(t => t + 1);
    try { nv ? await api.social.like(type, id) : await api.social.unlike(type, id); } catch (e) { setLiked(!nv); setCount(c => c + (nv ? -1 : 1)); toast(e.message); }
  };
  return (
    <button onClick={toggle} aria-pressed={liked} aria-label={(liked ? 'Descurtir' : 'Curtir') + ', ' + count + ' curtidas'} className="pbtn">
      <span key={tick} className="ms" aria-hidden="true" style={{ animation: tick ? 'pbheartA .4s ease' : 'none' }}>favorite</span><span>{count}</span>
    </button>
  );
}

export function Comments({ type, id, title = 'Comentários' }) {
  const [list, setList] = useState(null), [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const toast = useToast(), { user, askAccount } = useAuth();
  useEffect(() => { api.social.comments(type, id).then(setList).catch(() => setList([])); }, [type, id]);
  const post = async e => {
    e.preventDefault(); if (!text.trim()) { toast('Escreva algo antes de publicar'); return; }
    setBusy(true);
    try { const c = await api.social.comment(type, id, text); setList(l => [...(l || []), c]); setText(''); } catch (er) { toast(er.message); } finally { setBusy(false); }
  };
  const remove = async c => { await api.social.removeComment(c.id); setList(l => l.filter(x => x.id !== c.id)); };
  return (
    <section className="card stack" aria-label={title}>
      <h2 className="h2">{title}</h2>
      {list && !list.length && <span className="muted">Nenhum comentário ainda. Seja o primeiro.</span>}
      <ul className="list">
        {(list || []).map(c => (
          <li key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="avatar" aria-hidden="true" style={{ width: 36, height: 36, background: colorOf(c.author), fontSize: 14 }}>{initial(c.author)}</span>
            <div style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
              <div className="row" style={{ gap: '2px 10px' }}><strong style={{ fontSize: 14 }}>{c.author}</strong><span className="muted" style={{ fontSize: 12 }}>{ago(c.created_at)}</span></div>
              <div style={{ fontSize: 15, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{c.text}</div>
              {c.mine && <button className="link" style={{ minHeight: 32, fontSize: 13 }} onClick={() => remove(c)}>Apagar</button>}
            </div>
          </li>
        ))}
      </ul>
      {user ? <form onSubmit={post} className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '1 1 240px' }}><span>Escreva um comentário</span><input className="input" value={text} onChange={e => setText(e.target.value)} maxLength={280} placeholder="Seja gentil com o colecionador" /></label>
        <button className="btn primary" disabled={busy}>Publicar</button>
      </form>
      : <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => askAccount('Crie uma conta para comentar.')}>Entrar para comentar</button>}
    </section>
  );
}

// Atualiza o status de seguir e o número de seguidores na hora (só "seguindo" conta; pedido pendente não)
export const withFollow = (p, st) => ({ ...p, follow: st, followers: Math.max(0, (p.followers || 0) + (st === 'seguindo' ? 1 : 0) - (p.follow === 'seguindo' ? 1 : 0)) });

export function FollowButton({ person, onChange, small }) {
  const toast = useToast(), { user, askAccount } = useAuth();
  const st = person.follow, priv = person.follow_policy === 'ninguem' && !st;
  const label = st === 'seguindo' ? 'Seguindo' : st === 'pendente' ? 'Pedido enviado' : priv ? 'Não aceita seguidores' : person.follow_policy === 'aprovacao' ? 'Pedir para seguir' : 'Seguir';
  const click = async () => {
    if (!user) return askAccount('Crie uma conta para seguir ' + person.name.split(' ')[0] + '.');
    try {
      if (st) { await api.social.unfollow(person.id); onChange(null); toast(st === 'pendente' ? 'Pedido cancelado' : 'Você deixou de seguir ' + person.name.split(' ')[0]); }
      else { const r = await api.social.follow(person.id); onChange(r.status); toast(r.status === 'seguindo' ? 'Agora você segue ' + person.name.split(' ')[0] : 'Pedido enviado. ' + person.name.split(' ')[0] + ' precisa aprovar.'); }
    } catch (e) { toast(e.message); }
  };
  return <button className={'btn sm ' + (st ? '' : 'primary')} style={small ? { minHeight: 34, padding: '0 12px', fontSize: 12, boxShadow: 'none' } : undefined} disabled={priv} aria-pressed={st === 'seguindo'} onClick={click}>{small && priv ? 'Fechada' : label}</button>;
}
