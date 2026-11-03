import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../lib/auth.jsx';
// Botão oficial "Continuar com Google" (Google Identity Services). Só aparece se a API tiver GOOGLE_CLIENT_ID.
let config, script;
const loadConfig = () => config ||= api.authConfig().catch(() => ({}));
const loadScript = () => script ||= new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = ok; s.onerror = () => { script = null; fail(); };
  document.head.appendChild(s);
});
export default function GoogleButton({ signup, onError }) {
  const { googleLogin } = useAuth();
  const box = useRef(), [state, setState] = useState('loading');
  useEffect(() => {
    let alive = true;
    (async () => {
      const { googleClientId } = await loadConfig();
      if (!googleClientId) { alive && setState('off'); return; }
      try { await loadScript(); } catch { alive && setState('off'); return; }
      if (!alive || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId, ux_mode: 'popup', context: signup ? 'signup' : 'signin',
        callback: async ({ credential }) => { setState('busy'); try { await googleLogin(credential); } catch (e) { onError(e.message); setState('ready'); } },
      });
      window.google.accounts.id.renderButton(box.current, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: signup ? 'signup_with' : 'continue_with', logo_alignment: 'center', locale: 'pt-BR', width: Math.min(400, box.current.offsetWidth || 340) });
      setState('ready');
    })();
    return () => { alive = false; };
  }, [signup]);
  if (state === 'off') return null;
  return (
    <div className="google-btn" aria-busy={state !== 'ready'}>
      <div ref={box} style={{ opacity: state === 'ready' ? 1 : 0.4, pointerEvents: state === 'ready' ? 'auto' : 'none' }} />
      {state === 'busy' && <span className="msg" role="status">Entrando com Google…</span>}
    </div>
  );
}
