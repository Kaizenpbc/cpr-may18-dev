import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

console.log('Loading Vite config');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
      'country-flag-icons/unicode': path.resolve(__dirname, 'node_modules/country-flag-icons/unicode/index.js'),
    }
  },
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-phone-number-input'],
    esbuildOptions: {
      alias: {
        'country-flag-icons/unicode': path.resolve(__dirname, 'node_modules/country-flag-icons/unicode/index.js')
      }
    }
  }
})
