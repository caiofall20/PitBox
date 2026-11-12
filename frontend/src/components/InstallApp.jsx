import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Chrome/Android: beforeinstallprompt. iOS: só via Compartilhar → Tela de Início (sem banner).
export default function InstallApp() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && isStandalone());
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const onBip = (e) => { e.preventDefault(); setDeferred(e); };
    const onDone = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onDone);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onDone);
    };
  }, []);

  if (installed) {
    return (
      <div className="side-card" style={{ gap: 6 }}>
        <strong>App instalado</strong>
        <span className="muted" style={{ fontSize: 13 }}>O Pitbox já está na sua tela inicial.</span>
      </div>
    );
  }

  if (deferred) {
    return (
      <button
        type="button"
        className="btn"
        onClick={async () => {
          deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          setDeferred(null);
        }}
      >
        <span className="ms" aria-hidden="true">install_mobile</span>
        Instalar app
      </button>
    );
  }

  if (isIos()) {
    return (
      <div className="side-card" style={{ gap: 8 }}>
        <strong>Instalar no iPhone</strong>
        <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
          No Safari: toque em <b>Compartilhar</b> <span aria-hidden="true">⬆️</span> e depois em <b>Adicionar à Tela de Início</b>.
        </span>
        <button type="button" className="link" onClick={() => setIosHint((v) => !v)}>
          {iosHint ? 'Ocultar dica' : 'Não encontrei essa opção'}
        </button>
        {iosHint && (
          <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
            Use o Safari (não o Chrome nem o Instagram/WhatsApp). Abra o site pela URL da Vercel e tente de novo.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="side-card" style={{ gap: 6 }}>
      <strong>Instalar app</strong>
      <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        No menu do navegador (⋮), escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. O aviso automático do Chrome quase não aparece mais.
      </span>
    </div>
  );
}
