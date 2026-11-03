import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
// Animações curtas de conclusão (uma por ação), no tema de corrida. O cadastro de miniatura tem a sua própria (Largada).
// Uso: const celebrate = useCelebrate(); celebrate('mira', { title, sub, onDone })
// Tipos: largada (conta criada) · mira (desejo) · verde (pode levar) · amarela (já tem) · pitstop (edição salva) · quadriculada (aprovado)
const Ctx = createContext(() => {});
const DUR = { largada: 2300, mira: 1700, verde: 1700, amarela: 1800, pitstop: 1600, quadriculada: 1800 };
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function Flag({ kind }) {
  // 6x4 quadrados ondulando por colunas
  const color = (c, r) => kind === 'quadriculada' ? ((c + r) % 2 ? '#141418' : '#FBFAF7') : kind === 'verde' ? ((c + r) % 2 ? '#1F9D55' : '#2BBE6A') : ((c + r) % 2 ? '#E8A800' : '#FFC93C');
  return (
    <div className="cel-flag" aria-hidden="true">
      <i className="cel-pole" />
      <div className="cel-cloth">{Array.from({ length: 6 }, (_, c) => (
        <span key={c} style={{ animationDelay: c * -0.09 + 's' }}>{Array.from({ length: 4 }, (_, r) => <b key={r} style={{ background: color(c, r) }} />)}</span>
      ))}</div>
    </div>
  );
}
const Art = ({ kind }) => {
  if (kind === 'largada') return <div className="cel-lights" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${0.15 + i * 0.22}s, 1.35s` }} />)}</div>;
  if (kind === 'mira') return <div className="cel-scope" aria-hidden="true"><i className="r1" /><i className="r2" /><i className="cross" /><i className="dot" /></div>;
  if (kind === 'pitstop') return <div className="cel-pit" aria-hidden="true"><span className="ms cel-wrench">build</span><span className="cel-bar"><i /></span></div>;
  return <Flag kind={kind} />;
};

export function CelebrateProvider({ children }) {
  const [cur, setCur] = useState(null), timer = useRef(), doneRef = useRef();
  const close = useCallback(() => { clearTimeout(timer.current); setCur(null); const d = doneRef.current; doneRef.current = null; d && d(); }, []);
  const celebrate = useCallback((kind, { title, sub, onDone } = {}) => {
    clearTimeout(timer.current); doneRef.current = onDone;
    setCur({ kind, title, sub, key: Date.now() });
    timer.current = setTimeout(close, reduced() ? 1200 : DUR[kind] || 1700);
  }, [close]);
  useEffect(() => { if (!cur) return; const k = e => (e.key === 'Escape' || e.key === 'Enter') && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [cur]);
  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {cur && (
        <div key={cur.key} className={'cel cel-' + cur.kind + (reduced() ? ' calm' : '')} onClick={close} role="status" aria-live="assertive">
          <div className="cel-glow" aria-hidden="true" />
          <Art kind={cur.kind} />
          <div className="cel-text"><b>{cur.title}</b>{cur.sub && <small>{cur.sub}</small>}</div>
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useCelebrate = () => useContext(Ctx);
