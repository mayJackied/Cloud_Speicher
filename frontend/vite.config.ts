import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    req.on('end', () => {
      // Decode raw stream chunks without relying on Node's Buffer global
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
      const merged = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      resolve(new TextDecoder().decode(merged))
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, body: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function loginVo(name: string, isAdmin = false) {
  return {
    token: isAdmin ? 'mock-admin-token' : 'mock-token',
    userId: isAdmin ? 1 : 2,
    name,
    is_admin: isAdmin,
  }
}

function ok(data: unknown) {
  return { code: 1, data }
}

function fail(code: number) {
  return { code, data: null }
}

function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (String(req.headers['x-api-mode'] ?? '') === 'online') {
          next()
          return
        }
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/api/user/')) {
          next()
          return
        }

        if (req.method === 'GET' && url === '/api/user/creatInviteCode') {
          const token = String(req.headers.token ?? '')
          if (!token) {
            sendJson(res, fail(10000))
            return
          }
          if (token !== 'mock-admin-token') {
            sendJson(res, fail(10002))
            return
          }
          sendJson(res, ok({ inviteCode: 'mock-invite-code' }))
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        void readBody(req).then((raw) => {
          let parsed: Record<string, unknown> = {}
          try {
            parsed = JSON.parse(raw) as Record<string, unknown>
          } catch {
            sendJson(res, fail(99999), 400)
            return
          }

          if (url === '/api/user/checkUserName') {
            const name = String(parsed.name ?? '').trim()
            sendJson(res, ok({ is_available: name !== 'alice' && name !== 'admin' }))
            return
          }

          if (url === '/api/user/register') {
            const name = String(parsed.name ?? '').trim()
            const password = String(parsed.password ?? '')
            const inviteCode = String(parsed.inviteCode ?? '').trim()
            if (!name) {
              sendJson(res, fail(10003))
              return
            }
            if (!password) {
              sendJson(res, fail(10006))
              return
            }
            if (!inviteCode || inviteCode === 'fail') {
              sendJson(res, fail(inviteCode ? 10010 : 10009))
              return
            }
            sendJson(res, ok(loginVo(name)))
            return
          }

          if (url === '/api/user/login') {
            const name = String(parsed.name ?? '').trim()
            const password = String(parsed.password ?? '')
            if (!name || !password) {
              sendJson(res, fail(10011))
              return
            }
            sendJson(res, ok(loginVo(name, name === 'admin')))
            return
          }

          if (url === '/api/user/delete') {
            const token = String(req.headers.token ?? '')
            sendJson(res, token ? ok(null) : fail(10000))
            return
          }

          next()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://8.130.215.175:8080',
        changeOrigin: true,
      },
    },
  },
})