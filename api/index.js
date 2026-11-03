// Entrada serverless da Vercel: todas as rotas /api/* caem aqui.
import app from '../backend/src/app.js';

export const config = { maxDuration: 30 };

export default app;
