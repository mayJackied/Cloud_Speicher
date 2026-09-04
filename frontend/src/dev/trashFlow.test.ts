/**
 * 离线 mock：删除 → 同名再上传 → 还原，不应卡死，也不应出现 3 份/0 字节。
 * 测试自己启动 Vite mock API，不依赖外部 dev server，也不会静默 skip。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'

let base = ''
let server: ViteDevServer

beforeAll(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    throw new Error('Vite mock server did not expose a TCP port')
  }
  base = `http://127.0.0.1:${address.port}`
}, 30000)

afterAll(async () => {
  await server?.close()
})

async function login() {
  const res = await fetch(`${base}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: 'trashflow', password: 'password1' }),
  })
  const body = (await res.json()) as { code: number; data: { token: string; userId: number } }
  expect(body.code).toBe(1)
  return body.data
}

function headers(token: string) {
  return {
    token,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function getTree(token: string) {
  const res = await fetch(`${base}/api/file/getFiles`, { headers: { token, Accept: 'application/json' } })
  const body = (await res.json()) as { code: number; data: unknown[] }
  expect(body.code).toBe(1)
  return body.data as Array<{
    fileName: string
    is_file?: boolean
    isFile?: boolean
    length?: number
    filesVOS?: Array<{
      fileName: string
      is_file?: boolean
      isFile?: boolean
      length?: number
      filesVOS?: Array<{
        fileName: string
        is_file?: boolean
        isFile?: boolean
        length?: number
        filesVOS?: unknown
      }> | null
    }> | null
  }>
}

function roomOf(tree: Awaited<ReturnType<typeof getTree>>, userId: number) {
  return tree.find((n) => n.fileName === String(userId))
}

function kids(node: { filesVOS?: unknown } | undefined) {
  return (node?.filesVOS as Array<{ fileName: string; length?: number; is_file?: boolean }> | null) ?? []
}

describe('trash → reupload → restore (mock)', () => {
  it('同名删除后再上传不挂起，还原得到 (1) 且大小正常', async () => {
    const { token, userId } = await login()
    const folder = `TF_${Date.now().toString(36)}`
    const fileName = 'SAME.TXT'
    const dir = `../files/${userId}/${folder}`
    const bin = `../files/${userId}/recycle_bin`

    let res = await fetch(`${base}/api/file/addFile`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ is_file: false, path: dir }),
    })
    expect((await res.json()).code).toBe(1)

    const upload = async (name: string, body: string) => {
      const form = new FormData()
      form.append('path', dir)
      form.append('file', new File([body], name, { type: 'text/plain' }), name)
      const up = await fetch(`${base}/api/file/uploadFile`, {
        method: 'POST',
        headers: { token, Accept: 'application/json' },
        body: form,
      })
      return up.json() as Promise<{ code: number }>
    }

    expect((await upload(fileName, 'original-v1')).code).toBe(1)

    // 模拟前端：改唯一名再移入回收站
    const trashName = `$R${Date.now().toString(36)}.TXT`
    res = await fetch(`${base}/api/file/renameFile`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ path: `${dir}/${fileName}`, new_name: trashName }),
    })
    expect((await res.json()).code).toBe(1)
    res = await fetch(`${base}/api/file/moveFile`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ path: `${dir}/${trashName}`, targetDir: bin, fileHandle: 0 }),
    })
    expect((await res.json()).code).toBe(1)

    // 原目录应立刻可再传同名
    const reup = await Promise.race([
      upload(fileName, 'new-upload-v2'),
      new Promise<{ code: number }>((_, reject) =>
        setTimeout(() => reject(new Error('upload hung')), 15000),
      ),
    ])
    expect(reup.code).toBe(1)

    // 还原：站内改成 SAME(1).TXT 再移回
    const restored = 'SAME(1).TXT'
    res = await fetch(`${base}/api/file/renameFile`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ path: `${bin}/${trashName}`, new_name: restored }),
    })
    expect((await res.json()).code).toBe(1)
    res = await fetch(`${base}/api/file/moveFile`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ path: `${bin}/${restored}`, targetDir: dir, fileHandle: 0 }),
    })
    expect((await res.json()).code).toBe(1)

    const tree = await getTree(token)
    const folderNode = kids(roomOf(tree, userId)).find((n) => n.fileName === folder) as
      | { fileName: string; length?: number; filesVOS?: unknown }
      | undefined
    const files = kids(folderNode)
    const names = files.map((f) => f.fileName).sort()
    expect(names).toEqual([fileName, restored].sort())
    for (const f of files) {
      expect((f.length ?? 0) > 0).toBe(true)
    }
  }, 30000)
})
