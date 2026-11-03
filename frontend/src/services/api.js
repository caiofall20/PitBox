const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
export const fileUrl = u => !u ? null : /^(https?:|data:|blob:)/.test(u) ? u : (import.meta.env.VITE_API_URL || '') + u;
let token = localStorage.getItem('pitbox-token');
let onUnauthorized = () => {};
export const setToken = t => { token = t; t ? localStorage.setItem('pitbox-token', t) : localStorage.removeItem('pitbox-token'); };
export const hasToken = () => !!token;
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };
async function req(method, path, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, { method, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  if (res.status === 401 && token) { setToken(null); onUnauthorized(); }
  if (!res.ok) { const e = new Error((await res.json().catch(() => ({}))).error || 'Algo deu errado. Tente de novo.'); e.status = res.status; throw e; }
  return res.status === 204 ? null : res.json();
}
export async function uploadDataUrl(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const fd = new FormData(); fd.append('file', blob, 'foto.jpg');
  return (await req('POST', '/uploads', fd)).url;
}
export const api = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  register: (name, email, password) => req('POST', '/auth/register', { name, email, password }),
  authConfig: () => req('GET', '/auth/config'), google: credential => req('POST', '/auth/google', { credential }),
  forgot: email => req('POST', '/auth/forgot', { email }), resetCheck: token => req('POST', '/auth/reset/check', { token }), reset: (token, password) => req('POST', '/auth/reset', { token, password }),
  me: () => req('GET', '/auth/me'), updateMe: d => req('PATCH', '/auth/me', d),
  items: { list: () => req('GET', '/items'), get: id => req('GET', '/items/' + id), create: d => req('POST', '/items', d), update: (id, d) => req('PATCH', '/items/' + id, d), remove: id => req('DELETE', '/items/' + id) },
  folders: { list: () => req('GET', '/folders'), create: name => req('POST', '/folders', { name }), remove: id => req('DELETE', '/folders/' + id) },
  wishlist: { list: () => req('GET', '/wishlist'), add: d => req('POST', '/wishlist', d), remove: id => req('DELETE', '/wishlist/' + id) },
  catalog: { index: () => req('GET', '/catalog/index'), suggest: d => req('POST', '/catalog/suggestions', d) },
  social: {
    search: s => req('GET', '/social/search?q=' + encodeURIComponent(s)), discover: () => req('GET', '/social/discover'), feed: () => req('GET', '/social/feed'),
    profile: h => req('GET', '/social/users/' + encodeURIComponent(h)), item: id => req('GET', '/social/items/' + id),
    follow: id => req('POST', '/social/follow/' + id), unfollow: id => req('DELETE', '/social/follow/' + id),
    requests: () => req('GET', '/social/requests'), followers: () => req('GET', '/social/followers/count'), answer: (id, accept) => req('POST', '/social/requests/' + id, { accept }),
    like: (type, id) => req('POST', '/social/likes', { type, id }), unlike: (type, id) => req('DELETE', '/social/likes/' + type + '/' + id),
    comments: (type, id) => req('GET', '/social/comments/' + type + '/' + id), comment: (type, id, text) => req('POST', '/social/comments', { type, id, text }), removeComment: id => req('DELETE', '/social/comments/' + id),
  },
  moderation: { queue: () => req('GET', '/moderation/queue'), decide: (kind, id, action) => req('POST', '/moderation/' + kind + '/' + id, { action }) },
  users: { list: s => req('GET', '/users?q=' + encodeURIComponent(s || '')), update: (id, d) => req('PATCH', '/users/' + id, d) },
};
