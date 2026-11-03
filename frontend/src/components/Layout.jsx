import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../services/api.js';
import { initial } from '../lib/format.js';
import { AccountInvite, GuestBanner } from './Guest.jsx';
// Pinturas do app: [chave, nome, cor A, cor B] (amostra em diagonal)
// Largada (preto/vermelho) é o padrão escuro; Relâmpago é o tema claro; Mascarado é escuro com amarelo
const THEMES = [['largada', 'Largada', '#0a0a0c', '#d7261e'], ['relampago', 'Relâmpago', '#ffffff', '#d7261e'], ['mascarado', 'Mascarado', '#f5b800', '#0a0a0c']];
export const DEFAULT_THEME = 'largada', THEME_KEY = 'pitbox-pintura';
const ROLES = { admin: 'Chefe de equipe · Admin', moderador: 'Comissário · Moderador', colecionador: 'Piloto · Colecionador' };
const TITLES = [['/garagem', 'Garagem', 'Suas miniaturas'], ['/escanear', 'Scanner', 'Escanear miniatura'], ['/cadastro', 'Cadastro', 'Cadastro manual'], ['/desejos', 'Na mira', 'Lista de desejos'], ['/numeros', 'Telemetria', 'Números da coleção'], ['/comunidade', 'Paddock', 'Comunidade'], ['/u/', 'Paddock', 'Garagem de colecionador'], ['/moderacao', 'Vistoria', 'Moderação do catálogo'], ['/usuarios', 'Pilotos', 'Usuários e permissões'], ['/mais', 'Mais', 'Atalhos e conta']];
const titleOf = path => path === '/' ? ['Box', 'Início'] : (TITLES.find(([p]) => path.startsWith(p)) || [, 'PitBox', '']).slice(1);
const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem storage */ } };
const Icon = ({ name, size, fill }) => <span className={'ms' + (fill ? ' fill' : '')} aria-hidden="true" style={size ? { fontSize: size } : undefined}>{name}</span>;

