import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { API_ORIGIN, API_PATH_PREFIX } from './src/config/api'

/** 后端会校验 Origin，浏览器经本地代理转发时需去掉该头 */
function stripOriginForApiProxy(): Plugin {
  return {
    name: 'strip-origin-for-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith(API_PATH_PREFIX)) {
          delete req.headers.origin
          delete req.headers.referer
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), stripOriginForApiProxy()],
  // Capacitor WebView 需相对路径加载静态资源
  base: './',
  server: {
    port: 3000,
    proxy: {
      [API_PATH_PREFIX]: {
        target: API_ORIGIN,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization
            if (auth) {
              proxyReq.setHeader('Authorization', auth)
            }
          })
        }
      }
    }
  }
})
