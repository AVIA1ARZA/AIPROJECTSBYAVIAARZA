import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@codemirror') || id.includes('@uiw/react-codemirror')) {
                return 'editor-bundle';
              }
              if (id.includes('firebase')) {
                return 'firebase-bundle';
              }
              if (id.includes('@google/genai')) {
                return 'gemini-bundle';
              }
              if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
                return 'highlighter-bundle';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-bundle';
              }
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-bundle';
              }
              if (id.includes('react-markdown') || id.includes('markdown')) {
                return 'markdown-bundle';
              }
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
