import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage } from 'node:http'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function mockRegisterPlugin(): Plugin {
  return {
    name: 'mock-register-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (req.method !== 'POST' || url !== '/api/user/register') {
          next()
          return
        }
        void readBody(req).then((raw) => {
          let name = ''
          let password = ''
          let inviteCode = ''
          try {
            const body = JSON.parse(raw) as {
              name?: string
              password?: string
              inviteCode?: string
            }
            name = body.name?.trim() ?? ''
            password = body.password ?? ''
            inviteCode = body.inviteCode?.trim() ?? ''
          } catch {
            /* 非法 JSON → false */
          }
          const ok = Boolean(name && password && inviteCode && inviteCode !== 'fail')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(ok))
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), mockRegisterPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
