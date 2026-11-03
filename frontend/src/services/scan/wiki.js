// Hot Wheels Wiki (Fandom) — API MediaWiki pública. Exibir a imagem com crédito e link; não copiar para o servidor.
const API = 'https://hotwheels.fandom.com/api.php';
export async function searchWiki(q) {
  const j = await (await fetch(API + '?action=query&list=search&srlimit=3&srnamespace=0&format=json&origin=*&srsearch=' + encodeURIComponent(q))).json();
  const hits = (j.query?.search || []).filter(x => !/^List of|Series$|\(disambiguation\)/i.test(x.title));
  if (!hits.length) return [];
  const p = await (await fetch(API + '?action=query&prop=pageimages|info&inprop=url&pithumbsize=480&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(hits.map(x => x.title).join('|')))).json();
  return Object.values(p.query?.pages || {}).map(pg => ({ title: pg.title, url: pg.fullurl, thumb: pg.thumbnail?.source || null }));
}
export const googleImagesUrl = q => 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
