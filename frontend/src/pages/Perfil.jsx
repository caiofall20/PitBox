import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import CarCard from '../components/CarCard.jsx';
import { LikeButton, Comments, FollowButton, withFollow } from '../components/Social.jsx';
import { colorOf, initial } from '../lib/format.js';
import { useAuth } from '../lib/auth.jsx';
export default function Perfil() {
  const { handle } = useParams(), { user, goToLogin } = useAuth();
  const { data: p, setData, error, reload } = useAsync(() => api.social.profile(handle), [handle]);
  if (error) return <main className="page">{user ? <div className="empty">Colecionador não encontrado.</div>
    : <div className="empty"><span className="h2">Garagem indisponível</span><span className="muted">Esta garagem não está aberta ao público. Crie uma conta para pedir para seguir.</span><button className="btn primary" onClick={() => goToLogin('criar')}>Criar conta grátis</button></div>}</main>;
  if (!p) return <main className="page"><div className="spinner" /></main>;
  const first = p.name.split(' ')[0];
  return (
    <main className="page">
      <Link to="/comunidade" className="link" style={{ alignSelf: 'flex-start' }}>← {user ? 'Comunidade' : 'Explorar garagens'}</Link>
      <section className="panel row" style={{ gap: '18px 22px' }}>
        <span className="avatar" aria-hidden="true" style={{ width: 76, height: 76, fontSize: 29, background: colorOf(p.name) }}>{initial(p.name)}</span>
        <div className="stack" style={{ flex: '1 1 260px', gap: 6 }}><strong style={{ fontSize: 'clamp(22px,3vw,30px)' }}>{p.name}</strong><span style={{ opacity: .75 }}>{p.handle}{p.city ? ' · ' + p.city : ''}</span>{p.bio && <span>{p.bio}</span>}
          <span className="row" style={{ gap: '6px 18px' }}><span><strong>{p.item_count}</strong> miniaturas</span><span><strong>{p.followers}</strong> seguidores</span><span><strong>{p.following}</strong> seguindo</span></span></div>
        {p.follow !== 'eu' && <FollowButton person={p} onChange={st => { setData(withFollow(p, st)); reload(); }} />}
      </section>
      {!p.visible ? <div className="empty"><span className="h2">Garagem fechada</span><span className="muted">{p.follow_policy === 'ninguem' || !p.garage_visible ? first + ' mantém a garagem privada.' : p.follow === 'pendente' ? 'Pedido enviado. Assim que ' + first + ' aprovar, você vê a garagem.' : 'Peça para seguir. Quando ' + first + ' aprovar, a garagem aparece aqui.'}</span></div>
      : <>
        <div className="between"><h2 className="h2">Garagem de {first}</h2><LikeButton type="garagem" id={p.id} liked={p.liked} count={p.likes} /></div>
        <div className="grid">{p.items.map(i => <CarCard key={i.id} item={i} noPhoto="Sem foto" to={'/u/' + encodeURIComponent(p.handle) + '/' + i.id} footer={<><span>♥ {i.likes}</span><span>{i.comments} comentários</span></>} />)}</div>
        <Comments type="garagem" id={p.id} title="Sobre esta garagem" />
      </>}
    </main>
  );
}
