import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import Photo from '../components/Photo.jsx';
import { LikeButton, Comments } from '../components/Social.jsx';
import { ago, colorOf, initial, meta, pad2 } from '../lib/format.js';
import { norm } from '../core/text.js';
export default function CarroDeOutro() {
  const { handle, carId } = useParams(), toast = useToast(), { user, askAccount } = useAuth();
  const { data: c, error } = useAsync(() => api.social.item(carId), [carId]);
  // Visitante não tem garagem nem desejos para comparar
  const mine = useAsync(() => user ? api.items.list() : Promise.resolve([]), [!!user]), wish = useAsync(() => user ? api.wishlist.list() : Promise.resolve([]), [!!user]);
  if (error) return <main className="page"><div className="empty">Miniatura indisponível.{!user && <span className="muted">Visitantes só veem garagens abertas ao público.</span>}</div></main>;
  if (!c) return <main className="page"><div className="spinner" /></main>;
  const match = (mine.data || []).find(i => norm(i.model) === norm(c.model) && norm(i.brand) === norm(c.brand));
  const inWish = (wish.data || []).some(w => norm(w.model) === norm(c.model) && norm(w.brand) === norm(c.brand));
  const addWish = async () => { if (!user) return askAccount('Crie uma conta para guardar ' + c.model + ' na sua lista de desejos.'); try { const w = await api.wishlist.add(c); wish.setData([w, ...(wish.data || [])]); toast(c.model + ' foi para os seus desejos'); } catch (e) { toast(e.message); } };
  return (
    <main className="page" style={{ maxWidth: 1140 }}>
      <Link to={'/u/' + encodeURIComponent(handle)} className="link" style={{ alignSelf: 'flex-start' }}>← Garagem de {c.owner_name.split(' ')[0]}</Link>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28, alignItems: 'start' }}>
        <Photo src={c.photo_url} radius={24} alt={c.model} />
        <div className="panel stack">
          <span className="mono" style={{ opacity: .7 }}>{c.brand}</span>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.15 }}>{c.model}</h1>
          <span style={{ opacity: .75 }}>{meta(c)}</span>
          <Link to={'/u/' + encodeURIComponent(handle)} className="row" style={{ textDecoration: 'none', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.14)' }}><span className="avatar" aria-hidden="true" style={{ width: 36, height: 36, background: colorOf(c.owner_name) }}>{initial(c.owner_name)}</span><span>Da garagem de <strong>{c.owner_name}</strong> · {ago(c.created_at)}</span></Link>
          <div className="between" style={{ alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,.55)' }}>
            <strong style={{ fontSize: 14 }}>{!user ? 'Tem esta miniatura? Crie sua garagem.' : match ? 'Você também tem esta (Nº ' + pad2(match.num) + ').' : inWish ? 'Já está nos seus desejos.' : 'Você ainda não tem esta miniatura.'}</strong>
            {!match && !inWish && <button className="btn sm" onClick={addWish}>Adicionar aos desejos</button>}
          </div>
          <LikeButton type="item" id={c.id} liked={c.liked} count={c.likes} />
        </div>
      </div>
      <Comments type="item" id={c.id} title="Curtidas e comentários" />
    </main>
  );
}
