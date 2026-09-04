import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import {
  addFile,
  deleteFile,
  deleteFiles,
  downloadFile,
  getFiles,
  moveFile,
  renameFile,
  unzipFile,
  uploadFile,
  zipFile,
} from '@/api/files'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { useTransferStore } from '@/stores/transfers'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import { fileBytesFromStored } from '@/dev/multipart'
import { mimeFromName } from '@/utils/fileKind'
import {
  FileHandle,
  FILE_STORAGE_PREFIX,
  childrenOf,
  isLegalFileName,
  joinServerPath,
  readFilesVOList,
  toServerPath,
  bytesOfNode,
  type FilesVO,
} from '@/types/file'
import { canDownloadInFolder, canWriteInFolder } from '@/utils/driveAccess'
import { uniqueExtractFolderName, isMacosxJunkName } from '@/utils/extractTarget'
import { availableCopyName, decodeFileName } from '@/utils/text'
import {
  RECYCLE_BIN_NAME,
  findRecycleBin,
  isInTrash,
  isProtectedRecycleBin,
  isRecycleBinName,
} from '@/utils/recycleBin'
import {
  TRASH_META_NAME,
  isTrashMetaName,
  makeTrashStoredName,
  mergeTrashMeta,
  parseTrashMetaText,
  readLocalTrashMeta,
  resolveRestoreLocation,
  serializeTrashMeta,
  serverPathSegments,
  writeLocalTrashMeta,
  type TrashMeta,
} from '@/utils/trashMeta'

function sortEntries(items: FilesVO[]): FilesVO[] {
  return [...items].sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1
    }
    return a.fileName.localeCompare(b.fileName, 'zh')
  })
}

function readDraftName(raw: string): string | null {
  const name = raw.trim()
  if (!name) {
    return null
  }
  return isLegalFileName(name) ? name : ''
}

