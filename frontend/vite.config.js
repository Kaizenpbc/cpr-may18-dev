import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
console.log('Loading Vite config');
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'src': path.resolve(__dirname, './src')
        }
    },
    build: {
        sourcemap: true
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom']
    }
});
