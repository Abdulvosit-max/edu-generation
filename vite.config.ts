// Vite konfiguratsiya fayli
// Loyihani build qilish va dev server sozlamalari

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // .env.local faylidagi barcha o'zgaruvchilarni yuklash
  // '' prefiksi — VITE_ bo'lmagan o'zgaruvchilarni ham yuklash (GEMINI_API_KEY uchun)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    define: {
      // GEMINI_API_KEY ni frontend kodi uchun process.env sifatida inject qilish
      // Gemini SDK process.env dan o'qiydi, shuning uchun shu usul kerak
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        // @ belgisi loyiha ildiziga ishora qiladi
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR (Hot Module Replacement) — DISABLE_HMR o'zgaruvchisi orqali o'chirilishi mumkin
      // Bu AI Studio muhitida lozim bo'lgan sozlama
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