export default function Layout() {
  const { user, logout, goToLogin } = useAuth();
  const { pathname } = useLocation(), navigate = useNavigate();
  const [theme, setTheme] = useState(() => { const t = read(THEME_KEY, DEFAULT_THEME); return THEMES.some(([k]) => k === t) ? t : DEFAULT_THEME; });
  const [collapsed, setCollapsed] = useState(() => read('pitbox-side', '') === 'min');
  const [menu, setMenu] = useState(false), [sheet, setSheet] = useState(false);
  const [params, setParams] = useSearchParams();
  const [counts, setCounts] = useState({});
  const searchRef = useRef();
  useEffect(() => { save(THEME_KEY, theme); }, [theme]);
  useEffect(() => { save('pitbox-side', collapsed ? 'min' : ''); }, [collapsed]);
  const canMod = user?.role === 'moderador' || user?.role === 'admin', isAdmin = user?.role === 'admin';
  // Contadores do menu, atualizados a cada troca de tela (só para quem tem conta)
  useEffect(() => {
    if (!user) return;
    const set = (k, p) => p.then(v => setCounts(c => ({ ...c, [k]: v }))).catch(() => {});
    set('garagem', api.items.list().then(l => l.length));
    set('desejos', api.wishlist.list().then(l => l.length));
    set('comunidade', api.social.requests().then(l => l.length));
    if (canMod) set('moderacao', api.moderation.queue().then(d => d.models.length + d.photos.length));
    if (isAdmin) set('usuarios', api.users.list('').then(l => l.length));
  }, [user, pathname]);
  useEffect(() => { setMenu(false); setSheet(false); }, [pathname]);
  // Atalho "/" foca a busca
  useEffect(() => {
    const onKey = e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Visitante vê as áreas pessoais, mas elas levam ao convite para criar conta
  const groups = [
    { title: 'Minha coleção', items: [...(user ? [['/', 'Box', 'Início', 'home']] : []), ['/garagem', 'Garagem', 'Suas miniaturas', 'garage'], ['/desejos', 'Na mira', 'Lista de desejos', 'my_location'], ['/numeros', 'Telemetria', 'Números da coleção', 'monitoring']] },
    { title: 'Comunidade', items: [['/comunidade', 'Paddock', user ? 'Feed e colecionadores' : 'Explorar garagens', 'groups']] },
    ...(canMod ? [{ title: 'Direção de prova', items: [['/moderacao', 'Vistoria', 'Moderação do catálogo', 'verified'], ...(isAdmin ? [['/usuarios', 'Pilotos', 'Usuários e permissões', 'manage_accounts']] : [])] }] : []),
  ];
  // Barra inferior do celular; Escanear é o botão em destaque. Visitante não tem barra (só vê a Comunidade).
  const tabs = [['/', 'Início', 'home'], ['/garagem', 'Garagem', 'garage'], ['/escanear', 'Escanear', null], ['/desejos', 'Desejos', 'my_location'], ['/comunidade', 'Comunidade', 'groups']];
  const extras = [['/numeros', 'Painel da coleção', 'monitoring'], ...(canMod ? [['/moderacao', 'Vistoria', 'verified']] : []), ...(isAdmin ? [['/usuarios', 'Pilotos', 'manage_accounts']] : [])];
  const [title, hint] = titleOf(pathname);
  // Busca só na Garagem: filtra enquanto digita (o termo fica em ?q= e a página lê dali)
  const onGarage = pathname === '/garagem', query = onGarage ? params.get('q') || '' : '';
  const setQuery = v => { const p = new URLSearchParams(params); v ? p.set('q', v) : p.delete('q'); setParams(p, { replace: true }); };
  const name = user?.name || 'Visitante';
  // Sair volta para a tela de login na aba "Entrar"; a rota volta ao início para o próximo acesso
  const signOut = () => { navigate('/', { replace: true }); logout(); };

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')} data-theme={theme}>
      <aside className="side" aria-label="Menu">
        <div className="side-top">
          <Link to={user ? '/' : '/comunidade'} className="brand" aria-label="PitBox, ir para o início" title="Ir para o início"><span className="brand-mark" aria-hidden="true">P</span><span className="brand-name lbl">PITBOX</span></Link>
          {!collapsed && <button className="icon-btn" onClick={() => setCollapsed(true)} aria-label="Recolher menu" aria-expanded="true" title="Recolher menu"><Icon name="left_panel_close" /></button>}
        </div>
        {collapsed && <button className="icon-btn" style={{ alignSelf: 'center', marginTop: -10 }} onClick={() => setCollapsed(false)} aria-label="Expandir menu" aria-expanded="false" title="Expandir menu"><Icon name="left_panel_open" /></button>}
        <Link to="/escanear" className="scan-cta" title="Escanear miniatura" aria-current={pathname === '/escanear' ? 'page' : undefined}><Icon name="center_focus_strong" size={22} /><span className="lbl">Escanear miniatura</span></Link>
        <nav className="side-nav" aria-label="Principal">
          {groups.map(g => (
            <div key={g.title} className="nav-group">
              <span className="nav-title lbl">{g.title}</span>
              {g.items.map(([to, label, sub, icon]) => {
                const n = counts[to.slice(1) || 'box'];
                return (
                  <NavLink key={to} to={to} end={to === '/'} title={label + ' · ' + sub} className={({ isActive }) => 'nav' + (isActive ? ' active' : '')}>
                    {({ isActive }) => <>
                      <span className="bar" aria-hidden="true" />
                      <span className="ico" aria-hidden="true"><Icon name={icon} fill={isActive} /></span>
                      <span className="txt lbl"><b>{label}</b><small>{sub}</small></span>
                      {n ? <span className="count lbl">{n}</span> : null}
                    </>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="nav-title lbl" style={{ padding: 0 }}>Pintura</span>
            <div className="swatches" role="radiogroup" aria-label="Pintura do app">
              {THEMES.map(([k, l, a, b]) => <button key={k} className="swatch" role="radio" aria-checked={theme === k} aria-label={l} title={l} onClick={() => setTheme(k)} style={{ background: `linear-gradient(135deg,${a} 50%,${b} 50%)` }} />)}
            </div>
          </div>
          <button className="user-card" onClick={() => setMenu(m => !m)} aria-expanded={menu} title={name}>
            <span className="av" aria-hidden="true">{initial(name)}</span>
            <span className="who lbl"><b>{name}</b><small>{user ? ROLES[user.role] || user.role : 'Modo visitante · Sem conta'}</small></span>
          </button>
          {menu && (user
            ? <button className="user-action out" onClick={signOut}><Icon name="logout" size={18} /><span className="lbl">Sair da conta</span></button>
            : <>
              <button className="user-action" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', border: 0 }} onClick={() => goToLogin('criar')}><Icon name="person_add" size={18} /><span className="lbl">Criar conta</span></button>
              <button className="user-action" onClick={() => goToLogin('entrar')}><Icon name="login" size={18} /><span className="lbl">Entrar</span></button>
            </>)}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <Link to={user ? '/' : '/comunidade'} className="brand m-only" aria-label="PitBox, ir para o início"><span className="brand-mark" aria-hidden="true">P</span><span className="brand-name">PITBOX</span></Link>
          {user ? <button className="m-avatar m-only" onClick={() => setSheet(true)} aria-label="Abrir perfil">{initial(name)}</button>
            : <button className="m-enter m-only" onClick={() => goToLogin('entrar')}>Entrar</button>}
          <div className="title d-only"><strong>{title}</strong><span>{hint}</span></div>
          {onGarage && <form className="gsearch d-only" role="search" onSubmit={e => e.preventDefault()}>
            <label htmlFor="gsearch" className="sr-only">Buscar na garagem</label>
            <input id="gsearch" ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Escape' && setQuery('')} placeholder="Buscar modelo, marca ou série" />
            <Icon name="search" />
            <kbd>/</kbd>
          </form>}
        </header>
        {!user && <GuestBanner />}
        <Outlet />
      </div>
      {user && <nav className="tabs" aria-label="Principal">
        {tabs.map(([to, l, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (icon ? '' : 'fab ') + (isActive ? 'active' : '')}>
            {({ isActive }) => <>
              <span className="box" aria-hidden="true">{icon ? <Icon name={icon} fill={isActive} /> : <span className="fab-glyph"><i /><i /><i /><i /><i /></span>}</span>{l}
            </>}
          </NavLink>
        ))}
      </nav>}
      {sheet && user && <>
        <div className="sheet-bg" aria-hidden="true" onClick={() => setSheet(false)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Perfil">
          <span className="grip" aria-hidden="true" />
          <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
            <span className="av" aria-hidden="true" style={{ width: 52, height: 52, fontSize: 20 }}>{initial(name)}</span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 17, fontWeight: 800 }}>{name}</span><span style={{ fontSize: 13, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email} · {ROLES[user.role] || user.role}</span></div>
            <button className="round plain" style={{ width: 44, height: 44 }} onClick={() => setSheet(false)} aria-label="Fechar"><Icon name="close" /></button>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Pintura do app</span>
            <div role="radiogroup" aria-label="Pintura do app" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {THEMES.map(([k, l, a, b]) => <button key={k} className="theme-opt" role="radio" aria-checked={theme === k} onClick={() => setTheme(k)}><i aria-hidden="true" style={{ background: `linear-gradient(135deg,${a} 50%,${b} 50%)` }} />{l}</button>)}
            </div>
          </div>
          <nav className="rows" aria-label="Mais opções">{extras.map(([to, l, icon]) => (
            <Link key={to} to={to} className="nav" style={{ minHeight: 56, borderRadius: 0, borderTop: '1px solid var(--k5)' }}>
              <span className="ico" aria-hidden="true"><Icon name={icon} /></span><span className="txt"><b>{l}</b></span><Icon name="chevron_right" />
            </Link>))}
          </nav>
          <button className="btn danger" style={{ minHeight: 52, borderRadius: 14 }} onClick={signOut}><Icon name="logout" />Sair da conta</button>
        </div>
      </>}
      {!user && <AccountInvite />}
    </div>
  );
}
