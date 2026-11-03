import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../lib/toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import { initial } from '../lib/format.js';
const ROLES = [['colecionador', 'Colecionador', 'Colecionadores'], ['moderador', 'Moderador', 'Moderadores'], ['admin', 'Administrador', 'Administradores']];
const since = d => d ? 'desde ' + new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '') : '';
export default function Usuarios() {
  const toast = useToast(), { user: me } = useAuth();
  const [q, setQ] = useState(''), [list, setList] = useState(null);
  useEffect(() => { const t = setTimeout(() => api.users.list(q).then(setList).catch(e => toast(e.message)), 250); return () => clearTimeout(t); }, [q]);
  const upd = async (u, d, msg) => { try { const r = await api.users.update(u.id, d); setList(list.map(x => x.id === u.id ? { ...x, ...r } : x)); toast(msg); } catch (e) { toast(e.message); } };
  const rows = list || [];
  return (
    <main className="page" style={{ gap: 20 }}>
      <p className="lead" style={{ maxWidth: '70ch' }}>Defina o perfil de cada pessoa. Moderadores aprovam o catálogo; administradores também gerenciam usuários.</p>
      <dl className="stats">{ROLES.map(([k, , l]) => <div key={k} style={{ padding: '18px 20px', gap: 4 }}><dt>{l}</dt><dd style={{ fontSize: 28 }}>{rows.filter(u => u.role === k).length}</dd></div>)}</dl>
      <div style={{ maxWidth: 420 }}>
        <label htmlFor="usearch" className="sr-only">Buscar usuário</label>
        <input id="usearch" className="input" style={{ minHeight: 44 }} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" />
      </div>
      <div className="utable" role="table" aria-label="Usuários">
        <div role="row" className="head"><span role="columnheader">Piloto</span><span role="columnheader">Coleção</span><span role="columnheader">Perfil</span><span role="columnheader" style={{ textAlign: 'right' }}>Status</span></div>
        {list && !rows.length && <div role="row"><span role="cell" className="muted">Ninguém encontrado.</span></div>}
        {rows.map(u => {
          const isMe = u.id === me.id;
          return (
            <div key={u.id} role="row" style={{ opacity: u.blocked ? .5 : 1 }}>
              <div role="cell" className="row" style={{ gap: 12, flexWrap: 'nowrap', minWidth: 0 }}>
                <span className="av" aria-hidden="true">{initial(u.name)}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: 14.5, fontWeight: 800 }}>{u.name}{isMe ? ' (você)' : ''}</span><span style={{ fontSize: 12.5, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span></span>
              </div>
              <span role="cell" style={{ fontSize: 13, color: 'var(--t2)' }}>{u.items} {u.items === 1 ? 'miniatura' : 'miniaturas'} · {since(u.created_at)}</span>
              <label role="cell" style={{ display: 'flex' }}>
                <span className="sr-only">Perfil de {u.name}</span>
                <select className="select" style={{ width: '100%', background: 'var(--kin)' }} value={u.role} disabled={isMe} onChange={e => upd(u, { role: e.target.value }, u.name + ' agora é ' + ROLES.find(r => r[0] === e.target.value)[1].toLowerCase())}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </label>
              <div role="cell" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="pbtn" style={{ height: 36, fontSize: 12.5, padding: '0 12px', borderColor: u.blocked ? 'var(--green)' : 'var(--k7)', color: isMe ? 'var(--t4)' : u.blocked ? 'var(--green)' : undefined }} disabled={isMe} onClick={() => upd(u, { blocked: !u.blocked }, u.name + (u.blocked ? ' reativado' : ' suspenso'))}>{isMe ? 'Você' : u.blocked ? 'Reativar' : 'Suspender'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
