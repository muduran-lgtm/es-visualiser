import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const certPath = path.resolve(__dirname, '../certs/cert.pem');
const keyPath = path.resolve(__dirname, '../certs/key.pem');

const httpsOptions = fs.existsSync(certPath) && fs.existsSync(keyPath) ? {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
} : undefined;

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    https: httpsOptions,
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        secure: false, // allow self-signed cert of fastify
        changeOrigin: true
      }
    }
  }
});
