import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/leaflet')) return 'leaflet';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/d3-')) return 'd3';
          if (id.includes('node_modules/jspdf')) return 'pdf';
          return undefined;
        },
      },
    },
  },
});