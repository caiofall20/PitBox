import { useEffect, useRef, useState } from 'react';
import { engine } from '../services/scan/engine.js';
const ASPECTS = [['livre', 'Livre', 0], ['16:10', '16:10', 1.6], ['1:1', '1:1', 1], ['3:4', '3:4', 0.75]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Editor de foto: endireita automaticamente, gira 90° e corta. Devolve dataURL JPEG.
export default function PhotoEditor({ source, onDone, onCancel }) {
  const [rot, setRot] = useState(0), [aspect, setAspect] = useState('livre'), [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [view, setView] = useState(null), [note, setNote] = useState('Verificando se a foto está de pé…');
  const img = useRef(null), canvas = useRef(null), box = useRef(null), drag = useRef(null), touched = useRef(false);
  const render = r => { const c = engine.rotCanvas(img.current, r, 1600); canvas.current = c; setView(c.toDataURL('image/jpeg', .9)); setCrop(fit(aspect, c)); };
  const fit = (k, c = canvas.current) => { const A = ASPECTS.find(a => a[0] === k)[2]; if (!A || !c) return { x: 0, y: 0, w: 1, h: 1 }; let w = 1, h = 1; if (c.width / c.height > A) w = A * c.height / c.width; else h = c.width / (A * c.height); return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }; };
  useEffect(() => {
    let alive = true, done = () => {};
    engine.loadImg(source).then(l => {
      if (!alive) return; img.current = l.img; done = l.done; render(0);
      engine.ocr().then(() => engine.detectRot(l.img)).then(r => { if (!alive) return; if (r && !touched.current) { setRot(r); render(r); setNote('Endireitamos a foto automaticamente. Gire se precisar.'); } else setNote(null); }).catch(() => alive && setNote(null));
    });
    return () => { alive = false; done(); };
  }, [source]);
  const rotate = d => { touched.current = true; setNote(null); const r = (rot + d + 4) % 4; setRot(r); render(r); };
  const down = (mode, corner) => e => {
    e.preventDefault(); e.stopPropagation();
    const rc = box.current.getBoundingClientRect();
    drag.current = { mode, corner, x0: e.clientX, y0: e.clientY, c0: { ...crop }, rw: rc.width, rh: rc.height };
    const move = ev => {
      const d = drag.current; if (!d) return;
      const dx = (ev.clientX - d.x0) / d.rw, dy = (ev.clientY - d.y0) / d.rh, MIN = .1;
      let { x, y, w, h } = d.c0;
      if (d.mode === 'move') { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); }
      else {
        const Lf = d.corner.includes('l'), T = d.corner.includes('t');
        let x1 = x, y1 = y, x2 = x + w, y2 = y + h;
        if (Lf) x1 = clamp(x1 + dx, 0, x2 - MIN); else x2 = clamp(x2 + dx, x1 + MIN, 1);
        if (T) y1 = clamp(y1 + dy, 0, y2 - MIN); else y2 = clamp(y2 + dy, y1 + MIN, 1);
        x = x1; y = y1; w = x2 - x1; h = y2 - y1;
        const A = ASPECTS.find(a => a[0] === aspect)[2], c = canvas.current;
        if (A && c) { let nh = w * c.width / (A * c.height); if (nh > 1) { nh = 1; w = A * c.height / c.width; } h = nh; y = T ? y2 - h : y1; if (Lf) x = x2 - w; x = clamp(x, 0, 1 - w); y = clamp(y, 0, 1 - h); }
      }
      setCrop({ x, y, w, h });
    };
    const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const apply = () => {
    const c = canvas.current; if (!c) return;
    const sx = crop.x * c.width, sy = crop.y * c.height, sw = crop.w * c.width, sh = crop.h * c.height, k = Math.min(1, 1200 / Math.max(sw, sh));
    const o = document.createElement('canvas'); o.width = Math.round(sw * k); o.height = Math.round(sh * k);
    o.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height);
    onDone(o.toDataURL('image/jpeg', .85));
  };
  const pct = v => v * 100 + '%';
  const TB = { minHeight: 46, padding: '0 16px', border: '2px solid rgba(255,255,255,.35)', borderRadius: 999, background: 'transparent', color: '#fff', fontWeight: 800, cursor: 'pointer' };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Ajustar foto">
      <div className="between" style={{ alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <span style={{ fontFamily: "'Michroma',sans-serif", textTransform: 'uppercase' }}>Ajustar foto</span>
        <button style={TB} onClick={onCancel}>Cancelar</button>
      </div>
      {note && <div role="status" style={{ padding: '10px 18px', background: 'rgba(246,194,26,.14)', color: '#ffe08a', fontWeight: 600, textAlign: 'center' }}>{note}</div>}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div ref={box} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', lineHeight: 0, touchAction: 'none', userSelect: 'none' }}>
          {view ? <img src={view} alt="Foto em edição" draggable={false} style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 260px)', pointerEvents: 'none' }} /> : <div className="spinner" />}
          {view && <div onPointerDown={down('move')} style={{ position: 'absolute', left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h), boxShadow: '0 0 0 9999px rgba(0,0,0,.6)', outline: '2px solid #fff', cursor: 'move', touchAction: 'none' }}>
            {[['tl', 0, 0], ['tr', 1, 0], ['bl', 0, 1], ['br', 1, 1]].map(([k, l, t]) => (
              <span key={k} onPointerDown={down('corner', k)} style={{ position: 'absolute', left: pct(l), top: pct(t), width: 44, height: 44, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', border: '3px solid var(--accent)' }} />
              </span>
            ))}
          </div>}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', padding: '14px 18px 20px', borderTop: '1px solid rgba(255,255,255,.12)' }}>
        <button style={TB} onClick={() => rotate(-1)} aria-label="Girar para a esquerda">↺ Girar</button>
        <button style={TB} onClick={() => rotate(1)} aria-label="Girar para a direita">↻ Girar</button>
        <div role="radiogroup" aria-label="Proporção" className="row" style={{ gap: 2, padding: 3, borderRadius: 999, border: '2px solid rgba(255,255,255,.35)' }}>
          {ASPECTS.map(([k, l]) => <button key={k} role="radio" aria-checked={aspect === k} onClick={() => { setAspect(k); setCrop(fit(k)); }} style={{ minHeight: 40, padding: '0 12px', border: 'none', borderRadius: 999, background: aspect === k ? '#fff' : 'transparent', color: aspect === k ? '#111' : '#fff', fontWeight: 800, cursor: 'pointer' }}>{l}</button>)}
        </div>
        <button className="btn primary" onClick={apply}>Aplicar</button>
      </div>
    </div>
  );
}
