import pg from 'pg';
import 'dotenv/config';
// Supabase coloca pg_trgm no schema "extensions"; search_path cobre local (public) e Supabase.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
pool.on('connect', (client) => {
  client.query('SET search_path TO public, extensions').catch(() => {});
});
export const q = (text, params) => pool.query(text, params).then(r => r.rows);
