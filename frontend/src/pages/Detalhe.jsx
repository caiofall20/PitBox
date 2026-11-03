import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAsync } from '../lib/useAsync.js';
import { api } from '../services/api.js';
import CarDetails, { numLabel } from '../components/CarDetails.jsx';
export default function Detalhe() {
  const { id } = useParams(), nav = useNavigate();
  const { data: it, setData, error } = useAsync(() => api.items.get(id), [id]);
  const { data: folders } = useAsync(() => api.folders.list(), []);
  if (error) return <main className="page"><div className="empty"><b>Miniatura não encontrada</b><Link className="link" to="/garagem">Voltar para a garagem</Link></div></main>;
  if (!it) return <main className="page"><div className="spinner" /></main>;
  return (
    <main className="page" style={{ maxWidth: 620 }}>
      <div className="between">
        <Link to="/garagem" className="link" style={{ gap: 4 }}><span className="ms" aria-hidden="true">arrow_back</span>Garagem</Link>
        <span style={{ font: "500 12px 'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'var(--t3)', textTransform: 'uppercase' }}>{numLabel(it)}</span>
      </div>
      <div className="card"><CarDetails it={it} folders={folders} onChange={setData} onDeleted={() => nav('/garagem')} /></div>
    </main>
  );
}
