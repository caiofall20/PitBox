import { useEffect, useState } from 'react';
// Mesmo ponto de quebra do CSS: abaixo dele o app usa o layout de celular (PitBox Inicio)
const Q = '(max-width: 860px)';
export function useMobile() {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(Q).matches);
  useEffect(() => { const mq = matchMedia(Q), on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return m;
}
