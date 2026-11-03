import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { initial } from '../lib/format.js';
export default function Mais() {
  const { user, logout } = useAuth(), nav = useNavigate();
  const links = [['/desejos', 'Na mira', 'Lista de desejos', 'my_location'], ['/numeros', 'Telemetria', 'Números da coleção', 'monitoring'], ['/escanear?modo=verificar', 'Já tenho essa?', 'Confira antes de comprar', 'fact_check'], ['/cadastro', 'Cadastro manual', 'Digite os dados sem foto', 'edit_note'],
    ...(user.role !== 'colecionador' ? [['/moderacao', 'Vistoria', 'Moderação do catálogo', 'verified']] : []), ...(user.role === 'admin' ? [['/usuarios', 'Pilotos', 'Usuários e permissões', 'manage_accounts']] : [])];
  return (
    <main className="page" style={{ maxWidth: 600 }}>
      <div className="side-card" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <span className="av" aria-hidden="true" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>{initial(user.name)}</span>
        <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{user.name}</strong><span className="muted" style={{ fontSize: 13 }}>{user.handle} · {user.role}</span></span>
      </div>
      <nav className="rows" aria-label="Mais opções">{links.map(([to, l, s, icon]) => (
        <Link key={to} to={to} className="nav" style={{ minHeight: 60, borderRadius: 0, borderTop: '1px solid var(--k5)' }}>
          <span className="ico" aria-hidden="true"><span className="ms">{icon}</span></span>
          <span className="txt"><b>{l}</b><small>{s}</small></span>
          <span className="ms" aria-hidden="true" style={{ color: 'var(--t4)' }}>chevron_right</span>
        </Link>))}
      </nav>
      <button className="btn danger" onClick={() => { nav('/', { replace: true }); logout(); }}><span className="ms" aria-hidden="true">logout</span>Sair da conta</button>
    </main>
  );
}
