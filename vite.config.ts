import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React関連を別チャンクに
          'react-vendor': ['react', 'react-dom'],
          // React Flow関連を別チャンクに
          'reactflow-vendor': ['reactflow'],
          // i18n関連を別チャンクに
          'i18n-vendor': ['i18next', 'react-i18next'],
          // その他のユーティリティライブラリ
          'utils-vendor': ['html2canvas'],
        },
      },
    },
    // チャンクサイズ警告の閾値を調整（オプション）
    chunkSizeWarningLimit: 600,
  },
}));
