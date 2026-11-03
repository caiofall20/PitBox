import { useCallback, useEffect, useState } from 'react';
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true);
  const run = useCallback(() => { setLoading(true); setError(null); return fn().then(d => { setData(d); return d; }).catch(setError).finally(() => setLoading(false)); }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, setData, error, loading, reload: run };
}
