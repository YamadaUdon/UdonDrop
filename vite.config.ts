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
    // Tree Shakingを有効化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.logを本番では削除
        drop_debugger: true,
      },
    },
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React関連
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // React Flow関連（大きなライブラリ）
          if (id.includes('reactflow') || id.includes('@reactflow')) {
            return 'reactflow-vendor';
          }
          // React Router関連
          if (id.includes('react-router')) {
            return 'router-vendor';
          }
          // i18n関連
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n-vendor';
          }
          // XLSX関連（大きなライブラリ）
          if (id.includes('xlsx')) {
            return 'xlsx-vendor';
          }
          // Tauri API関連
          if (id.includes('@tauri-apps')) {
            return 'tauri-vendor';
          }
          // HTML2Canvas（条件付きで使用）
          if (id.includes('html2canvas')) {
            return 'canvas-vendor';
          }
          // Utils and helpers
          if (id.includes('/src/utils/') || id.includes('/src/services/')) {
            return 'utils';
          }
          // Components
          if (id.includes('/src/components/')) {
            return 'components';
          }
          // Pages
          if (id.includes('/src/pages/')) {
            return 'pages';
          }
          // その他のnode_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));
