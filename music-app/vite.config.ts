import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** 诊断接收中间件：接收前端 /__diag 上报并打到服务端日志（仅开发用） */
function diagMiddleware(): Plugin {
  return {
    name: 'diag-middleware',
    configureServer(server) {
      server.middlewares.use('/__diag', (req, res) => {
        let body = '';
        req.on('data', (c: Buffer) => { body += c; });
        req.on('end', () => {
          try {
            console.log('[DIAG] ' + JSON.stringify(JSON.parse(body)));
          } catch {
            console.log('[DIAG] raw ' + body);
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), diagMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
