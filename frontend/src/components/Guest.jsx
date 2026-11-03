import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

// Convite para criar conta, aberto quando o visitante tenta algo que exige login
export function AccountInvite() {
  const { invite, closeInvite, goToLogin } = useAuth();
  const ref = useRef();
  useEffect(() => { const d = ref.current; if (!d) return; if (invite && !d.open) d.showModal(); if (!invite && d.open) d.close(); }, [invite]);
  return (
    <dialog ref={ref} className="invite card" onClose={closeInvite} aria-labelledby="invite-title">
      <div className="stack">
        <span className="chev" aria-hidden="true" />
        <h2 id="invite-title" className="h2">Crie sua conta</h2>
        <p style={{ margin: 0 }}>{invite}</p>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Com conta você monta sua garagem, escaneia miniaturas, segue colecionadores, curte e comenta.</p>
        <button className="btn primary" onClick={() => goToLogin('criar')}>Criar conta grátis</button>
        <button className="btn" onClick={() => goToLogin('entrar')}>Já tenho conta</button>
        <button className="link" style={{ alignSelf: 'center' }} onClick={closeInvite}>Continuar explorando</button>
      </div>
    </dialog>
  );
}

// Página no lugar das áreas pessoais (garagem, escanear, desejos...) para o visitante
export function NeedsAccount() {
  const { goToLogin } = useAuth();
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="empty">
        <span className="h2">Esta área é da sua garagem</span>
        <span className="muted">Crie uma conta grátis para guardar suas miniaturas, escanear cartelas e montar sua lista de desejos.</span>
        <button className="btn primary" onClick={() => goToLogin('criar')}>Criar conta grátis</button>
        <button className="link" onClick={() => goToLogin('entrar')}>Já tenho conta</button>
        <Link className="link" to="/comunidade">Continuar explorando garagens</Link>
      </div>
    </main>
  );
}

// Faixa fixa no topo enquanto navega como visitante
export function GuestBanner() {
  const { goToLogin } = useAuth();
  return (
    <div className="guest-banner" role="region" aria-label="Modo visitante">
      <span><strong>Modo visitante.</strong> Você está vendo garagens públicas.</span>
      <span className="row" style={{ gap: 6 }}>
        <button className="btn sm primary" onClick={() => goToLogin('criar')}>Criar conta</button>
        <button className="btn sm" onClick={() => goToLogin('entrar')}>Entrar</button>
      </span>
    </div>
  );
}
