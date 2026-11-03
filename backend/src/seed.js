import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, q } from './db.js';

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrador' } = process.env;
try {
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const [u] = await q('SELECT id FROM users WHERE email=$1', [ADMIN_EMAIL.toLowerCase()]);
    if (!u) { await q("INSERT INTO users (name, handle, email, password_hash, role) VALUES ($1,'@admin',$2,$3,'admin')", [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), await bcrypt.hash(ADMIN_PASSWORD, 12)]); console.log('admin criado:', ADMIN_EMAIL); }
  }
  const [{ n }] = await q('SELECT count(*)::int AS n FROM catalog_models');
  if (!n) {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seed', 'catalog.json');
    for (const m of JSON.parse(fs.readFileSync(file, 'utf8')))
      await q("INSERT INTO catalog_models (toy_code, brand, model, year, series, series_num, col_num, scale, cast_text, wiki_url, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'aprovado')", [m.toy_code || null, m.brand, m.model, m.year, m.series, m.series_num, m.col_num, m.scale, m.cast_text, m.wiki_url]);
    console.log('catálogo inicial carregado');
  }
} finally { await pool.end(); }
