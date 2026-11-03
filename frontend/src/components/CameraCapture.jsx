import { useEffect, useRef, useState } from 'react';
// Câmera dentro do app (getUserMedia). Usada no lugar de <input capture>, que muitos navegadores
// ignoram (computador, alguns Android) e abrem a galeria. Devolve a foto como File (JPEG).
export const canCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && (typeof isSecureContext === 'undefined' || isSecureContext);

export default function CameraCapture({ title = 'Fotografar', hint, onShot, onCancel, onFail }) {
  const video = useRef(null), stream = useRef(null);
  const [facing, setFacing] = useState('environment'), [ready, setReady] = useState(false), [many, setMany] = useState(false), [flash, setFlash] = useState(false);
  useEffect(() => {
    let alive = true;
    setReady(false);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then(async s => {
        if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s; video.current.srcObject = s; await video.current.play().catch(() => {}); setReady(true);
        navigator.mediaDevices.enumerateDevices?.().then(d => alive && setMany(d.filter(x => x.kind === 'videoinput').length > 1)).catch(() => {});
      })
      .catch(e => onFail(e && e.name === 'NotAllowedError' ? 'Permita o uso da câmera para fotografar.' : 'Não foi possível abrir a câmera.'));
    return () => { alive = false; stream.current?.getTracks().forEach(t => t.stop()); };
  }, [facing]);
  useEffect(() => { const k = e => e.key === 'Escape' && onCancel(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const shoot = () => {
    const v = video.current; if (!v?.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setFlash(true); try { navigator.vibrate?.(30); } catch { /* sem vibração */ }
    c.toBlob(b => { if (b) onShot(new File([b], 'foto.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
  };
  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label={title}>
      <video ref={video} playsInline muted autoPlay className="cam-video" style={facing === 'user' ? { transform: 'scaleX(-1)' } : undefined} />
      <div className="cam-frame" aria-hidden="true" />
      {flash && <div className="cam-flash" onAnimationEnd={() => setFlash(false)} />}
      <div className="cam-top">
        <button className="cam-round" onClick={onCancel} aria-label="Fechar câmera"><span className="ms" aria-hidden="true">close</span></button>
        <span className="cam-title"><b>{title}</b>{hint && <small>{hint}</small>}</span>
        {many ? <button className="cam-round" onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')} aria-label="Trocar câmera"><span className="ms" aria-hidden="true">cameraswitch</span></button> : <span style={{ width: 44 }} />}
      </div>
      <div className="cam-bottom">
        <button className="cam-shutter" onClick={shoot} disabled={!ready} aria-label="Tirar foto"><i /></button>
      </div>
      {!ready && <span className="cam-wait" role="status">Abrindo a câmera…</span>}
    </div>
  );
}
