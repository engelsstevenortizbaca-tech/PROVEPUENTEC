import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend se consume a través de un proxy en desarrollo. Así el navegador
// ve un único origen (http://localhost:5173) y la cookie httpOnly del refresh
// token —restringida a `/api/auth`— viaja sin configuración de CORS.
//
// `/uploads` también se proxifica: las imágenes de producto se guardan con
// ruta pública relativa (`/uploads/<archivo>`) y las sirve express.static.
const BACKEND = process.env.VITE_API_PROXY || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/uploads': { target: BACKEND, changeOrigin: true },
    },
  },
});
