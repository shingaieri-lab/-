import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',           // Viteのルートをsrc/に設定（既存のindex.htmlと共存するため）
  build: {
    outDir: '../dist',   // ビルド成果物をdist/に出力
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',  // APIリクエストはExpressサーバーへ転送
    },
  },
});
