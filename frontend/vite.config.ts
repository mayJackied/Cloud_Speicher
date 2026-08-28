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
    token: 'mock-token',
    userId: isAdmin ? 1 : 2,
    name,
    isAdmin,
  }
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

        if (req.method === 'GET' && url === '/api/user/getUsersName') {
          sendJson(res, { code: 1, msg: null, data: ['alice', 'admin'] })
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
            sendJson(res, { code: 0, msg: '请求体不是 JSON', data: null }, 400)
            return
          }

          if (url === '/api/user/register') {
            const name = String(parsed.name ?? '').trim()
            const password = String(parsed.password ?? '')
            const inviteCode = String(parsed.inviteCode ?? '').trim()
            if (name === 'alice' || name === 'admin') {
              sendJson(res, { code: 0, msg: '用户名已存在', data: null }, 409)
              return
            }
            if (!name || !password || !inviteCode || inviteCode === 'fail') {
              sendJson(res, { code: 0, msg: '无效的邀请码', data: null }, 400)
              return
            }
            sendJson(res, { code: 1, msg: null, data: loginVo(name) })
            return
          }

          if (url === '/api/user/login') {
            const name = String(parsed.name ?? '').trim()
            const password = String(parsed.password ?? '')
            if (!name || !password) {
              sendJson(res, { code: 0, msg: '用户名或密码不正确', data: null }, 400)
              return
            }
            sendJson(res, {
              code: 1,
              msg: null,
              data: loginVo(name, name === 'admin'),
            })
            return
          }

          if (url === '/api/user/creatInviteCode') {
            const token = String(req.headers.token ?? '')
            if (!token) {
              sendJson(res, { code: 0, msg: 'NOT_LOGIN', data: null })
              return
            }
            if (String(parsed.name ?? '') !== 'admin') {
              sendJson(res, { code: 0, msg: '您不是管理员', data: null })
              return
            }
            sendJson(res, {
              code: 1,
              msg: null,
              data: { inviteCode: 'mock-invite-code' },
            })
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