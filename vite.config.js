import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animations & UI
          'vendor-motion': ['framer-motion'],
          // Charts
          'vendor-charts': ['recharts'],
          // PDF generation
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // QR code
          'vendor-qr': ['qrcode.react', 'jsqr'],
          // Forms
          'vendor-forms': ['react-hook-form'],
          // Icons
          'vendor-icons': ['lucide-react'],
          // Slider
          'vendor-swiper': ['swiper'],
          // Misc
          'vendor-misc': ['axios', 'clsx', 'react-countup', 'react-intersection-observer', 'react-helmet-async'],
        },
      },
    },
  },
})
