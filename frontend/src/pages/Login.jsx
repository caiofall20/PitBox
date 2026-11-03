import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../services/api.js';
import GoogleButton from '../components/GoogleButton.jsx';
import { TrackCar } from '../components/HomeFx.jsx';
import { useCelebrate } from '../lib/celebrate.jsx';
import { useMobile } from '../lib/useMobile.js';
export const MIN = 8; // o backend exige 8 caracteres no cadastro e na troca de senha
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Moldura das telas de acesso (login, nova senha), sempre no visual escuro.
// Celular: Mach 5 + marca no topo (PitBox Login). Desktop: fundo com grade e brilho, marca à esquerda e o formulário num cartão à direita.
export function AuthShell({ children }) {
  return (
    <div className="login" data-theme="largada">
      <div className="login-bg d-only" aria-hidden="true" />
      <aside className="login-side d-only">
        <div className="login-side-brand"><span className="brand-mark" aria-hidden="true">P</span><span className="brand-name">PITBOX</span></div>
        <div className="login-side-copy">
          <span className="login-chip"><i aria-hidden="true" />Garagem digital de miniaturas</span>
          <h2>Sua coleção<br />inteira <em>a<br />um toque</em></h2>
                  </div>
        <div className="login-side-art" aria-hidden="true"><TrackCar mode="enter" /></div>
      </aside>
      <main className="login-col">
        <header className="login-hero m-only">
          <TrackCar mode="enter" />
          <div className="login-brand">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span className="stack" style={{ gap: 2 }}><span className="name">PITBOX</span><span className="tag">Sua coleção de carrinhos, organizada</span></span>
          </div>
        </header>
        <section className="login-body">{children}</section>
      </main>
    </div>
  );
}
export const Heading = ({ title, sub }) => (
  <div className="stack" style={{ gap: 6 }}>
    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>{title}</h1>
    {sub && <p style={{ margin: 0, fontSize: 16, color: 'var(--t2)', lineHeight: 1.45 }}>{sub}</p>}
  </div>
);
// Campo de senha com Mostrar/Ocultar; "strict" mostra o contador até a senha mínima
export function PasswordField({ id = 'password', label = 'Senha', value, onChange, error, strict, autoComplete, aside }) {
  const [show, setShow] = useState(false), n = value.length;
  const msg = error || (strict && n > 0 && n < MIN ? `Faltam ${MIN - n} caracteres` : strict && n >= MIN ? 'Senha válida' : `Mínimo de ${MIN} caracteres`);
  return (
    <div className="login-field">
      <div className="between" style={{ alignItems: 'baseline' }}><label htmlFor={id}>{label}</label>{aside}</div>
      <div className="login-input pw">
        <span className="ms lead-ic" aria-hidden="true">lock</span>
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} placeholder="••••••••" value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={id + '-msg'} className={error ? 'bad' : undefined} />
        <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-pressed={show} aria-controls={id} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}><span className="ms" aria-hidden="true">{show ? 'visibility_off' : 'visibility'}</span><span className="m-only">{show ? 'Ocultar' : 'Mostrar'}</span></button>
      </div>
      <div className="pw-meta">
        <span className="pw-bar d-only" aria-hidden="true"><i style={{ width: Math.min(100, n / MIN * 100) + '%', background: n >= MIN ? 'var(--green)' : '#D7261E' }} /></span>
        <span id={id + '-msg'} role={error ? 'alert' : undefined} className={'msg' + (error ? ' bad' : '')} style={!error && strict && n >= MIN ? { color: 'var(--green)' } : undefined}>{msg}</span>
      </div>
    </div>
  );
}

