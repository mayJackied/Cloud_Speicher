import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function readRaw(req: IncomingMessage): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    req.on('end', () => {
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
      const merged = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      resolve(merged)
    })
    req.on('error', reject)
  })
}

function readBody(req: IncomingMessage): Promise<string> {
  return readRaw(req).then((bytes) => new TextDecoder().decode(bytes))
}

function multipartField(body: string, name: string): string {
  const match = new RegExp(
    `name="${name}"[^\\r\\n]*(?:\\r?\\n[^\\r\\n]+)*\\r?\\n\\r?\\n([^\\r\\n]*)`,
  ).exec(body)
  return match?.[1] ?? ''
}

function multipartFilename(body: string): string {
  const starred = /filename\*=(?:UTF-8''|utf-8'')([^;\r\n]+)/.exec(body)
  if (starred?.[1]) {
    try {
      return decodeURIComponent(starred[1])
    } catch {
      return starred[1]
    }
  }
  const match = /filename="([^"]+)"/.exec(body)
  return match?.[1] ?? ''
}

function queryParam(url: string, name: string): string {
  const q = url.indexOf('?')
  if (q < 0) {
    return ''
  }
  return new URLSearchParams(url.slice(q + 1)).get(name) ?? ''
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

type MockNode = {
  fileName: string
  length: number
  lastModified: number
  is_file: boolean
  filesVOS: MockNode[] | null
}

const FILE_PREFIX = '../files'

function mockNode(fileName: string, isFile: boolean, children: MockNode[] | null = null): MockNode {
  return { fileName, length: isFile ? 1 : 0, lastModified: Date.now(), is_file: isFile, filesVOS: children }
}

function cloneNode(node: MockNode): MockNode {
  return {
    ...node,
    filesVOS: node.filesVOS ? node.filesVOS.map(cloneNode) : null,
  }
}

const publicRoot: MockNode = mockNode('public', false, [
  mockNode('document', false, [mockNode('a.txt', true)]),
  mockNode('music', false, null),
  mockNode('photo', false, null),
  mockNode('video', false, null),
])
const roomRoots = new Map<string, MockNode>()
const mockFileBytes = new Map<string, Uint8Array>()

function userIdFromToken(token: string): number {
  return token === 'mock-admin-token' ? 1 : 2
}

function roomRoot(userId: number): MockNode {
  const key = String(userId)
  let node = roomRoots.get(key)
  if (!node) {
    node = mockNode(key, false, null)
    roomRoots.set(key, node)
  }
  return node
}

function mockRoots(userId: number): MockNode[] {
  return [publicRoot, roomRoot(userId)]
}

function parseFilePath(path: string): string[] | null {
  const normalized = path.replace(/\\/g, '/')
  if (normalized === FILE_PREFIX) {
    return []
  }
  const prefix = `${FILE_PREFIX}/`
  if (!normalized.startsWith(prefix)) {
    return null
  }
  return normalized.slice(prefix.length).split('/').filter(Boolean)
}

function findMockNode(userId: number, segments: string[]): MockNode | null {
  let nodes = mockRoots(userId)
  let found: MockNode | null = null
  for (const name of segments) {
    found = nodes.find((node) => node.fileName === name) ?? null
    if (!found) {
      return null
    }
    nodes = found.filesVOS ?? []
  }
  return found
}

function inUserOrPublic(path: string, token: string): { userPrefix: string; publicPrefix: string } | null {
  const userId = userIdFromToken(token)
  const userPrefix = `${FILE_PREFIX}/${userId}`
  const publicPrefix = `${FILE_PREFIX}/public`
  if (
    path !== userPrefix &&
    !path.startsWith(`${userPrefix}/`) &&
    path !== publicPrefix &&
    !path.startsWith(`${publicPrefix}/`)
  ) {
    return null
  }
  return { userPrefix, publicPrefix }
}

function fileWritable(path: string, token: string): number | null {
  const scope = inUserOrPublic(path, token)
  if (!scope) {
    return 20001
  }
  if (path === scope.userPrefix || path.startsWith(`${scope.userPrefix}/`)) {
    return null
  }
  if (token === 'mock-admin-token') {
    return null
  }
  return 20001
}

function fileReadable(path: string, token: string): number | null {
  return inUserOrPublic(path, token) ? null : 20001
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

        if (url.startsWith('/api/file/')) {
          const token = String(req.headers.token ?? '')
          if (!token) {
            sendJson(res, fail(10000))
            return
          }
          const userId = userIdFromToken(token)

          if (req.method === 'GET' && url === '/api/file/getFiles') {
            sendJson(res, ok(mockRoots(userId).map(cloneNode)))
            return
          }

          if (req.method !== 'POST') {
            next()
            return
          }

          if (url === '/api/file/uploadFile') {
            const queryPath = queryParam(req.url ?? '', 'path')
            void readRaw(req).then((bytes) => {
              const body = new TextDecoder('latin1').decode(bytes)
              const path = multipartField(body, 'path') || queryPath
              const fileName = multipartFilename(body)
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const segments = parseFilePath(path)
              if (!segments || segments.length === 0 || !fileName) {
                sendJson(res, fail(20004))
                return
              }
              const parent = findMockNode(userId, segments)
              if (!parent || parent.is_file) {
                sendJson(res, fail(20004))
                return
              }
              const kids = parent.filesVOS ?? []
              if (kids.some((node) => node.fileName === fileName)) {
                sendJson(res, fail(20006))
                return
              }
              const stored = mockNode(fileName, true)
              stored.length = bytes.length
              parent.filesVOS = [...kids, stored]
              mockFileBytes.set(`${path.replace(/\/$/, '')}/${fileName}`, bytes)
              sendJson(res, ok(null))
            })
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

            const path = String(parsed.path ?? '')
            const segments = parseFilePath(path)
            if (!segments || segments.length === 0) {
              sendJson(res, fail(20001))
              return
            }

            if (url === '/api/file/addFile') {
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const parentSeg = segments.slice(0, -1)
              const name = segments[segments.length - 1]
              const parent = findMockNode(userId, parentSeg)
              if (!parent || parent.is_file) {
                sendJson(res, fail(20004))
                return
              }
              const kids = parent.filesVOS ?? []
              if (kids.some((node) => node.fileName === name)) {
                sendJson(res, fail(20006))
                return
              }
              const isFile = Boolean(parsed.is_file)
              parent.filesVOS = [...kids, mockNode(name, isFile)]
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/deleteFile') {
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              if (segments.length === 1) {
                sendJson(res, fail(20001))
                return
              }
              const parent = findMockNode(userId, segments.slice(0, -1))
              const name = segments[segments.length - 1]
              const kids = parent?.filesVOS
              const target = kids?.find((node) => node.fileName === name)
              if (!parent || !kids || !target) {
                sendJson(res, fail(20004))
                return
              }
              if (!target.is_file && target.filesVOS && target.filesVOS.length > 0) {
                sendJson(res, fail(20002))
                return
              }
              parent.filesVOS = kids.filter((node) => node.fileName !== name)
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/renameFile') {
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const newName = String(parsed.new_name ?? '')
              if (
                !newName ||
                newName === '.' ||
                newName === '..' ||
                newName.includes('/') ||
                newName.includes('\\')
              ) {
                sendJson(res, fail(20003))
                return
              }
              if (segments.length === 1) {
                sendJson(res, fail(20001))
                return
              }
              const parent = findMockNode(userId, segments.slice(0, -1))
              const name = segments[segments.length - 1]
              const kids = parent?.filesVOS
              const target = kids?.find((node) => node.fileName === name)
              if (!parent || !kids || !target) {
                sendJson(res, fail(20004))
                return
              }
              if (kids.some((node) => node.fileName === newName)) {
                sendJson(res, fail(20006))
                return
              }
              target.fileName = newName
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/downloadFile') {
              const denied = fileReadable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const node = findMockNode(userId, segments)
              if (!node || !node.is_file) {
                sendJson(res, fail(20004))
                return
              }
              const bytes = mockFileBytes.get(path) ?? new TextEncoder().encode('mock-file\n')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/octet-stream')
              res.setHeader('Content-Disposition', `attachment; filename="${node.fileName}"`)
              res.end(Buffer.from(bytes))
              return
            }

            next()
          })
          return
        }

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