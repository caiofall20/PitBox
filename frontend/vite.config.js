import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
// host: true expõe o app na rede local (teste no celular); HTTPS com certificado de desenvolvimento,
// porque o celular só libera a câmera em conexão segura.
export default defineConfig({ plugins: [react(), basicSsl()], server: { host: true, proxy: { '/api': 'http://localhost:3333', '/uploads': 'http://localhost:3333' } } });
