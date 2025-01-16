import { fileURLToPath, URL } from 'node:url'
import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  worker: {
    // avoid "UMD and IIFE output formats are not supported for code-splitting builds." error
    format: 'es',
  },
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
