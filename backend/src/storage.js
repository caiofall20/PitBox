import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
// Aceita a chave clássica (service_role) ou a nova (sb_secret_...)
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
export const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'pitbox-photos';
export const useObjectStorage = Boolean(url && key);

export const supabase = useObjectStorage
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

let bucketReady;
export async function ensureStorageBucket() {
  if (!supabase) return;
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabase.storage.getBucket(storageBucket);
      if (!data) {
        const { error } = await supabase.storage.createBucket(storageBucket, {
          public: true,
          fileSizeLimit: 4 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        if (error && !/already exists/i.test(error.message)) throw error;
      }
      console.log('Storage: bucket', storageBucket, '(Supabase)');
    })();
  }
  await bucketReady;
}
