import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/pages': path.resolve(__dirname, './src/pages'),
            '@/services': path.resolve(__dirname, './src/services'),
            '@/stores': path.resolve(__dirname, './src/stores'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
        },
    },
    server: {
        port: 5173,
        host: true,
        open: true,
        proxy: {
            '/api': {
                target: 'https://ea-plan-05.vercel.app',
                changeOrigin: true,
                secure: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                // manualChunks 완전 제거 - Vite 자동 분할 사용
                assetFileNames: function (assetInfo) {
                    var name = assetInfo.name || 'asset';
                    var info = name.split('.');
                    var extType = info[info.length - 1];
                    if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
                        return "assets/images/[name]-[hash][extname]";
                    }
                    if (/\.(css)$/i.test(name)) {
                        return "assets/css/[name]-[hash][extname]";
                    }
                    return "assets/[name]-[hash][extname]";
                },
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
            },
        },
    },
    preview: {
        port: 4173,
        host: true,
    },
});
