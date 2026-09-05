import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { fileBytesFromStored } from './src/dev/multipart'
import { mimeFromName } from './src/utils/fileKind'
import { decodeFileName, availableCopyName } from './src/utils/text'

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
      return decodeFileName(decodeURIComponent(starred[1]))
    } catch {
      return decodeFileName(starred[1])
    }
  }
  const match = /filename="([^"]+)"/.exec(body)
  return decodeFileName(match?.[1] ?? '')
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

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <rect width="640" height="400" fill="#1e90ff"/>
  <circle cx="180" cy="160" r="90" fill="#ff7a18"/>
  <rect x="320" y="80" width="220" height="140" fill="#b7f53a"/>
  <ellipse cx="400" cy="300" rx="180" ry="50" fill="#e8f4ff"/>
</svg>`
const sampleSvgBytes = new TextEncoder().encode(SAMPLE_SVG)
const floraNode = mockNode('FLORA_SPECTRA.svg', true)
floraNode.length = sampleSvgBytes.length

const publicRoot: MockNode = mockNode('public', false, [
  mockNode('document', false, [mockNode('a.txt', true)]),
  mockNode('music', false, null),
  mockNode('photo', false, [floraNode]),
  mockNode('video', false, null),
])
const roomRoots = new Map<string, MockNode>()
const mockFileBytes = new Map<string, Uint8Array>()
const mockUploads = new Map<string, { path: string; size: number }>()
const mockStars = new Map<number, Set<string>>()
mockFileBytes.set(`${FILE_PREFIX}/public/photo/FLORA_SPECTRA.svg`, sampleSvgBytes)

function userIdFromToken(token: string): number {
  return token === 'mock-admin-token' ? 1 : 2
}

function roomRoot(userId: number): MockNode {
  const key = String(userId)
  let node = roomRoots.get(key)
  if (!node) {
    node = mockNode(key, false, [mockNode('recycle_bin', false, null)])
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

          if (req.method === 'GET' && url.startsWith('/api/file/initUpload')) {
            const key = `mock-up-${Date.now().toString(36)}`
            mockUploads.set(key, { path: '', size: 0 })
            sendJson(res, ok(key))
            return
          }

          if (req.method === 'GET' && url.startsWith('/api/file/getUploadedSize')) {
            const key = queryParam(req.url ?? '', 'uploadKey')
            const session = mockUploads.get(key)
            if (!session) {
              sendJson(res, fail(20008))
              return
            }
            sendJson(res, ok(session.size))
            return
          }

          if (req.method === 'POST' && url === '/api/file/continuableUploadFile') {
            void readRaw(req).then((bytes) => {
              const body = new TextDecoder('latin1').decode(bytes)
              const uploadKey = multipartField(body, 'uploadKey')
              const targetPath = multipartField(body, 'targetPath')
              const uploadType = Number(multipartField(body, 'uploadType') || '0')
              const uploadedName =
                decodeFileName(multipartField(body, 'fileName')) || multipartFilename(body)
              const session = mockUploads.get(uploadKey)
              if (!session) {
                sendJson(res, fail(20008))
                return
              }
              const denied = fileWritable(targetPath, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const fileBytes = fileBytesFromStored(bytes)
              if (uploadType === 0 || !session.path) {
                const segments = parseFilePath(targetPath)
                if (!segments || segments.length === 0) {
                  sendJson(res, fail(20004))
                  return
                }
                const parent = findMockNode(userId, segments)
                if (!parent || parent.is_file) {
                  sendJson(res, fail(20004))
                  return
                }
                const kids = parent.filesVOS ?? []
                const storedName = availableCopyName(
                  kids.map((node) => node.fileName),
                  uploadedName || 'upload.bin',
                )
                const stored = mockNode(storedName, true)
                stored.length = fileBytes.length
                parent.filesVOS = [...kids, stored]
                const fullPath = `${FILE_PREFIX}/${[...segments, storedName].join('/')}`
                mockFileBytes.set(fullPath, fileBytes)
                session.path = fullPath
                session.size = fileBytes.length
              } else {
                const prev = mockFileBytes.get(session.path) ?? new Uint8Array()
                const merged = new Uint8Array(prev.length + fileBytes.length)
                merged.set(prev, 0)
                merged.set(fileBytes, prev.length)
                mockFileBytes.set(session.path, merged)
                session.size = merged.length
                const segs = parseFilePath(session.path)
                const node = segs ? findMockNode(userId, segs) : null
                if (node?.is_file) {
                  node.length = merged.length
                }
              }
              sendJson(res, ok(null))
            })
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
              const uploadedName =
                decodeFileName(multipartField(body, 'fileName')) || multipartFilename(body)
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const segments = parseFilePath(path)
              if (!segments || segments.length === 0) {
                sendJson(res, fail(20004))
                return
              }
              const asFolder = findMockNode(userId, segments)
              const parentSeg =
                asFolder && !asFolder.is_file ? segments : segments.slice(0, -1)
              const fileName =
                asFolder && !asFolder.is_file
                  ? uploadedName
                  : uploadedName || segments[segments.length - 1]
              if (!fileName) {
                sendJson(res, fail(20004))
                return
              }
              const parent = findMockNode(userId, parentSeg)
              if (!parent || parent.is_file) {
                sendJson(res, fail(20004))
                return
              }
              const kids = parent.filesVOS ?? []
              const storedName = availableCopyName(
                kids.map((node) => node.fileName),
                fileName,
              )
              const fileBytes = fileBytesFromStored(bytes)
              const stored = mockNode(storedName, true)
              stored.length = fileBytes.length
              parent.filesVOS = [...kids, stored]
              mockFileBytes.set(`${FILE_PREFIX}/${[...parentSeg, storedName].join('/')}`, fileBytes)
              sendJson(res, ok(null))
            })
            return
          }

          void readBody(req).then((raw) => {
            let parsed: Record<string, unknown> = {}
            try {
              parsed = JSON.parse(raw || '{}') as Record<string, unknown>
            } catch {
              sendJson(res, fail(99999), 400)
              return
            }

            if (url === '/api/file/closeUpload') {
              const key = String(parsed.uploadKey ?? '')
              if (!mockUploads.has(key)) {
                sendJson(res, fail(20008))
                return
              }
              mockUploads.delete(key)
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/addStarFile') {
              const starPath = String(parsed.starFilePath ?? '')
              const denied = fileReadable(starPath, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const set = mockStars.get(userId) ?? new Set<string>()
              if (set.has(starPath)) {
                sendJson(res, fail(20009))
                return
              }
              set.add(starPath)
              mockStars.set(userId, set)
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/deleteStarredFile') {
              const starPath = String(parsed.starFilePath ?? '')
              const set = mockStars.get(userId) ?? new Set<string>()
              set.delete(starPath)
              mockStars.set(userId, set)
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/getStarredFiles') {
              const set = mockStars.get(userId) ?? new Set<string>()
              sendJson(
                res,
                ok([...set].map((starFilePath) => ({ starFilePath }))),
              )
              return
            }

            if (url === '/api/file/deleteFiles') {
              const list = Array.isArray(parsed) ? parsed : []
              for (const item of list) {
                const sourcePath = String((item as { path?: string }).path ?? '')
                const denied = fileWritable(sourcePath, token)
                if (denied) {
                  sendJson(res, fail(denied))
                  return
                }
                const sourceSegments = parseFilePath(sourcePath)
                if (!sourceSegments || sourceSegments.length < 2) {
                  sendJson(res, fail(20001))
                  return
                }
                const parent = findMockNode(userId, sourceSegments.slice(0, -1))
                const name = sourceSegments[sourceSegments.length - 1]
                const kids = parent?.filesVOS
                const target = kids?.find((node) => node.fileName === name)
                if (!parent || !kids || !target) {
                  sendJson(res, fail(20004))
                  return
                }
                parent.filesVOS = kids.filter((node) => node.fileName !== name)
                const bin = findMockNode(userId, [String(userId), 'recycle_bin'])
                if (bin && !bin.is_file) {
                  bin.filesVOS = [...(bin.filesVOS ?? []), target]
                }
              }
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/zip') {
              const sourcePath = String(parsed.path ?? '')
              let targetDir = String(parsed.targetDir ?? '')
              if (!targetDir) {
                const segs = parseFilePath(sourcePath)
                targetDir = segs && segs.length > 1 ? `${FILE_PREFIX}/${segs.slice(0, -1).join('/')}` : sourcePath
              }
              const denied = fileWritable(targetDir, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const sourceSegments = parseFilePath(sourcePath)
              const targetSegments = parseFilePath(targetDir)
              const source = sourceSegments && findMockNode(userId, sourceSegments)
              const target = targetSegments && findMockNode(userId, targetSegments)
              if (!source || !target || target.is_file) {
                sendJson(res, fail(20004))
                return
              }
              const archiveName = `${source.fileName.replace(/\.zip$/i, '')}.zip`
              if (target.filesVOS?.some((node) => node.fileName === archiveName)) {
                sendJson(res, fail(20006))
                return
              }
              const archive = mockNode(archiveName, true)
              archive.length = Math.max(1, source.length)
              target.filesVOS = [...(target.filesVOS ?? []), archive]
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/unzip') {
              const sourcePath = String(parsed.path ?? '')
              const targetDir = String(parsed.targetDir ?? '')
              const denied = fileWritable(targetDir, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const sourceSegments = parseFilePath(sourcePath)
              const targetSegments = parseFilePath(targetDir)
              const source = sourceSegments && findMockNode(userId, sourceSegments)
              if (
                !source ||
                !source.is_file ||
                !source.fileName.toLowerCase().endsWith('.zip') ||
                !targetSegments ||
                targetSegments.length === 0
              ) {
                sendJson(res, fail(20004))
                return
              }
              let target = findMockNode(userId, targetSegments)
              if (!target) {
                const parent = findMockNode(userId, targetSegments.slice(0, -1))
                const folderName = targetSegments[targetSegments.length - 1]
                if (!parent || parent.is_file || !folderName) {
                  sendJson(res, fail(20004))
                  return
                }
                if (parent.filesVOS?.some((node) => node.fileName === folderName)) {
                  sendJson(res, fail(20006))
                  return
                }
                target = mockNode(folderName, false, null)
                parent.filesVOS = [...(parent.filesVOS ?? []), target]
              } else if (target.is_file) {
                sendJson(res, fail(20004))
                return
              }
              sendJson(res, ok(null))
              return
            }

            const path = String(parsed.path ?? parsed.downloadFilePath ?? '')
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
              const parentPath = path.slice(0, path.lastIndexOf('/'))
              const stored = mockFileBytes.get(path)
              if (stored) {
                mockFileBytes.delete(path)
                mockFileBytes.set(`${parentPath}/${newName}`, stored)
              }
              target.fileName = newName
              sendJson(res, ok(null))
              return
            }

            if (url === '/api/file/moveFile') {
              const denied = fileWritable(path, token)
              if (denied) {
                sendJson(res, fail(denied))
                return
              }
              const targetDir = String(parsed.targetDir ?? parsed.target_dir ?? '').replace(/\/$/, '')
              const fileHandle = Number(parsed.fileHandle ?? parsed.file_handle ?? 0)
              const destDenied = fileWritable(targetDir, token)
              if (destDenied) {
                sendJson(res, fail(destDenied))
                return
              }
              const destSeg = parseFilePath(targetDir)
              if (!destSeg || destSeg.length === 0) {
                sendJson(res, fail(20005))
                return
              }
              if (segments.length === 1) {
                sendJson(res, fail(20001))
                return
              }
              const destFolder = findMockNode(userId, destSeg)
              if (!destFolder || destFolder.is_file) {
                sendJson(res, fail(20005))
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
              if (!target.is_file) {
                const movingPrefix = `${path.replace(/\/$/, '')}/`
                if (targetDir === path.replace(/\/$/, '') || targetDir.startsWith(movingPrefix)) {
                  sendJson(res, fail(20005))
                  return
                }
              }
              const destKids = destFolder.filesVOS ?? []
              const clash = destKids.find((node) => node.fileName === name)
              if (clash) {
                if (fileHandle === 2) {
                  sendJson(res, ok(null))
                  return
                }
                if (fileHandle !== 1) {
                  sendJson(res, fail(20006))
                  return
                }
                destFolder.filesVOS = destKids.filter((node) => node.fileName !== name)
              }
              parent.filesVOS = kids.filter((node) => node.fileName !== name)
              destFolder.filesVOS = [...(destFolder.filesVOS ?? []), target]
              const fromPrefix = path.replace(/\/$/, '')
              const toPrefix = `${targetDir}/${name}`
              for (const [key, bytes] of [...mockFileBytes.entries()]) {
                if (key === fromPrefix || key.startsWith(`${fromPrefix}/`)) {
                  mockFileBytes.delete(key)
                  mockFileBytes.set(toPrefix + key.slice(fromPrefix.length), bytes)
                }
              }
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
              const stored = mockFileBytes.get(path) ?? new TextEncoder().encode('mock-file\n')
              const full = fileBytesFromStored(stored)
              const downloadType = Number(parsed.downloadType ?? 0)
              const downloadedSize = Number(parsed.downloadedSize ?? 0)
              const bytes =
                downloadType === 1 && downloadedSize > 0 ? full.subarray(downloadedSize) : full
              const type = mimeFromName(node.fileName)
              res.statusCode = 200
              res.setHeader('Content-Type', type)
              res.setHeader(
                'Content-Disposition',
                `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(node.fileName)}`,
              )
              res.end(Buffer.from(bytes))
              return
            }

            sendJson(res, fail(20002))
          })
          return
        }

        if (!url.startsWith('/api/user/')) {
          next()
          return
        }

        if (req.method === 'GET' && url === '/api/user/logout') {
          const token = String(req.headers.token ?? '')
          sendJson(res, token ? ok(null) : fail(10000))
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
        timeout: 0,
        proxyTimeout: 0,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            const type = req.headers['content-type']
            if (typeof type === 'string' && type.includes('multipart/form-data')) {
              proxyReq.setHeader('Content-Type', type)
            }
          })
        },
      },
    },
  },
})