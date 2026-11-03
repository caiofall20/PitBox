import { useEffect, useRef, useState } from 'react';
import { pad2 } from '../lib/format.js';
// Animação de "largada" depois de cadastrar uma miniatura, montada com quadros da abertura de Speed Racer
// (uso pessoal), sobre o fundo do PitBox: piloto pula no carro → arrancada → "Na garagem!".
// largada.webp = os 34 quadros reais da cena (18 fps, ampliados e sem o fundo), tocando uma vez.
// Toque/Esc pula; quem pede menos movimento vê só o cartão final.
const A = '/assets/largada/';
const FRAMES = ['largada'];
const TOTAL = 4500, REDUCED = 1800;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// espera as imagens (no máximo 1,5 s) para a animação não começar com quadros vazios
const preload = () => Promise.race([
  Promise.all(FRAMES.map(f => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = A + f + '.webp'; }))),
  new Promise(ok => setTimeout(ok, 1500)),
]);

export default function Largada({ item, onDone }) {
  const done = useRef(false), btn = useRef();
  const calm = reduced(), [go, setGo] = useState(calm);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };
  useEffect(() => {
    btn.current?.focus();
    let t, alive = true;
    (calm ? Promise.resolve() : preload()).then(() => { if (!alive) return; setGo(true); t = setTimeout(finish, calm ? REDUCED : TOTAL); });
    const onKey = e => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && finish();
    window.addEventListener('keydown', onKey);
    return () => { alive = false; clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, []);
  const num = item.num ? pad2(item.num) : '5';
  return (
    <div className={'largada' + (calm ? ' calm' : '') + (go ? ' go' : '')} onClick={finish} role="dialog" aria-modal="true" aria-label="Miniatura cadastrada">
      <div className="lg-bg" aria-hidden="true" />
      {!calm && <div aria-hidden="true">
        {/* piloto corre, pula no carro e arranca */}
        <div className="lg-scene lg-s2">
          <div className="lg-track" />
          <div className="lg-lines">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ top: 18 + i * 7 + '%', animationDelay: 2.5 + (i % 4) * 0.07 + 's', width: 16 + (i * 7) % 24 + '%' }} />)}</div>
          <div className="lg-stage">
            {/* a imagem só entra com .go, para a sequência começar do primeiro quadro */}
            <div className="lg-car">{go && <img src={A + 'largada.webp'} alt="" className="lg-seq" />}</div>
          </div>
        </div>
      </div>}
      <div className="lg-final" role="status" aria-live="assertive">
        <span className="lg-roundel">{num}</span>
        <span className="lg-title">Na garagem!</span>
        <span className="lg-model">{[item.brand, item.model].filter(Boolean).join(' · ')}</span>
        <span className="lg-brand"><i className="lg-flag" aria-hidden="true" />PITBOX<i className="lg-flag" aria-hidden="true" /></span>
      </div>
      <button ref={btn} className="lg-skip" onClick={e => { e.stopPropagation(); finish(); }}>{calm ? 'Continuar' : 'Pular'}</button>
    </div>
  );
}
