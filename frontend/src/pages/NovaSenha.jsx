import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { AuthShell, Heading, PasswordField, MIN } from './Login.jsx';
// Aberta pelo link do e-mail: /redefinir-senha?token=...
export default function NovaSenha() {
  const [params] = useSearchParams(), token = params.get('token') || '';
  const nav = useNavigate(), toast = useToast(), { resetPassword, goToLogin } = useAuth();
  const [state, setState] = useState(token ? 'checking' : 'invalid'), [who, setWho] = useState(''), [err, setErr] = useState('');
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [tried, setTried] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (token) api.resetCheck(token).then(r => { setWho(r.email); setState('ok'); }).catch(e => { setErr(e.message); setState('invalid'); }); }, [token]);
  const pwErr = tried && pw.length < MIN ? `A senha precisa ter pelo menos ${MIN} caracteres.` : '';
  const pw2Err = tried && !pwErr && pw !== pw2 ? 'As senhas não são iguais.' : '';
  const askAgain = () => { goToLogin('esqueci'); nav('/', { replace: true }); };
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (pw.length < MIN || pw !== pw2) { setTried(true); return; }
    setBusy(true);
    try { await resetPassword(token, pw); nav('/', { replace: true }); toast('Senha alterada. Você já está dentro.'); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return (
    <AuthShell>
      {state === 'checking' && <div className="spinner" role="status" aria-label="Conferindo o link" style={{ alignSelf: 'center', marginTop: 24 }} />}
      {state === 'invalid' && <>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,107,94,.14)', color: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ fontSize: 30 }}>link_off</span></span>
        <Heading title="Link inválido ou expirado" sub={(err || 'Este link não é válido.') + ' Cada link vale por 1 hora e só pode ser usado uma vez.'} />
        <button type="button" className="btn primary login-cta" onClick={askAgain}>Pedir um novo link</button>
        <button type="button" className="btn" style={{ minHeight: 52, borderRadius: 14 }} onClick={() => { goToLogin('entrar'); nav('/', { replace: true }); }}>Voltar para o login</button>
      </>}
      {state === 'ok' && <>
        <Heading title="Criar nova senha" sub={`Escolha a nova senha da conta ${who}. Depois disso você entra direto.`} />
        <form onSubmit={submit} noValidate className="stack" style={{ gap: 18 }}>
          <PasswordField label="Nova senha" value={pw} onChange={e => setPw(e.target.value)} error={pwErr} strict autoComplete="new-password" />
          <div className="login-field">
            <label htmlFor="password2">Repita a nova senha</label>
            <input id="password2" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} aria-invalid={!!pw2Err} className={pw2Err ? 'bad' : undefined} />
            {pw2Err && <span role="alert" className="msg bad">{pw2Err}</span>}
          </div>
          {err && <div role="alert" className="msg bad" style={{ fontSize: 14 }}>{err}</div>}
          <button type="submit" className="btn primary login-cta" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
          <p className="msg" style={{ margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Por segurança, quem estiver conectado com a senha antiga em outros aparelhos vai precisar entrar de novo.</p>
        </form>
      </>}
    </AuthShell>
  );
}
