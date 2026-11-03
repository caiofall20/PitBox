import dns from 'node:dns';
import pg from 'pg';
import 'dotenv/config';

// Evita ENETUNREACH em redes sem IPv6 (comum com host db.*.supabase.co).
dns.setDefaultResultOrder('ipv4first');

// Supabase coloca pg_trgm no schema "extensions"; search_path cobre local (public) e Supabase.
// Na Vercel (serverless) use poucas conexões; o Session pooler do Supabase aguenta o resto.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
});
pool.on('connect', (client) => {
  client.query('SET search_path TO public, extensions').catch(() => {});
});
export const q = (text, params) => pool.query(text, params).then(r => r.rows);