async function resultFromBlob(data: Blob): Promise<{ code: number } | null> {
  const text = await data.text()
  try {
    const parsed: unknown = JSON.parse(text)
    return isResultShape(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function useDriveFiles() {
  const auth = useAuthStore()
  const transfers = useTransferStore()
  const roots = ref<FilesVO[]>([])
  const crumbs = ref<string[]>([])
  const loading = ref(false)
  const busy = ref(false)
  const message = ref('')
  const nameDraft = ref('')
  let trashMetaCache: TrashMeta | null = null
  let trashMetaSyncQueue: Promise<void> = Promise.resolve()

  const currentItems = computed(() => {
    if (crumbs.value.length === 0) {
      return sortEntries(roots.value)
    }
    let nodes = roots.value
    let current: FilesVO | undefined
    for (const name of crumbs.value) {
      current = nodes.find((node) => node.fileName === name)
      if (!current) {
        return []
      }
      nodes = childrenOf(current)
    }
    return sortEntries(nodes.filter((node) => !isTrashMetaName(node.fileName)))
  })

  const access = computed(() => ({
    crumbs: crumbs.value,
    userId: auth.user?.userId,
    isAdmin: auth.isAdmin,
  }))

  const canWrite = computed(() => canWriteInFolder(access.value))
  const canDownload = computed(() => canDownloadInFolder(access.value))

  const atRoot = computed(() => crumbs.value.length === 0)

  const showActions = computed(() => canWrite.value || canDownload.value)

  function labelOf(name: string): string {
    if (name === 'public') {
      return '公共'
    }
    if (auth.user && name === String(auth.user.userId)) {
      return `我的房间（${name}）`
    }
    return name
  }

  function trimCrumbs() {
    let nodes = roots.value
    const kept: string[] = []
    for (const name of crumbs.value) {
      const found = nodes.find((node) => node.fileName === name && !node.isFile)
      if (!found) {
        break
      }
      kept.push(name)
      nodes = childrenOf(found)
    }
    crumbs.value = kept
  }

  async function load(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) {
      loading.value = true
    }
    message.value = ''
    try {
      const { data } = await getFiles()
      if (!isResultShape(data)) {
        message.value = '返回不是 Result'
        return
      }
      if (data.code !== ErrorCode.OK) {
        message.value = messageForCode(data.code)
        return
      }
      const list = readFilesVOList(data.data)
      if (!list) {
        message.value = '文件列表形状不对'
        return
      }
      roots.value = list
      trimCrumbs()
    } catch (error) {
      if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
        message.value = messageForCode(error.response.data.code)
        return
      }
      message.value = '无法连接服务器'
    } finally {
      if (!opts?.quiet) {
        loading.value = false
      }
    }
  }

  function enter(node: FilesVO) {
    if (node.isFile) {
      return
    }
    crumbs.value = [...crumbs.value, node.fileName]
  }

  function goRoot() {
    crumbs.value = []
  }

  function goTo(index: number) {
    crumbs.value = crumbs.value.slice(0, index + 1)
  }

  function goUp() {
    crumbs.value = crumbs.value.slice(0, -1)
  }

  function itemPath(name: string): string {
    return toServerPath([...crumbs.value, name])
  }

  function currentDirPath(): string {
    return toServerPath(crumbs.value)
  }

  function requireName(action: string): string | undefined {
    const parsed = readDraftName(nameDraft.value)
    if (parsed === null) {
      message.value = `请先在名称框里填写${action}`
      return undefined
    }
    if (parsed === '') {
      message.value = messageForCode(ErrorCode.FILE_NAME_ILLEGAL)
      return undefined
    }
    return parsed
  }

  async function mutate(run: () => Promise<unknown>) {
    if (!canWrite.value) {
      message.value = messageForCode(ErrorCode.NO_PERMISSION)
      return
    }
    if (busy.value) {
      message.value = '请等待当前操作完成'
      return
    }
    busy.value = true
    message.value = ''
    try {
      const data = await run()
      if (!isResultShape(data)) {
        message.value = '返回不是 Result'
        return
      }
      if (data.code !== ErrorCode.OK) {
        message.value = messageForCode(data.code)
        return
      }
      await load({ quiet: true })
    } catch (error) {
      if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
        message.value = messageForCode(error.response.data.code)
        return
      }
      if (
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
        (isAxiosError(error) && error.code === 'ECONNABORTED')
      ) {
        message.value = '操作超时，请重试'
        return
      }
      message.value = '无法连接服务器'
    } finally {
      busy.value = false
    }
  }

  async function createFolder(explicitName?: string) {
    if (typeof explicitName === 'string') {
      nameDraft.value = explicitName
    }
    if (atRoot.value || !canWrite.value) {
      return
    }
    const name = requireName('文件夹名称')
    if (!name) {
      return
    }
    await mutate(async () => {
      const { data } = await addFile({ isFile: false, path: itemPath(name) })
      return data
    })
    if (!message.value) {
      nameDraft.value = ''
    }
  }

  async function renameItem(node: FilesVO, explicitName?: string) {
    if (typeof explicitName === 'string') {
      nameDraft.value = explicitName
    }
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (isProtectedRecycleBin(crumbs.value, node, auth.user?.userId)) {
      message.value = '不能重命名回收站'
      return
    }
    const name = requireName('新名称')
    if (!name) {
      return
    }
    if (name === node.fileName) {
      return
    }
    if (
      isRecycleBinName(name) &&
      crumbs.value.length === 1 &&
      auth.user &&
      crumbs.value[0] === String(auth.user.userId)
    ) {
      message.value = '不能重命名为回收站'
      return
    }
    await mutate(async () => {
      const { data } = await renameFile({ path: itemPath(node.fileName), newName: name })
      return data
    })
    if (!message.value) {
      nameDraft.value = ''
    }
  }

  async function removeItem(node: FilesVO) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (isProtectedRecycleBin(crumbs.value, node, auth.user?.userId)) {
      message.value = '不能删除回收站'
      return
    }
    await mutate(async () => {
      const { data } = await deleteFile({ path: itemPath(node.fileName) })
      return data
    })
  }

  function findNodeAt(segments: readonly string[]): FilesVO | null {
    if (segments.length === 0) {
      return null
    }
    let nodes = roots.value
    let current: FilesVO | undefined
    for (const name of segments) {
      current = nodes.find((node) => node.fileName === name)
      if (!current) {
        return null
      }
      nodes = childrenOf(current)
    }
    return current ?? null
  }

  async function readTrashMeta(binName: string): Promise<TrashMeta> {
    const userId = auth.user?.userId
    if (userId == null) {
      return {}
    }
    if (trashMetaCache) {
      return { ...trashMetaCache }
    }
    const local = readLocalTrashMeta(userId)
    let remote: TrashMeta = {}
    try {
      const { data, headers } = await downloadFile({
        path: toServerPath([String(userId), binName, TRASH_META_NAME]),
      })
      if (data instanceof Blob && !String(headers['content-type'] ?? '').includes('json')) {
        const bytes = fileBytesFromStored(new Uint8Array(await data.arrayBuffer()))
        remote = parseTrashMetaText(new TextDecoder().decode(bytes))
      }
    } catch {
      // 旧回收站可能没有元数据文件；本机索引仍可用。
    }
    trashMetaCache = mergeTrashMeta(remote, local)
    writeLocalTrashMeta(userId, trashMetaCache)
    return { ...trashMetaCache }
  }

  /** 尽力把索引写到回收站；失败不影响删除/还原，且绝不阻塞 busy。 */
  function scheduleTrashMetaSync(binName: string, meta: TrashMeta): void {
    const userId = auth.user?.userId
    if (userId == null) {
      return
    }
    trashMetaCache = { ...meta }
    writeLocalTrashMeta(userId, trashMetaCache)
    trashMetaSyncQueue = trashMetaSyncQueue.then(async () => {
      const roomDir = toServerPath([String(userId)])
      const binDir = toServerPath([String(userId), binName])
      const metaPath = toServerPath([String(userId), binName, TRASH_META_NAME])
      const tmpName = `_trash_meta_${Date.now().toString(36)}.json`
      const stagedPath = toServerPath([String(userId), tmpName])
      const binTmpPath = toServerPath([String(userId), binName, tmpName])
      try {
        const file = new File([serializeTrashMeta(meta)], tmpName, {
          type: 'application/json',
        })
        // 与普通上传相同：先落到房间根再 move，避开现网子目录 0 字节。
        const uploaded = await uploadFile(roomDir, file)
        if (!isResultShape(uploaded.data) || uploaded.data.code !== ErrorCode.OK) {
          return
        }
        const moved = await moveFile({
          path: stagedPath,
          targetDir: binDir,
          fileHandle: FileHandle.DEFAULT,
        })
        if (!isResultShape(moved.data) || moved.data.code !== ErrorCode.OK) {
          await deleteFile({ path: stagedPath })
          return
        }
        await deleteFile({ path: metaPath })
        await renameFile({ path: binTmpPath, newName: TRASH_META_NAME })
      } catch {
        try {
          await deleteFile({ path: stagedPath })
        } catch {
          /* ignore */
        }
        try {
          await deleteFile({ path: binTmpPath })
        } catch {
          /* ignore */
        }
      }
    })
  }

  async function ensureRecycleBin(): Promise<string | null> {
    const userId = auth.user?.userId
    if (userId == null) {
      return null
    }
    const room = roots.value.find((node) => node.fileName === String(userId))
    const existing = findRecycleBin(room)
    if (existing) {
      await readTrashMeta(existing.fileName)
      return existing.fileName
    }
    const { data } = await addFile({
      isFile: false,
      path: toServerPath([String(userId), RECYCLE_BIN_NAME]),
    })
    if (!isResultShape(data) || data.code !== ErrorCode.OK) {
      return null
    }
    await load({ quiet: true })
    const binName =
      findRecycleBin(roots.value.find((node) => node.fileName === String(userId)))?.fileName ??
      RECYCLE_BIN_NAME
    await readTrashMeta(binName)
    return binName
  }

  /** 移入回收站：落盘用唯一 $R… 名，本机记下原路径；远端索引异步写。 */
  async function trashItem(node: FilesVO) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (isProtectedRecycleBin(crumbs.value, node, auth.user?.userId)) {
      message.value = '不能删除回收站'
      return
    }
    if (isTrashMetaName(node.fileName)) {
      return
    }
    const userId = auth.user?.userId
    if (userId == null) {
      return
    }
    if (isInTrash(crumbs.value, userId)) {
      return
    }
    const fromDir = currentDirPath()
    const originalName = node.fileName
    await mutate(async () => {
      const binName = await ensureRecycleBin()
      if (!binName) {
        return { code: ErrorCode.FILE_OPERATION_FAILED, data: null }
      }
      const room = roots.value.find((row) => row.fileName === String(userId))
      const bin = findRecycleBin(room)
      const taken = new Set((bin?.filesVOS ?? []).map((row) => row.fileName))
      let destName = makeTrashStoredName(originalName)
      while (taken.has(destName)) {
        destName = makeTrashStoredName(originalName)
      }
      const renamed = await renameFile({ path: itemPath(originalName), newName: destName })
      if (!isResultShape(renamed.data) || renamed.data.code !== ErrorCode.OK) {
        return renamed.data
      }
      const moved = await moveFile({
        path: itemPath(destName),
        targetDir: toServerPath([String(userId), binName]),
        fileHandle: FileHandle.DEFAULT,
      })
      if (!isResultShape(moved.data) || moved.data.code !== ErrorCode.OK) {
        await renameFile({ path: itemPath(destName), newName: originalName })
        return moved.data
      }
      const meta = {
        ...(await readTrashMeta(binName)),
        [destName]: { from: fromDir, name: originalName },
      }
      writeLocalTrashMeta(userId, meta)
      scheduleTrashMetaSync(binName, meta)
      return moved.data
    })
  }

  async function ensureServerDir(dir: string): Promise<{ code: number; data: null }> {
    const segs = serverPathSegments(dir)
    if (!segs || segs.length === 0) {
      return { code: ErrorCode.FILE_ILLEGAL, data: null }
    }
    for (let i = 1; i <= segs.length; i += 1) {
      const slice = segs.slice(0, i)
      const existing = findNodeAt(slice)
      if (existing) {
        if (existing.isFile) {
          return { code: ErrorCode.FILE_ILLEGAL, data: null }
        }
        continue
      }
      const created = await addFile({ isFile: false, path: toServerPath(slice) })
      if (!isResultShape(created.data)) {
        return { code: ErrorCode.EXCEPTION, data: null }
      }
      if (created.data.code !== ErrorCode.OK && created.data.code !== ErrorCode.FILE_DUPLICATE) {
        return created.data
      }
      const listed = await getFiles()
      if (isResultShape(listed.data) && listed.data.code === ErrorCode.OK) {
        const tree = readFilesVOList(listed.data.data)
        if (tree) {
          roots.value = tree
        }
      }
    }
    return { code: ErrorCode.OK, data: null }
  }

  /**
   * Windows 思路：只还原回收站根下整项。先在站内改成目标可用名再 move，
   * 避免 _restore_ 半成品和静默丢根目录。
   */
  async function restoreItem(node: FilesVO) {
    const userId = auth.user?.userId
    if (userId == null || !isInTrash(crumbs.value, userId) || !canWrite.value) {
      return
    }
    if (isTrashMetaName(node.fileName)) {
      return
    }
    const binName = crumbs.value[1]
    if (!binName) {
      return
    }
    if (crumbs.value.length > 2) {
      message.value = '请在回收站根目录还原整个文件夹'
      return
    }
    await mutate(async () => {
      const meta = await readTrashMeta(binName)
      if (!meta[node.fileName]) {
        return { code: ErrorCode.FILE_NOT_FOUND, data: null }
      }
      const loc = resolveRestoreLocation({
        crumbs: crumbs.value,
        fileName: node.fileName,
        meta,
        userId,
      })
      if (loc.nested) {
        return { code: ErrorCode.FILE_ILLEGAL, data: null }
      }
      const targetDir = loc.targetDir
      const wantName = loc.wantName

      const ensured = await ensureServerDir(targetDir)
      if (ensured.code !== ErrorCode.OK) {
        return ensured
      }

      const listed = await getFiles()
      if (isResultShape(listed.data) && listed.data.code === ErrorCode.OK) {
        const tree = readFilesVOList(listed.data.data)
        if (tree) {
          roots.value = tree
        }
      }

      const segs = serverPathSegments(targetDir) ?? [String(userId)]
      const parent = findNodeAt(segs)
      const taken = (parent?.filesVOS ?? [])
        .filter((row) => !isTrashMetaName(row.fileName) && !isRecycleBinName(row.fileName))
        .map((row) => row.fileName)
      const finalName = availableCopyName(taken, wantName)

      let moveName = node.fileName
      if (finalName !== node.fileName) {
        const trashTaken = currentItems.value.map((row) => row.fileName)
        let renameTo = finalName
        if (trashTaken.includes(finalName)) {
          renameTo = availableCopyName(trashTaken, finalName)
        }
        const staged = await renameFile({ path: itemPath(node.fileName), newName: renameTo })
        if (!isResultShape(staged.data) || staged.data.code !== ErrorCode.OK) {
          return staged.data
        }
        moveName = renameTo
      }

      const moved = await moveFile({
        path: itemPath(moveName),
        targetDir,
        fileHandle: FileHandle.DEFAULT,
      })
      if (!isResultShape(moved.data) || moved.data.code !== ErrorCode.OK) {
        if (moveName !== node.fileName) {
          await renameFile({
            path: toServerPath([String(userId), binName, moveName]),
            newName: node.fileName,
          })
        }
        return moved.data
      }

      if (moveName !== finalName) {
        const renamed = await renameFile({
          path: toServerPath([...segs, moveName]),
          newName: finalName,
        })
        if (!isResultShape(renamed.data) || renamed.data.code !== ErrorCode.OK) {
          // 已回到原目录，名字不是最终名也比丢文件好
          return renamed.data
        }
      }

      if (meta[node.fileName]) {
        delete meta[node.fileName]
        trashMetaCache = { ...meta }
        writeLocalTrashMeta(userId, meta)
        scheduleTrashMetaSync(binName, meta)
      }
      return { code: ErrorCode.OK, data: null }
    })
  }

  function trashLabelOf(fileName: string): string {
    const userId = auth.user?.userId
    if (userId == null) {
      return fileName
    }
    const entry = readLocalTrashMeta(userId)[fileName]
    return entry?.name || fileName
  }

  async function uploadPicked(file: File | undefined) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (!file) {
      message.value = '请选择要上传的文件'
      return
    }
    const finalName = decodeFileName(file.name)
    if (!isLegalFileName(finalName)) {
      message.value = messageForCode(ErrorCode.FILE_NAME_ILLEGAL)
      return
    }
    if (!crumbs.value[0]) {
      return
    }
    await transfers.enqueueUpload(file, currentDirPath())
    message.value = '已加入传输列表'
  }

  async function moveItem(node: FilesVO, targetDir: string) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (isProtectedRecycleBin(crumbs.value, node, auth.user?.userId)) {
      message.value = '不能移动回收站'
      return
    }
    const dir = targetDir.trim()
    if (!dir) {
      message.value = '请填写目标目录'
      return
    }
    await mutate(async () => {
      const { data } = await moveFile({
        path: itemPath(node.fileName),
        targetDir: dir,
        fileHandle: FileHandle.DEFAULT,
      })
      return data
    })
  }

  /** 批量删除走后端 `deleteFiles`（List&lt;DeleteFileDTO&gt;）。 */
  async function trashItems(nodes: readonly FilesVO[]) {
    if (atRoot.value || !canWrite.value || nodes.length === 0) {
      return
    }
    if (nodes.some((node) => isProtectedRecycleBin(crumbs.value, node, auth.user?.userId))) {
      message.value = '不能删除回收站'
      return
    }
    const targets = nodes.filter((node) => !isTrashMetaName(node.fileName))
    if (targets.length === 0) {
      return
    }
    if (targets.length === 1) {
      await trashItem(targets[0]!)
      return
    }
    await mutate(async () => {
      const { data } = await deleteFiles(
        targets.map((node) => ({ path: itemPath(node.fileName) })),
      )
      return data
    })
  }

  async function compressItem(node: FilesVO) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    await mutate(async () => {
      const { data } = await zipFile({
        path: itemPath(node.fileName),
        targetDir: currentDirPath(),
      })
      return data
    })
  }

  function namesInServerDir(dir: string): string[] {
    return nodeAtServerDir(dir)?.map((node) => node.fileName) ?? []
  }

  function nodeAtServerDir(dir: string): FilesVO[] | null {
    const normalized = dir.replace(/\\/g, '/').replace(/\/+$/, '')
    const prefix = `${FILE_STORAGE_PREFIX}/`
    if (normalized !== FILE_STORAGE_PREFIX && !normalized.startsWith(prefix)) {
      return null
    }
    const segments =
      normalized === FILE_STORAGE_PREFIX ? [] : normalized.slice(prefix.length).split('/').filter(Boolean)
    let nodes = roots.value
    for (const name of segments) {
      const current = nodes.find((node) => node.fileName === name)
      if (!current || current.isFile) {
        return null
      }
      nodes = childrenOf(current)
    }
    return nodes
  }

  function findServerNode(path: string): FilesVO | null {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
    const prefix = `${FILE_STORAGE_PREFIX}/`
    if (!normalized.startsWith(prefix)) {
      return null
    }
    const segments = normalized.slice(prefix.length).split('/').filter(Boolean)
    if (segments.length === 0) {
      return null
    }
    let nodes = roots.value
    let current: FilesVO | undefined
    for (const name of segments) {
      current = nodes.find((node) => node.fileName === name)
      if (!current) {
        return null
      }
      nodes = childrenOf(current)
    }
    return current ?? null
  }

  /** 尽力删掉解压目录里的 __MACOSX（含非空目录：先整夹删除，失败再递归清子项）。失败不影响解压结果。 */
  async function scrubMacosxJunk(extractRoot: string) {
    const junkPath = joinServerPath(extractRoot, '__MACOSX')
    const junk = findServerNode(junkPath)
    if (!junk || !isMacosxJunkName(junk.fileName)) {
      return
    }
    try {
      const { data } = await deleteFile({ path: junkPath })
      if (isResultShape(data) && data.code === ErrorCode.OK) {
        await load({ quiet: true })
        return
      }
      await deleteTree(junkPath, junk)
      await load({ quiet: true })
    } catch {
      /* best-effort */
    }
  }

  async function deleteTree(path: string, node: FilesVO) {
    if (!node.isFile) {
      for (const child of [...childrenOf(node)]) {
        await deleteTree(joinServerPath(path, child.fileName), child)
      }
    }
    const { data } = await deleteFile({ path })
    if (isResultShape(data) && data.code !== ErrorCode.OK && data.code !== ErrorCode.FILE_NOT_FOUND) {
      throw new Error(String(data.code))
    }
  }

  /** 解压到 parentDir 下与压缩包同名的新文件夹；默认 parentDir 为当前目录。 */
  async function extractItem(node: FilesVO, parentDir?: string) {
    if (atRoot.value || !canWrite.value || !node.isFile) {
      return
    }
    if (!node.fileName.toLowerCase().endsWith('.zip')) {
      message.value = messageForCode(ErrorCode.FILE_ILLEGAL)
      return
    }
    const parent = (parentDir?.trim() || currentDirPath()).replace(/[\\/]+$/, '')
    const folderName = uniqueExtractFolderName(namesInServerDir(parent), node.fileName)
    const targetDir = joinServerPath(parent, folderName)
    await mutate(async () => {
      const { data } = await unzipFile({
        path: itemPath(node.fileName),
        targetDir,
      })
      return data
    })
    if (!message.value) {
      await scrubMacosxJunk(targetDir)
    }
  }

  function goPath(segments: string[]) {
    crumbs.value = [...segments]
  }

  async function blobForItem(node: FilesVO): Promise<Blob | null> {
    if (!node.isFile) {
      return null
    }
    if (!canDownload.value) {
      message.value = messageForCode(ErrorCode.NO_PERMISSION)
      return null
    }
    const { data, headers } = await downloadFile({ path: itemPath(node.fileName) })
    if (!(data instanceof Blob)) {
      return null
    }
    const type = String(headers['content-type'] ?? '')
    if (type.includes('json')) {
      const body = await resultFromBlob(data)
      message.value = body ? messageForCode(body.code) : '下载失败'
      return null
    }
    const payload = fileBytesFromStored(new Uint8Array(await data.arrayBuffer()))
    return new Blob([payload], { type: mimeFromName(node.fileName) || type })
  }

  function usedBytesOf(nodes: FilesVO[]): number {
    return nodes.reduce((total, node) => total + bytesOfNode(node), 0)
  }

  const usedBytes = computed(() => {
    const room = auth.user ? roots.value.find((node) => node.fileName === String(auth.user?.userId)) : null
    return room ? usedBytesOf([room]) : usedBytesOf(roots.value)
  })

  function goInto(name: string) {
    crumbs.value = [name]
  }

  async function downloadItem(node: FilesVO) {
    if (!node.isFile) {
      return
    }
    if (!canDownload.value) {
      message.value = messageForCode(ErrorCode.NO_PERMISSION)
      return
    }
    await transfers.enqueueDownload({
      fileName: decodeFileName(node.fileName),
      sourcePath: itemPath(node.fileName),
      totalBytes: bytesOfNode(node),
      saveLocation: '浏览器默认下载目录',
      saveStrategy: 'browser-download',
    })
    message.value = '已加入传输列表'
  }

  return {
    roots,
    crumbs,
    loading,
    busy,
    message,
    nameDraft,
    currentItems,
    canWrite,
    canDownload,
    atRoot,
    showActions,
    labelOf,
    load,
    enter,
    goRoot,
    goTo,
    goUp,
    createFolder,
    renameItem,
    removeItem,
    trashItem,
    trashItems,
    restoreItem,
    trashLabelOf,
    uploadPicked,
    downloadItem,
    moveItem,
    compressItem,
    extractItem,
    blobForItem,
    usedBytes,
    goInto,
    goPath,
    itemPath,
    currentDirPath,
    ensureRecycleBin,
  }
}
