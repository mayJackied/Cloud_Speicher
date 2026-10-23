# 交给 Claude 的后端 / 协议任务包

**前端 Phase A 状态（2026-10-21）：已完成。** 浏览器响应式收尾 + 多文件上传入队（汇总 toast）；Vitest / build 通过。下面三项原需后端契约或 Java 改动；**2026-10-21 已在本地前后端实现，见「完成状态」，待后端合入并部署。**

仓库前端：`NetworkDisk/frontend`。契约见 `Api.md`、对接备忘见 `备忘录.md`。后端不在此公开仓库里。

---

## 完成状态（2026-10-21）

| # | 项 | 后端（本地 `backend/`） | 前端 | 现网 |
|---|----|------------------------|------|------|
| 1 | 分享码复用并续期 | **完成** | **完成**（toast 区分沿用/新建） | 待部署 |
| 2 | 文件夹上传 | 后端改用自有方案（`initUploadFolder` 等五个接口，2026-10-22） | **已按后端协议对接**（2026-10-22） | 待现网手测 |
| 3 | 批量移动 `moveFiles` | **完成** | **完成**（多选移动已放开） | 待部署 |

- 后端改动在本地 `backend/` 检出（分支 `backend`，基于 `e0c4a7c`），**未提交、未推送**；需后端同学审阅合入并部署后，现网才生效。部署前前端调用 `moveFiles` 会 404，`reused` 字段缺省按「新建」提示。
- 验证：backend `mvn test` 12/12（`FileServiceImplTest` 已按现行 API 重写；`src/test/` 在后端 `.gitignore` 里，不随仓库）；frontend Vitest 139/139、`vue-tsc` + production build 通过。**未连现网手测。**
- 顺带修复（同文件、任务前置）：分享时长按小时计算（0/空→24，上限 720）；`deleteSharedFile` 改按 `share_file_links.sharer_id` 校验、未领取也可撤销；`ShareFileLink`/`ContinuableUpload` 主键 `IdType.INPUT`；`moveFile` 拒绝移进自身/子目录、`fileHandle` 空值不再 NPE、`7` 真正编号（原先会落入「替换」分支删掉目标）；`continuableUpload` 鉴权会话里的实际路径并校验 `targetPath` 一致（审计 N2/N3）。
- 未做：上传会话绑 `userId`（需改表，审计 H3）；拖放整个文件夹上传（目前只走按钮的目录选择器）；空文件夹不会随文件夹上传创建（浏览器不提供空目录条目）。

---

## 1. 分享码复用并刷新有效期（优先）— ✅ 已实现

### 现状问题

同一用户对同一文件路径多次点「分享」会每次新建一个 `shareKey`，旧码仍可能有效。手里会积多码，不知道该发哪个。

### 期望语义

- 同一 JWT 用户 + 同一 `shareFilePath`：
  - 若已有**未过期**的分享码 → **返回原 `shareKey`**，并把 `expireTime` **刷新**为 `now + expireDuration`（小时；前端现发 `24`）。
  - 若无未过期码 → 新建 UUID 码（去掉 `-`），按现有规则写库。
- 不同用户仍可各自领取同一码（全局非一次性）；同一接收者对同一路径再领仍可 `20011`。
- 过期或找不到 → 仍 `20010`。

### 接口

- 仍走 `POST /api/file/creatShareLink`，DTO：`{ shareFilePath, expireDuration }`。
- VO 建议增加可选字段，方便前端文案区分（没有也可先只返回 `shareKey`）：
  - `shareKey: string`
  - `reused?: boolean`（true = 沿用并续期；false/缺省 = 新建）

### 前端跟进（契约落地后）

- [`useDriveFiles.ts`](frontend/src/composables/useDriveFiles.ts) `createShareKey`
- [`CloudDrive.vue`](frontend/src/views/drive/CloudDrive.vue) `onShareSelected` toast：新建 / 沿用并续期

### 验收

- 同用户同路径连点两次分享：两次返回相同 `shareKey`，库里 `expireTime` 第二次更晚。
- 码过期后再申请：新码。
- 领取 / 撤销安全校验（`sharerId == JWT userId`）不要回退。

---

## 2. 文件夹上传协议（定时更新文件夹的前置）— ✅ 已实现（方案 A）

### 现状

- 前端已支持**多文件**上传到当前目录；**不支持**保留相对路径的文件夹上传。
- 文件夹下载：浏览器端递归打包 ZIP（不污染服务器）。
- 后端特色「对某文件夹定时更新/上传」依赖完整文件夹上传链路。

### 需要约定（请选定一种并写进 Api.md）

**推荐方案 A（上传路径自动建父目录）**

1. 前端用 `webkitdirectory` 或目录 picker，得到每个文件的相对路径（如 `docs/a/b.txt`）。
2. `initUpload` 的 `uploadFilePath` = `当前目录 + "/" + 相对路径`（经现有 `./files/...` 规范化）。
3. 后端在 `initUpload` / 首次 append 前对父目录 `mkdirs`；文件名非法、越权仍按现有错误码。
4. 续传语义不变：`continuableUploadFile` + `getUploadedSize` + `closeUpload`。

**方案 B**：先批量 `mkdir` 再建文件——多一轮往返，仅当 A 不好落地时再选。

### 前端将做（协议确认后）

- 网盘工具栏增加「上传文件夹」（与「上传」并列）。
- 按相对路径入队；toast 汇总「已加入 N 个上传任务」。
- 非法文件名跳过并计入 skipped。

### 验收

- 上传含嵌套子目录的文件夹后，`getFiles` 树结构与本地相对路径一致。
- 中断后续传仍按字节偏移工作。
- 普通用户不能写 public；根目录仍不可写。

### 暂缓

「文件夹定时更新」本身等本条上传闭环后再做。

---

## 3. 批量移动 API — ✅ 已实现（`POST /api/file/moveFiles`）

### 现状

- 前端多选时移动按钮调用会提示「批量移动暂不可用」；仅单选走 `moveFile`。
- 批量删除已有 `deleteFiles`（`List<DeleteFileDTO>`）。

### 期望

- 新接口例如 `POST /api/file/moveFiles`，body 为移动项列表；或扩展现有 `moveFile` 接受数组。
- 每项至少：`sourcePath`、`targetDir`（字段名与现网 `moveFile` 对齐）。
- 部分失败时：建议 `code=1` + 明细，或明确错误码；前端要能显示成功数 / 失败文件名（已有批量结果工具函数可复用）。

### 前端跟进

- 去掉 [`CloudDrive.vue`](frontend/src/views/drive/CloudDrive.vue) 多选移动禁用。
- 接列表 API，刷新当前目录。

### 验收

- 多选若干文件/文件夹，一次移到目标目录。
- 不能移入自身或子目录；撞名行为与单文件 `moveFile` 一致。

---

## 不在本包

- PWA / 底栏 / 原生客户端
- 好友系统、管理员用户管理后台（产品取舍：轻量化）
- 文件夹定时同步（依赖任务 2）
