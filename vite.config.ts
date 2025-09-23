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
            return 'vendor'
          }

          // UI 라이브러리들
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui'
          }

          // 차트 라이브러리
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts'
          }

          // PDF 및 파일 처리
          if (id.includes('pdfjs-dist') || id.includes('react-pdf') || id.includes('tesseract.js') || id.includes('file-type')) {
            return 'pdf-processing'
          }

          // Supabase 관련
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase'
          }

          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }

          // 라우터
          if (id.includes('react-router-dom')) {
            return 'router'
          }

          // 폼 처리
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms'
          }

          // 애니메이션
          if (id.includes('framer-motion')) {
            return 'motion'
          }

          // 상태 관리
          if (id.includes('zustand')) {
            return 'state'
          }

          // 드래그 앤 드롭
          if (id.includes('react-dropzone')) {
            return 'dropzone'
          }

          // 날짜 처리
          if (id.includes('date-fns')) {
            return 'date'
          }

          // 큰 서비스 파일들
          if (id.includes('/services/preAnalysis/') || id.includes('/services/proposal/')) {
            return 'analysis-services'
          }

          // node_modules의 다른 라이브러리들
          if (id.includes('node_modules')) {
            return 'vendor-libs'
          }

          // 기본값
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