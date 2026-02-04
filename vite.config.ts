import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // Map libraries
          'vendor-map': ['leaflet', 'react-leaflet'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Use default esbuild minification (faster than terser)
    minify: 'esbuild',
  },
  server: {
    port: 5174,
    host: true,
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
});
