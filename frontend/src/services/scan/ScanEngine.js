// Motor de leitura do scan: verso da cartela (Tesseract) e base do carrinho (PaddleOCR + fallback Tesseract).
// Métodos copiados do protótipo. Dependências externas carregadas sob demanda via CDN; em produção,
// instale tesseract.js e @paddleocr/paddleocr-js pelo npm e troque os imports.
import { norm, titleCase, dice, clamp } from '../../core/text.js';
import { IP } from '../../core/imageProcessing.js';
import { CATALOG, BRAND_RX, BASEW, STOP } from '../../data/catalog.js';

const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export class ScanEngine {
  /**
   * @param {{ getItems: () => any[], getCatalog: () => any[], onProgress?: (p:number, stage:number) => void, onPreview?: (url:string|null) => void }} opts
   */
  constructor(opts) { this.opts = opts; this._known = null; }
  get state() { return { items: this.opts.getItems() }; }
  catalogAll() { return this.opts.getCatalog(); }
  setState(patch) { if (this.opts.onProgress && patch) this.opts.onProgress(patch.progress, patch.readStage); }
  setThumb(url) { if (this.opts.onPreview) this.opts.onPreview(url); }

  async ocr() {
    if (this._worker) return this._worker;
    if (!this._wp) this._wp = (async () => {
      if (!window.Tesseract) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = TESS; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
      const w = await window.Tesseract.createWorker('eng', 1, { logger: m => this._log && this._log(m) });
      this._worker = w; return w;
    })().catch(e => { this._wp = null; throw e; });
    return this._wp;
  }

  loadImg(src) {
    return new Promise((res, rej) => {
      const url = typeof src === 'string' ? src : URL.createObjectURL(src);
      const img = new Image();
      img.onload = () => res({ img, done: () => { if (typeof src !== 'string') URL.revokeObjectURL(url); } });
      img.onerror = rej; img.src = url;
    });
  }

  rotCanvas(img, rot, max) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height, sc = Math.min(1, max / Math.max(w0, h0));
    const w = Math.round(w0 * sc), hh = Math.round(h0 * sc), side = rot % 2 === 1;
    const c = document.createElement('canvas'); c.width = side ? hh : w; c.height = side ? w : hh;
    const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 2); x.drawImage(img, -w / 2, -hh / 2, w, hh);
    return c;
  }

  prep(c, strong) {
    const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    let lo = 255, hi = 0; const g = new Uint8ClampedArray(p.length / 4);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) { const v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; g[j] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = 255 / Math.max(1, hi - lo);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) { let v = (g[j] - lo) * k; if (strong) v = v < 128 ? v * 0.6 : 255 - (255 - v) * 0.6; p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0); return c;
  }

  knownWords() {
    if (this._known) return this._known;
    const k = new Set(['HOT', 'WHEELS', 'HOTWHEELS', 'MATTEL', 'MATCHBOX', 'MAJORETTE', 'JADA', 'TOMICA', 'MAISTO', 'GREENLIGHT', 'RACE', 'DAY', 'WARNING', 'ATTENTION', 'ADVERTENCIA', 'ATENCAO', 'MADE', 'SMALL', 'PARTS', 'AGES', 'YEARS', 'TOY', 'CAR', 'SERIES', 'CULTURE', 'PREMIUM', 'LEGENDS', 'SCREEN', 'TIME', 'FAST', 'FURIOUS', 'SPEED', 'RACER', 'GENERATED', 'RECOMENDADO', 'PUEDE', 'GENERAR', 'PRODUIRE', 'ELEMENTS', 'CHINA', 'MALAYSIA', 'THAILAND']);
    this.catalogAll().forEach(c => [c.brand, c.model, c.series].join(' ').toUpperCase().split(/[^A-Z0-9]+/).forEach(t => { if (t.length >= 3) k.add(t); }));
    return (this._known = k);
  }

  score(data) {
    const K = [...this.knownWords()];
    const fixL = t => t.replace(/8/g, 'B').replace(/5/g, 'S').replace(/0/g, 'O').replace(/1/g, 'I');
    const text = (data.text || '').toUpperCase();
    let sc = 0;
    for (const raw of text.split(/[^A-Z0-9]+/)) {
      if (raw.length < 3) continue;
      const a = fixL(raw);
      let best = 0;
      for (const k of K) { const d = Math.max(dice(raw, k), dice(a, fixL(k))); if (d > best) best = d; if (best === 1) break; }
      if (best >= 0.7) sc += 4 * best;
      else if (/^[A-Z]{4,}$/.test(raw) && /[AEIOU]/.test(raw) && !/(.)\1\1/.test(raw)) sc += 0.5;
    }
    sc += (text.match(/'?\s?\d{2}\s+[A-Z]{3,}/g) || []).length * 3 + (text.match(/\b\d{1,3}\s*\/\s*\d{1,3}\b/g) || []).length * 2;
    return sc;
  }

  async detectRot(img) {
    const w = await this.ocr();
    const res = [];
    for (const rot of [0, 1, 3, 2]) {
      const { data } = await w.recognize(this.prep(this.rotCanvas(img, rot, 1400)));
      const sc = this.score(data);
      res.push({ rot, sc });
      if (rot === 0 && sc >= 30) return 0;
    }
    res.sort((x, y) => y.sc - x.sc);
    const [top, second] = res;
    return top.sc >= 6 && top.sc >= second.sc * 1.5 + 2 ? top.rot : 0;
  }

  baseScore(text) {
    const U = (text || '').toUpperCase();
    let sc = this.score({ text: U });
    for (const t of U.split(/[^A-Z0-9']+/)) if (t.length >= 4 && /^[A-Z]+$/.test(t) && /[AEIOU]/.test(t) && !/[^AEIOU]{4,}/.test(t)) sc += 2;
    if (/'\s?\d{2}\s+[A-Z]{3,}/.test(U)) sc += 5;
    if (/(?:©|\(C\)|@)\s*(?:19|20)\d{2}/.test(U)) sc += 3;
    return sc;
  }

  async readBase(img, alive, box) {
    const full = this.rotCanvas(img, 0, 2800);
    const b = box || IP.box(full);
    const cc = IP.crop(full, b, 2200, 3);
    const prev = IP.text(IP.scale(cc, 900), false);
    await new Promise(res => prev.toBlob(bl => { if (bl) this.setThumb(URL.createObjectURL(bl)); res(); }, 'image/jpeg', 0.8));
    if (!alive()) return '';
    this.setState({ readStage: 2, progress: 40 });
    const po = await this.paddle().catch(() => null);
    if (!alive()) return '';
    if (po) {
      const small = IP.scale(cc, 1600), enh = IP.text(small, false), out = [];
      let k = 0;
      for (const src of [small, enh]) for (const rot of [1, 3, 0, 2]) {
        const res = await po.predict(this.rotCanvas(src, rot, 1600));
        if (!alive()) return '';
        (res[0] && res[0].items || []).filter(i => i.score >= 0.6 && /[A-Za-z0-9]{3,}/.test(i.text)).forEach(i => out.push(i.text));
        this.setState({ readStage: k >= 3 ? 3 : 2, progress: 40 + (++k) * 6 });
      }
      if (out.length) return out.join('\n');
    }
    const w = this._worker;
    await w.setParameters({ tessedit_pageseg_mode: '11' });
    try {
      const small = IP.scale(cc, 1100);
      let best = { sc: -1, rot: 0, inv: false, text: '' }, k = 0;
      for (const rot of (cc.height > cc.width ? [1, 3, 0, 2] : [0, 2, 1, 3])) {
        for (const inv of [true, false]) {
          const { data } = await w.recognize(IP.text(this.rotCanvas(small, rot, 1100), inv));
          if (!alive()) return '';
          const sc = this.baseScore(data.text);
          if (sc > best.sc) best = { sc, rot, inv, text: data.text || '' };
          this.setState({ progress: 40 + (++k) * 5 });
          if (best.sc >= 22) break;
        }
        if (best.sc >= 22) break;
      }
      this.setState({ readStage: 3, progress: 84 });
      const { data } = await w.recognize(IP.text(this.rotCanvas(cc, best.rot, 2400), best.inv));
      return (data.text || '') + '\n' + best.text;
    } finally { await w.setParameters({ tessedit_pageseg_mode: '3' }); }
  }

  paddle() {
    if (this._po) return Promise.resolve(this._po);
    if (!this._pp) this._pp = (async () => {
      const m = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm');
      const o = await m.PaddleOCR.create({ lang: 'en', ocrVersion: 'PP-OCRv5', ortOptions: { backend: 'wasm', wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/', numThreads: 1 } });
      return (this._po = o);
    })().catch(e => { this._pp = null; throw e; });
    return this._pp;
  }

  async wiki(q) {
    const API = 'https://hotwheels.fandom.com/api.php';
    const j = await (await fetch(API + '?action=query&list=search&srlimit=3&srnamespace=0&format=json&origin=*&srsearch=' + encodeURIComponent(q))).json();
    const hits = ((j.query && j.query.search) || []).filter(x => !/^List of|Series$|\(disambiguation\)/i.test(x.title));
    if (!hits.length) return [];
    const titles = hits.map(x => x.title).join('|');
    const p = await (await fetch(API + '?action=query&prop=pageimages|info|extracts&exintro=1&explaintext=1&exsentences=2&inprop=url&pithumbsize=480&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(titles))).json();
    const pages = Object.values((p.query && p.query.pages) || {});
    return hits.map(hh => pages.find(pg => pg.title === hh.title) || pages.find(pg => norm(pg.title) === norm(hh.title))).filter(Boolean)
      .map(pg => ({ title: pg.title, url: pg.fullurl || ('https://hotwheels.fandom.com/wiki/' + encodeURIComponent(pg.title.replace(/ /g, '_'))), thumb: pg.thumbnail && pg.thumbnail.source, year: ((pg.extract || '').match(/\b(19[6-9]\d|20[0-3]\d)\b/) || [])[1] || '' }));
  }

  parseCard(text) {
    const U = text.toUpperCase().replace(/[‘’´`"“”]/g, "'").replace(/[—~_]/g, '-');
    const lines = U.split('\n').map(l => l.trim()).filter(Boolean);
    const f = {}, conf = {}, found = {};
    for (const [rx, name] of BRAND_RX) if (rx.test(U)) { f.brand = name; conf.brand = 95; break; }
    if (!f.brand && (/W\s?HEELS|WHEELS\.COM/.test(U) || (/MATTEL/.test(U) && /\bHW\s+[A-Z]/.test(U)))) { f.brand = 'Hot Wheels'; conf.brand = 85; }
    const L2 = { '0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z' }, D2 = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2' };
    const fixToy = (a, b) => a.split('').map(c => L2[c] || c).join('') + b.split('').map(c => D2[c] || c).join('');
    let m = U.match(/\b([A-Z0-9]{3})([0-9OILSBZ]{2})\s*[-–]\s*[A-Z0-9]{4}\b/);
    if (!m) { for (const l of lines.slice(0, 6)) { const k = l.match(/\b([A-Z]{3})(\d{2})\b/); if (k) { m = k; break; } } }
    if (m) found.toy = fixToy(m[1], m[2]);
    let nameLine = lines.find(l => /^\W{0,3}[A-Z]?\s?'\s?\d{2}\s+[A-Z]/.test(l)) || lines.find(l => /'\s?\d{2}\s+[A-Z]{2,}/.test(l));
    const serIdx = lines.findIndex(l => /\bHW\s+[A-Z]{2,}/.test(l));
    if (!nameLine && serIdx > 0) nameLine = lines[serIdx - 1];
    if (nameLine) {
      const nm = (nameLine.match(/'\s?\d{2}\s+.*/) || [nameLine])[0].replace(/[™®©|_~=]+/g, ' ').replace(/[^A-Z0-9'\-\/ .&]+$/g, '').replace(/\s{2,}/g, ' ').trim();
      if (nm.replace(/[^A-Z]/g, '').length >= 3) { f.model = titleCase(nm.replace(/^'\s+/, "'")); conf.model = 88; }
    }
    if (serIdx >= 0) { const sm = lines[serIdx].match(/\bHW\s+[A-Z][A-Z&\- ]{1,30}/); if (sm) found.series = 'HW ' + titleCase(sm[0].replace(/^HW\s+/, '').replace(/\s+[A-Z]$/, '').trim()); }
    const sn = [...U.matchAll(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/g)].find(x => +x[2] <= 20 && +x[1] >= 1 && +x[1] <= +x[2]);
    if (sn) found.seriesNum = sn[1] + '/' + sn[2];
    const cn = [...U.matchAll(/\b(\d{1,3})\s*\/\s*(\d{3})\b/g)].find(x => +x[2] >= 150 && +x[2] <= 300 && +x[1] <= +x[2]);
    if (cn) found.colNum = cn[1] + '/' + cn[2];
    const y = U.match(/(?:©|\(C\)|C\)|@)\s*((?:19|20)\d{2})/) || U.match(/((?:19|20)\d{2})\s*MATTEL/) || U.match(/\b[0O]((?:19|20)[0-3]\d)\b/);
    if (y) { f.year = y[1]; conf.year = 72; }
    const bc = lines.map(l => l.replace(/\D/g, '')).find(d => d.length === 12 || d.length === 13);
    if (bc) found.barcode = bc;
    const sc = U.match(/\b1\s*[:\/]\s*(\d{2,3})\b/);
    if (sc) { f.scale = '1:' + sc[1]; conf.scale = 90; } else if (f.brand === 'Hot Wheels' || f.brand === 'Matchbox') { f.scale = '1:64'; conf.scale = 80; }
    if (found.series) { f.series = found.series + (found.seriesNum ? ' ' + found.seriesNum : ''); conf.series = 90; }
    let hit = null;
    if (found.toy) hit = CATALOG.find(c => c.toy === found.toy) || this.state.items.find(i => i.toy === found.toy);
    if (!hit && f.model) {
      const otoks = (f.model.toUpperCase().match(/[A-Z0-9]+/g) || []).filter(t => /[A-Z]/.test(t));
      let best = 0;
      for (const c of this.catalogAll()) {
        const mt = (c.model.toUpperCase().match(/[A-Z0-9]+/g) || []).filter(t => /[A-Z]/.test(t));
        if (!mt.length) continue;
        const hits = mt.filter(t => otoks.some(o => dice(o, t) >= 0.6)).length;
        let sc = hits / mt.length + (found.series && c.series && norm(c.series) === norm(found.series) ? 0.15 : 0);
        if ((hits >= 2 || mt.length === 1) && sc >= 0.6 && sc > best) { best = sc; hit = c; }
      }
    }
    const fromToy = !!(hit && found.toy && hit.toy === found.toy);
    if (hit) {
      const k = fromToy ? 99 : 86;
      f.brand = hit.brand; conf.brand = Math.max(conf.brand || 0, k);
      f.model = hit.model; conf.model = k;
      if (hit.series) { f.series = hit.series + (hit.seriesNum ? ' ' + hit.seriesNum : ''); conf.series = k; }
      if (hit.scale) { f.scale = hit.scale; conf.scale = k; }
      if (hit.year && (fromToy || !f.year)) { f.year = hit.year; conf.year = fromToy ? k : 80; }
      if (hit.colNum && !found.colNum) found.colNum = hit.colNum;
      if (hit.seriesNum && !found.seriesNum) found.seriesNum = hit.seriesNum;
      if (hit.series && !found.series) found.series = hit.series;
      if (hit.toy && !found.toy) found.toy = hit.toy;
    }
    if (found.toy) f.toy = found.toy;
    return { fields: f, conf, found, hit: hit ? { byToy: fromToy, model: hit.model } : null };
  }

  parseBase(text) {
    const U = text.toUpperCase().replace(/([0-9])([A-Z]{2,})/g, '$1 $2').replace(/([A-Z]{3,})([0-9])/g, (m0, a, d) => /^(RS|GT|EB|BTM)$/.test(a.slice(-3)) ? m0 : a + ' ' + d).replace(/(FORD|ESCORT|NISSAN|TOYOTA|HONDA|MAZDA|DATSUN|CHEVY|DODGE|PORSCHE)/g, ' $1 ');
    let brand = '';
    for (const [rx, name] of BRAND_RX) if (rx.test(U)) { brand = name; break; }
    const year = (U.match(/\b(19[5-9]\d|20[0-3]\d)\b/) || [])[1] || '';
    const toks = (U.match(/[A-Z0-9][A-Z0-9\-]{1,}/g) || []).filter(t => !STOP.has(t) && /[A-Z]/.test(t) && t.length >= 2);
    const clean = toks.join(' ');
    const cands = [];
    if (toks.length) {
      for (const c of this.catalogAll()) {
        const mt = ((c.model + ' ' + (c.cast || '')).toUpperCase().match(/[A-Z0-9][A-Z0-9\-]+/g) || []).filter(t => /[A-Z]/.test(t) && t.length >= 2);
        if (!mt.length) continue;
        const per = [...new Set(mt)].map(t => Math.max(0, ...toks.map(x => dice(x, t))));
        const MAKES = /^(FORD|NISSAN|TOYOTA|HONDA|MAZDA|DATSUN|CHEVY|CHEVROLET|DODGE|PORSCHE|BMW|AUDI|VW|VOLKSWAGEN|MERCEDES|FERRARI|LAMBORGHINI|BUGATTI|MCLAREN|JEEP|MINI)$/;
        const uniqT = [...new Set(mt)];
        const strongNonMake = uniqT.filter((t, ix) => per[ix] >= 0.75 && !MAKES.test(t)).length;
        if (!strongNonMake) continue;
        const strong = per.filter(v => v >= 0.75).length;
        const sim = Math.max(per.reduce((a, v) => a + v, 0) / per.length, strong >= 2 ? 0.85 : strong === 1 ? Math.max(...per) * 0.75 : 0);
        let sc = sim * 0.88 + (brand && c.brand === brand ? 0.1 : 0);
        if (sc >= 0.5) cands.push({ ...c, pct: Math.round(Math.min(0.95, sc) * 100), reason: 'Nome parecido com o gravado na base' + (brand && c.brand === brand ? ' e mesma marca' : '') });
      }
    }
    const lines = U.split('\n').map(l => l.replace(/[‘’´`]/g, "'").replace(/[^A-Z0-9' \-.]/g, ' ').replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
    let guess = '', gq = 0;
    for (const l of lines) { const m = l.match(/'\s?(\d{2})\s+([A-Z0-9][A-Z0-9 \-]{2,})/); if (m) { const g = ("'" + m[1] + ' ' + m[2]).replace(/\s+[A-Z0-9]$/, '').trim(); if (g.replace(/[^A-Z]/g, '').length >= 4) { guess = g; gq = 70; break; } } }
    if (!guess) {
      let bestL = 0;
      for (const l of lines) {
        const good = l.split(' ').filter(t => t.length >= 4 && /^[A-Z][A-Z0-9\-]+$/.test(t) && /[AEIOU]/.test(t) && !/[^AEIOU0-9\-]{4,}/.test(t) && !BASEW.has(t) && !STOP.has(t));
        const L = good.join('').length;
        if (L > bestL) { bestL = L; guess = good.slice(0, 4).join(' '); }
      }
      if (guess) gq = 55;
    }
    if (guess) {
      guess = titleCase(guess);
      const wordy = t => t.length >= 3 && t.length <= 12 && /[AEIOU]/i.test(t) && !/([A-Z])\1\1/i.test(t) && (t.match(/[AEIOU]/gi) || []).length / t.length <= 0.6 && !/[AEIOU]{3,}/i.test(t);
      const gt = guess.split(/\s+/).filter(Boolean);
      const plausible = gt.length >= 2 ? gt.filter(wordy).length >= Math.ceil(gt.length * 0.75) : (/^'\d{2}/.test(guess) && wordy(gt[0] || ''));
      if (plausible && !cands.some(c => c.pct >= 80) && !cands.some(c => dice(norm(c.model), norm(guess)) >= 0.8)) cands.push({ brand: brand || '', model: guess, year: year || '', series: '', scale: brand === 'Hot Wheels' || brand === 'Matchbox' ? '1:64' : '', pct: gq, reason: 'Nome lido na base', fromOcr: true });
    }
    const seen = new Set();
    const uniq = cands.sort((a, b) => b.pct - a.pct).filter(c => { const k = norm(c.brand + c.model); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
    return { cands: uniq, text: clean.slice(0, 90), brand, year, guess };
  }

  mergeRead(a, b) {
    if (!a) return b;
    if (b.hit && b.hit.byToy) return b;
    if (a.hit && a.hit.byToy) return a;
    if (b.hit && !a.hit) return { ...b, found: { ...a.found, ...b.found } };
    const fields = { ...a.fields }, conf = { ...a.conf };
    for (const k of Object.keys(b.fields)) if (b.fields[k] && (!fields[k] || (b.conf[k] || 0) > (conf[k] || 0))) { fields[k] = b.fields[k]; conf[k] = b.conf[k]; }
    const found = { ...a.found }; for (const k of Object.keys(b.found)) if (b.found[k] && !found[k]) found[k] = b.found[k];
    return { fields, conf, found, hit: a.hit || b.hit };
  }
}
