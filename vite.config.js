import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Heavy data files split out
          'data-vocab': ['./src/data/vocab.js'],
          'data-modules': ['./src/data/modules.js'],
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
})
