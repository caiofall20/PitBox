import { createContext, useCallback, useContext, useRef, useState } from 'react';
const Ctx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null), t = useRef();
  const toast = useCallback(m => { clearTimeout(t.current); setMsg(m); t.current = setTimeout(() => setMsg(null), 3600); }, []);
  return <Ctx.Provider value={toast}>{children}<div className="toast-wrap" aria-live="polite">{msg && <div role="status" className="toast">{msg}</div>}</div></Ctx.Provider>;
}
export const useToast = () => useContext(Ctx);
