var _a;
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { API_ORIGIN, API_PATH_PREFIX } from './src/config/api';
/** 后端会校验 Origin，浏览器经本地代理转发时需去掉该头 */
function stripOriginForApiProxy() {
    return {
        name: 'strip-origin-for-api-proxy',
        configureServer: function (server) {
            server.middlewares.use(function (req, _res, next) {
                var _a;
                if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith(API_PATH_PREFIX)) {
                    delete req.headers.origin;
                    delete req.headers.referer;
                }
                next();
            });
        }
    };
}
export default defineConfig({
    plugins: [vue(), stripOriginForApiProxy()],
    // Capacitor WebView 需相对路径加载静态资源
    base: './',
    server: {
        port: 3000,
        proxy: (_a = {},
            _a[API_PATH_PREFIX] = {
                target: API_ORIGIN,
                changeOrigin: true,
                configure: function (proxy) {
                    proxy.on('proxyReq', function (proxyReq, req) {
                        var auth = req.headers.authorization;
                        if (auth) {
                            proxyReq.setHeader('Authorization', auth);
                        }
                    });
                }
            },
            _a)
    }
});
