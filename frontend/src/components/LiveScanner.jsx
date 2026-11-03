import { useEffect, useRef, useState } from 'react';
import { engine } from '../services/scan/engine.js';
import { norm } from '../core/text.js';
// Lê o verso da cartela continuamente pela câmera (exige HTTPS fora do localhost)
export default function LiveScanner({ onResult, onCancel, onError }) {
  const video = useRef(null), [msg, setMsg] = useState('Abrindo a câmera…'), [acc, setAcc] = useState(null);
  useEffect(() => {
    let alive = true, stream, timer, reads = 0, last = null;
    (async () => {
      try {
        const ocrP = engine.ocr();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (!alive) return;
        video.current.srcObject = stream; await video.current.play().catch(() => {});
        setMsg('Preparando o leitor…'); await ocrP; if (!alive) return;
        setMsg('Aponte para o verso da cartela');
        const tick = async () => {
          if (!alive) return;
          const v = video.current;
          if (v && v.videoWidth) {
            const sw = v.videoWidth * .88, sh = v.videoHeight * .92, k = Math.min(1.6, 1500 / Math.max(sw, sh)), c = document.createElement('canvas');
            c.width = Math.round(sw * k); c.height = Math.round(sh * k);
            c.getContext('2d').drawImage(v, v.videoWidth * .06, v.videoHeight * .04, sw, sh, 0, 0, c.width, c.height);
            const { data } = await engine._worker.recognize(engine.prep(c));
            if (!alive) return;
            const p = engine.parseCard(data.text || ''), a = engine.mergeRead(last, p);
            if (p.fields.model || p.found.toy) reads++;
            const same = p.fields.model && last && last.fields.model && norm(p.fields.model) === norm(last.fields.model);
            last = a; setAcc(a);
            if ((a.hit && a.hit.byToy) || (a.fields.model && (a.found.toy || a.found.series) && (same || reads >= 3))) { try { navigator.vibrate?.([60, 40, 60]); } catch {} onResult(a); return; }
            setMsg(a.fields.model || a.found.toy ? 'Quase lá… segure firme' : 'Enquadre o verso inteiro, com boa luz');
          }
          timer = setTimeout(tick, 300);
        };
        tick();
      } catch (e) { onError(e && e.name === 'NotAllowedError' ? 'Permita o uso da câmera, ou use “Tirar foto”.' : 'Não foi possível abrir a câmera. Use “Tirar foto”.'); }
    })();
    return () => { alive = false; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, []);
  const chips = [['Código', acc?.found.toy], ['Marca', acc?.fields.brand], ['Modelo', acc?.fields.model], ['Série', acc?.found.series]];
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '3/4', borderRadius: 24, overflow: 'hidden', background: '#0b0b0d' }}>
        <video ref={video} playsInline muted autoPlay aria-label="Visão da câmera" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: '6% 8%', border: '3px solid ' + (acc?.fields.model ? '#f6c21a' : 'rgba(255,255,255,.9)'), borderRadius: 18, boxShadow: '0 0 0 9999px rgba(0,0,0,.42)' }} />
        <div role="status" style={{ position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)', maxWidth: 'calc(100% - 28px)', padding: '8px 14px', borderRadius: 999, background: 'rgba(0,0,0,.65)', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{msg}</div>
      </div>
      <ul className="row" style={{ listStyle: 'none', margin: 0, padding: 0, justifyContent: 'center' }}>
        {chips.map(([l, v]) => <li key={l} className="chip" style={v ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' } : null}>{l}: <strong>{v || '…'}</strong></li>)}
      </ul>
      <button className="btn" onClick={onCancel}>Cancelar</button>
    </div>
  );
}
