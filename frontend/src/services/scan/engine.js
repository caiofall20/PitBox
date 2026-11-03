import { ScanEngine } from './ScanEngine.js';
import { api } from '../api.js';
// Instância única do motor, com o catálogo aprovado vindo da API e os itens do usuário
let catalog = [], items = [], loaded = null;
const toLocal = m => ({ ...m, toy: m.toy_code || undefined, seriesNum: m.series_num, colNum: m.col_num, cast: m.cast_text, photo: m.photo, wiki: m.wiki_url });
export const engine = new ScanEngine({ getItems: () => items, getCatalog: () => [...catalog, ...items.map(i => ({ ...i, toy: i.toy_code, photo: i.photo_url, own: true }))] });
export function setEngineItems(list) { items = list || []; engine._known = null; }
export function loadCatalog() {
  if (!loaded) loaded = api.catalog.index().then(r => { catalog = r.map(toLocal); engine._known = null; }).catch(() => { loaded = null; });
  return loaded;
}
export function listen(onProgress, onPreview) { engine.opts.onProgress = onProgress; engine.opts.onPreview = onPreview; }