// Boas-vindas do celular (PitBox Boas-vindas): primeira tela de quem abre o app sem conta
function Welcome({ onPick, onExplore }) {
  return (
    <div className="login" data-theme="largada">
      <main className="welcome" data-screen-label="Boas-vindas">
        <div className="welcome-pic">
          <TrackCar mode="enter" />
          <div className="glow" aria-hidden="true" />
          <div className="welcome-brand"><span className="brand-mark" aria-hidden="true">P</span><span className="brand-name">PITBOX</span></div>
        </div>
        <section className="welcome-body">
          <div className="welcome-copy">
            <h1>Sua coleção inteira a um toque</h1>
          </div>
          <div className="welcome-dots" aria-hidden="true"><i className="on" /><i /><i /></div>
          <div className="welcome-actions">
            <button className="pill red" onClick={() => onPick('criar')}>Começar agora<span className="ms" aria-hidden="true">arrow_forward</span></button>
            <button className="pill light" onClick={() => onPick('entrar')}>Já tenho conta</button>
            <button className="welcome-explore" onClick={onExplore}><span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>explore</span>Explorar sem conta</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Login() {
  const { login, register, explore, loginTab, loginAsked } = useAuth(), mobile = useMobile(), celebrate = useCelebrate();
  const [welcome, setWelcome] = useState(!loginAsked);
  // tab: 'entrar' | 'criar' | 'esqueci'
  const [tab, setTab] = useState(loginTab), [f, setF] = useState({ name: '', email: '', password: '' });
  const [tried, setTried] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const signup = tab === 'criar', forgot = tab === 'esqueci', n = f.password.length;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const nameErr = tried && signup && f.name.trim().length < 2 ? 'Informe seu nome.' : '';
  const mailErr = tried && !emailOk(f.email) ? (f.email ? 'Confira o formato do e-mail.' : 'Informe seu e-mail.') : '';
  const pwErr = tried && !forgot && (signup ? n < MIN : !n) ? (signup ? `A senha precisa ter pelo menos ${MIN} caracteres.` : 'Informe sua senha.') : '';
  const switchTab = k => { setTab(k); setTried(false); setErr(''); setSent(false); };
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (!emailOk(f.email) || (!forgot && (signup ? n < MIN || f.name.trim().length < 2 : !n))) { setTried(true); return; }
    setTried(false); setBusy(true);
    try {
      if (forgot) { await api.forgot(f.email); setSent(true); setBusy(false); return; }
      if (signup) { await register(f.name, f.email, f.password); celebrate('largada', { title: 'Largada!', sub: 'Sua garagem está pronta, ' + f.name.trim().split(' ')[0] + '.' }); }
      else await login(f.email, f.password);
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  const emailField = (
    <div className="login-field">
      <label htmlFor="email">E-mail</label>
      <div className="login-input"><span className="ms lead-ic" aria-hidden="true">mail</span><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={f.email} onChange={set('email')} aria-invalid={!!mailErr} aria-describedby="email-msg" className={mailErr ? 'bad' : undefined} autoFocus={forgot} /></div>
      {mailErr && <span id="email-msg" role="alert" className="msg bad">{mailErr}</span>}
    </div>
  );

  if (mobile && welcome) return <Welcome onExplore={explore} onPick={k => { switchTab(k); setWelcome(false); }} />;

  if (forgot) return (
    <AuthShell>
      {sent ? <>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(95,211,141,.14)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 30 }}>mark_email_read</span></span>
        <Heading title="Confira seu e-mail" sub={`Se existir uma conta com ${f.email}, você vai receber um link para criar uma nova senha. Ele vale por 1 hora.`} />
        <p className="msg" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Não chegou? Veja a caixa de spam ou peça de novo em 2 minutos.</p>
        <button type="button" className="btn primary login-cta" onClick={() => switchTab('entrar')}>Voltar para o login</button>
        <button type="button" className="btn" style={{ minHeight: 52, borderRadius: 14 }} onClick={() => setSent(false)}>Enviar de novo</button>
      </> : <>
        <button type="button" className="link" style={{ alignSelf: 'flex-start', color: 'var(--ink)', padding: 0, gap: 4 }} onClick={() => switchTab('entrar')}><span className="ms" aria-hidden="true">arrow_back</span>Voltar</button>
        <Heading title="Recuperar senha" sub="Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha." />
        <form onSubmit={submit} noValidate className="stack" style={{ gap: 18 }}>
          {emailField}
          {err && <div role="alert" className="msg bad" style={{ fontSize: 14 }}>{err}</div>}
          <button type="submit" className="btn primary login-cta" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
        </form>
      </>}
    </AuthShell>
  );

  return (
    <AuthShell>
      <div className="m-seg login-tabs" role="tablist" aria-label="Acesso">
        {[['entrar', 'Entrar'], ['criar', 'Criar conta']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}>{l}</button>)}
      </div>
      <Heading title={signup ? 'Monte sua garagem' : 'Bem-vindo de volta'} sub={signup ? 'Crie uma conta para catalogar e acompanhar seus carrinhos.' : 'Entre para ver sua coleção.'} />
      <form onSubmit={submit} noValidate className="stack" style={{ gap: 18 }}>
        {signup && <div className="login-field">
          <label htmlFor="name">Nome</label>
          <div className="login-input"><span className="ms lead-ic" aria-hidden="true">person</span><input id="name" autoComplete="name" placeholder="Como quer ser chamado" value={f.name} onChange={set('name')} aria-invalid={!!nameErr} className={nameErr ? 'bad' : undefined} /></div>
          {nameErr && <span role="alert" className="msg bad">{nameErr}</span>}
        </div>}
        {emailField}
        <PasswordField value={f.password} onChange={set('password')} error={pwErr} strict={signup} autoComplete={signup ? 'new-password' : 'current-password'}
          aside={!signup && <a href="#" onClick={e => { e.preventDefault(); switchTab('esqueci'); }} className="forgot">Esqueci a senha</a>} />
        {err && <div role="alert" className="msg bad" style={{ fontSize: 14 }}>{err}</div>}
        <button type="submit" className="btn primary login-cta" disabled={busy}>{busy ? (signup ? 'Criando conta…' : 'Entrando…') : signup ? 'Criar conta' : 'Entrar'}<span className="ms d-only" aria-hidden="true">arrow_forward</span></button>
        {signup && <p style={{ margin: 0, fontSize: 13, color: 'var(--t3)', lineHeight: 1.5, textAlign: 'center' }}>Ao criar a conta você concorda com os <strong style={{ color: 'var(--t1)' }}>Termos de uso</strong> e a <strong style={{ color: 'var(--t1)' }}>Política de privacidade</strong>.</p>}
      </form>
      <div className="stack" style={{ gap: 16, marginTop: 'auto' }}>
        <div className="login-or"><i />ou<i /></div>
        <GoogleButton signup={signup} onError={setErr} />
        <button type="button" className="btn login-alt" onClick={explore}><span className="ms" aria-hidden="true">explore</span>Explorar sem conta</button>
      </div>
    </AuthShell>
  );
}
