import app from './app.js';
import { useObjectStorage } from './storage.js';

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log('Pitbox API na porta', port);
  if (!useObjectStorage) {
    console.log('Storage: disco local (./uploads) — em produção use SUPABASE_URL + SUPABASE_SECRET_KEY');
  }
});
