import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  }
}) 