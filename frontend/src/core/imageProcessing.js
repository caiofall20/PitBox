// Recorte automático do carrinho, realce de iluminação e de relevo para OCR
import { clamp } from './text.js';
export const IP = {
  gray(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, g = new Float32Array(c.width * c.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return g;
  },
  blur(g, w, h, r) {
    const W = w + 1, S = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += g[y * w + x]; S[(y + 1) * W + x + 1] = S[y * W + x + 1] + row; } }
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const y1 = Math.max(0, y - r), y2 = Math.min(h, y + r + 1); for (let x = 0; x < w; x++) { const x1 = Math.max(0, x - r), x2 = Math.min(w, x + r + 1); o[y * w + x] = (S[y2 * W + x2] - S[y1 * W + x2] - S[y2 * W + x1] + S[y1 * W + x1]) / ((y2 - y1) * (x2 - x1)); } }
    return o;
  },
  scale(c, max, up) {
    const k = Math.min(up || 1, max / Math.max(c.width, c.height)), o = document.createElement('canvas');
    o.width = Math.max(1, Math.round(c.width * k)); o.height = Math.max(1, Math.round(c.height * k));
    const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, o.width, o.height); return o;
  },
  box(c) {
    const s = IP.scale(c, 360), w = s.width, h = s.height, g = IP.gray(s), m = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1];
      const gy = g[i + w - 1] + 2 * g[i + w] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - w] - g[i - w + 1];
      const cx = x / w - 0.5, cy = y / h - 0.5;
      m[i] = Math.sqrt(gx * gx + gy * gy) * Math.exp(-(cx * cx + cy * cy) / (2 * 0.3 * 0.3));
    }
    const sorted = Float32Array.from(m).sort(), thr = sorted[Math.floor(sorted.length * 0.9)];
    const xs = [], ys = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x] > thr && thr > 0) { xs.push(x); ys.push(y); }
    if (xs.length < 30) return { x: 0, y: 0, w: 1, h: 1 };
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const q = (a, p) => a[Math.floor((a.length - 1) * p)], pad = 0.06;
    let x1 = q(xs, 0.04) / w - pad, x2 = q(xs, 0.96) / w + pad, y1 = q(ys, 0.04) / h - pad, y2 = q(ys, 0.96) / h + pad;
    x1 = clamp(x1, 0, 1); y1 = clamp(y1, 0, 1); x2 = clamp(x2, 0, 1); y2 = clamp(y2, 0, 1);
    if ((x2 - x1) * (y2 - y1) < 0.04 || (x2 - x1) * (y2 - y1) > 0.92) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  },
  crop(c, b, max, up) {
    const sx = b.x * c.width, sy = b.y * c.height, sw = Math.max(1, b.w * c.width), sh = Math.max(1, b.h * c.height);
    const k = Math.min(up || 1, max / Math.max(sw, sh)), o = document.createElement('canvas');
    o.width = Math.round(sw * k); o.height = Math.round(sh * k);
    const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height); return o;
  },
  text(c, invert) {
    const w = c.width, h = c.height, g = IP.gray(c), r = Math.max(6, Math.round(Math.max(w, h) / 45)), mean = IP.blur(g, w, h, r);
    const n = new Float32Array(w * h);
    for (let i = 0; i < n.length; i++) n[i] = g[i] / (mean[i] + 10);
    const samp = []; for (let i = 0; i < n.length; i += 7) samp.push(n[i]); samp.sort((a, b) => a - b);
    const lo = samp[Math.floor(samp.length * 0.01)], hi = samp[Math.floor(samp.length * 0.99)], k = 255 / Math.max(1e-3, hi - lo);
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const x = o.getContext('2d'), d = x.createImageData(w, h), p = d.data;
    for (let i = 0, j = 0; j < n.length; i += 4, j++) { let v = clamp((n[j] - lo) * k, 0, 255); if (invert) v = 255 - v; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
    x.putImageData(d, 0, 0); return o;
  },
  levels(c) {
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext('2d'); x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, o.width, o.height), p = d.data, H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let lum = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) { H[0][p[i]]++; H[1][p[i + 1]]++; H[2][p[i + 2]]++; lum += 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; n++; }
    const pct = (hh, q) => { let a = 0; const t = n * q; for (let v = 0; v < 256; v++) { a += hh[v]; if (a >= t) return v; } return 255; };
    const lo = H.map(hh => pct(hh, 0.005)), hi = H.map(hh => pct(hh, 0.995));
    const mean = lum / n / 255, gamma = mean < 0.45 ? clamp(Math.log(0.5) / Math.log(Math.max(0.05, mean)), 0.55, 1) : 1;
    const LUT = [0, 1, 2].map(ch => { const k = Math.min(2.2, 255 / Math.max(1, hi[ch] - lo[ch])), t = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) t[v] = 255 * Math.pow(clamp((v - lo[ch]) * k, 0, 255) / 255, gamma); return t; });
    for (let i = 0; i < p.length; i += 4) { p[i] = LUT[0][p[i]]; p[i + 1] = LUT[1][p[i + 1]]; p[i + 2] = LUT[2][p[i + 2]]; }
    x.putImageData(d, 0, 0); return o;
  },
};
