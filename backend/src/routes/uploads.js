import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ensureStorageBucket, storageBucket, supabase, useObjectStorage } from '../storage.js';

const dir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!useObjectStorage) fs.mkdirSync(dir, { recursive: true });

const extOf = (m) => ({ 'image/png': '.png', 'image/webp': '.webp' }[m] || '.jpg');
const upload = multer({
  storage: useObjectStorage
    ? multer.memoryStorage()
    : multer.diskStorage({ destination: dir, filename: (req, f, cb) => cb(null, crypto.randomUUID() + extOf(f.mimetype)) }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)),
});

const r = Router();
r.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem JPG, PNG ou WebP de até 4 MB' });

  if (useObjectStorage) {
    await ensureStorageBucket();
    const name = crypto.randomUUID() + extOf(req.file.mimetype);
    const { error } = await supabase.storage.from(storageBucket).upload(name, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao gravar a foto no storage' });
    }
    const { data } = supabase.storage.from(storageBucket).getPublicUrl(name);
    return res.status(201).json({ url: data.publicUrl });
  }

  res.status(201).json({ url: (process.env.PUBLIC_UPLOAD_URL || '/uploads') + '/' + req.file.filename });
});

export const uploadDir = dir;
export default r;
