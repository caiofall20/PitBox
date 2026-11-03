import { useEffect, useRef, useState } from 'react';
// Efeitos da tela inicial (Box): números que contam, conta-giros da meta, carro que acelera ao toque, cards com inclinação.
export const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Número que sobe de 0 até o valor (ease-out); format opcional (ex.: dinheiro)
export function CountUp({ value, format = v => Math.round(v).toLocaleString('pt-BR'), ms = 1000 }) {
  const [v, setV] = useState(calm() ? value : 0), from = useRef(0);
  useEffect(() => {
    if (calm()) { setV(value); return; }
    const start = performance.now(), a = from.current; let raf;
    const step = t => { const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3); setV(a + (value - a) * e); if (k < 1) raf = requestAnimationFrame(step); else from.current = value; };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(v)}</>;
}

// Metas da coleção: cada uma é uma "marcha"
const GOALS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500];
export function goalOf(units) {
  const i = GOALS.findIndex(g => units < g), gear = i < 0 ? GOALS.length : i;
  const next = GOALS[gear] ?? units, prev = gear ? GOALS[gear - 1] : 0;
  return { gear: gear + 1, next, prev, pct: next === prev ? 1 : (units - prev) / (next - prev) };
}

// Conta-giros: ponteiro vai de -120° a +120° conforme o progresso até a próxima meta
export function Gauge({ units }) {
  const { gear, next, pct } = goalOf(units);
  const ticks = Array.from({ length: 13 }, (_, i) => -120 + i * 20);
  const arc = (a0, a1, r) => { const p = a => [100 + Math.sin(a * Math.PI / 180) * r, 100 - Math.cos(a * Math.PI / 180) * r]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  return (
    <div className="gauge" style={{ '--to': (-120 + pct * 240) + 'deg' }}>
      <svg viewBox="0 0 200 150" aria-hidden="true">
        <path d={arc(-120, 120, 82)} className="g-track" />
        <path d={arc(60, 120, 82)} className="g-red" />
        <path d={arc(-120, 120, 82)} className="g-fill" pathLength="100" style={{ '--p': Math.max(1, pct * 100) }} />
        {ticks.map((a, i) => { const r = a * Math.PI / 180, big = i % 2 === 0; return <line key={a} x1={100 + Math.sin(r) * 70} y1={100 - Math.cos(r) * 70} x2={100 + Math.sin(r) * (big ? 60 : 64)} y2={100 - Math.cos(r) * (big ? 60 : 64)} className={big ? 'g-tick big' : 'g-tick'} />; })}
        <g className="g-needle"><path d="M97 100 L100 30 L103 100 Z" /></g>
        <circle cx="100" cy="100" r="9" className="g-hub" />
      </svg>
      <div className="g-read"><b>{gear}ª</b><small>marcha</small></div>
      <div className="g-meta"><span>{units >= next ? 'Todas as metas batidas!' : <>Faltam <b>{next - units}</b> para <b>{next}</b> miniaturas</>}</span></div>
    </div>
  );
}

// Inclina o card em 3D seguindo o mouse (só com mouse fino)
export function tilt(e) {
  if (calm() || e.pointerType !== 'mouse') return;
  const el = e.currentTarget, r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
}
export const untilt = e => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };

// Carro do topo: acompanha o mouse e acelera ao clicar/tocar
export function useRev() {
  const [revs, setRevs] = useState(0), ref = useRef();
  const onMove = e => {
    if (calm() || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ref.current.style.setProperty('--px', (x * 26).toFixed(1) + 'px'); ref.current.style.setProperty('--py', (y * 16).toFixed(1) + 'px');
  };
  const onLeave = () => { ref.current?.style.setProperty('--px', '0px'); ref.current?.style.setProperty('--py', '0px'); };
  const rev = () => { if (calm()) return; setRevs(n => n + 1); try { navigator.vibrate?.([20, 30, 40]); } catch { /* sem vibração */ } };
  return { ref, revs, onMove, onLeave, rev };
}

// Mach 5 na pista (login-car.webp, 1600x948) com rodas animadas por cima.
// mode 'enter': chega vindo do fundo da pista e freia; 'rev': acelera no lugar (clique). Rodas: [cx, cy, rx, ry, inclinação]
const WHEELS = [[763, 723, 63, 84, -6], [1273, 557, 36, 63, -10]];
export function TrackCar({ mode }) {
  return (
    <div className={'track-car ' + mode}>
      <img src="/assets/login-car.webp" alt="" />
      <svg className="tc-wheels" viewBox="0 0 1600 948" aria-hidden="true">
        {WHEELS.map(([x, y, rx, ry, t]) => (
          <g key={x} transform={`translate(${x} ${y}) rotate(${t}) scale(${rx} ${ry})`}>
            <g className="tc-rim">
              <circle r="1" fill="#CFCFD6" stroke="#1E1E24" strokeWidth=".07" />
              <circle r=".86" fill="none" stroke="#9A9AA4" strokeWidth=".06" />
              {[0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5 - Math.PI / 2; return <ellipse key={i} cx={Math.cos(a) * .52} cy={Math.sin(a) * .52} rx=".2" ry=".24" fill="#26262C" transform={`rotate(${i * 72} ${Math.cos(a) * .52} ${Math.sin(a) * .52})`} />; })}
              <circle r=".2" fill="#8E8E98" stroke="#1E1E24" strokeWidth=".05" />
              <path d="M-.78 -.45 A.9 .9 0 0 1 .1 -.9" fill="none" stroke="#fff" strokeWidth=".08" strokeLinecap="round" opacity=".8" />
            </g>
          </g>
        ))}
      </svg>
      {mode === 'enter' && <span className="tc-lines" aria-hidden="true"><i /><i /><i /></span>}
    </div>
  );
}
