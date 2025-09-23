import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React 핵심 라이브러리
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'
          }

          // 모든 UI 관련 라이브러리들을 하나로 통합
          if (id.includes('@radix-ui') || id.includes('lucide-react') ||
              id.includes('framer-motion') || id.includes('recharts')) {
            return 'ui-vendor'
          }

          // 모든 폼/검증 관련 라이브러리 통합
          if (id.includes('react-hook-form') || id.includes('@hookform') ||
              id.includes('zod') || id.includes('react-dropzone')) {
            return 'form-vendor'
          }

          // 모든 데이터/백엔드 관련 라이브러리 통합
          if (id.includes('@supabase') || id.includes('supabase') ||
              id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'data-vendor'
          }

          // 큰 처리 라이브러리들 통합
          if (id.includes('pdfjs-dist') || id.includes('react-pdf') ||
              id.includes('tesseract.js') || id.includes('file-type')) {
            return 'processing-vendor'
          }

          // 라우터 (별도 유지)
          if (id.includes('react-router-dom')) {
            return 'router-vendor'
          }

          // 기타 node_modules 라이브러리들
          if (id.includes('node_modules')) {
            return 'other-vendor'
          }

          // 기본값 (앱 코드)
          return undefined
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset'
          const info = name.split('.')
          const extType = info[info.length - 1]
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/\.(css)$/i.test(name)) {
            return `assets/css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
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
})