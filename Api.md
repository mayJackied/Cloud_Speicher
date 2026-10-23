# API 契约（前端 / 后端）

当前用这份文档对接。对象细节以 backend 分支 `conteact/` 为准；**Java 源码优先于 conteact 草稿**（conteact 里仍有 `invite_code` 整型、`msg` 等过时写法）。
Swagger 后做。数据库 MySQL，服务器 `8.130.215.175:8080`（FRP，不一定一直通）。对照表：`conteact/ErrorCode.md`。

约定：
- DTO = 前端 → 后端（JSON 体加 `@RequestBody`；上传文件除外）
- VO = 后端 → 前端（包在 `Result.data` 里）
- `Result { Integer code; T data }`：**没有 `msg`**
  - `code = 1` 成功
  - 失败时 `code` 本身就是错误码（10000+ / 20000+ / 99999），前端查本地对照表显示文案（方便以后多语言）
- JSON：多数字段驼峰；部分布尔/改名被 Java `@JsonProperty` 成蛇形，见字段表
- 密码只出现在请求里
- 需要登录的接口：请求头 **`token`** = `LoginVO.token`（不是 Bearer）。用户 id 从 JWT 取，**不要再在 DTO 里传 userId**
- JWT 有效期 **30 天**。到期后接口回 `10000`；退出/删号后该 token 进黑名单，再请求回 `10013`。前端两种都清会话回登录页。**不做 refresh**
- `no jwt`：`/checkUserName`、`/login`、`/register`
- 未登录 / token 过期：`code = 10000`；token 已作废：`code = 10013`。前端都清会话并回登录页
- `Document` 对象已删除，不要再对接 `documentId`

产品模型：多用户、单人单间、共享一块服务器硬盘。每人磁盘目录用 JWT 里的 `user_id` 定位。另有一块 public 目录，列表接口会一并返回。

---

## 统一外壳

```text
Result<T> { Integer code; T data; }
```

| code | 含义 |
|------|------|
| 1 | 成功，`data` 为 VO（无 data 的接口可为 null） |
| 10000+ | 用户/鉴权类失败，见错误码表 |
| 20000+ | 文件类失败 |
| 99999 | 后端处理错误 |

HTTP 仍可能是 200 包着失败码，或 4xx/500。前端两种都读 `code`。

---

## 错误码（前端按这个显示）

完整表见 backend `conteact/ErrorCode.md`。常用：

| code | 名 | 中文 |
|------|----|------|
| 99999 | EXCEPTION | 后端处理错误 |
| 10000 | NOT_LOGIN | 没有登录 |
| 10001 | USER_NOT_FOUND | 没有此账号 |
| 10002 | NOT_ADMIN | 您不是管理员 |
| 10003–10008 | USERNAME_* / PASSWORD_* | 用户名/密码空、长度、格式 |
| 10009 | INVITE_CODE_EMPTY | 邀请码不能为空 |
| 10010 | INVITE_CODE_INVALID | 无效的邀请码 |
| 10011 | USERNAME_OR_PASSWORD_INVALID | 用户名或密码不正确 |
| 10012 | DELETE_USER_FAILED | 删除用户失败 |
| 10013 | BLACKLISTED_JWT | JWT 已作废（退出或删号后） |
| 20001 | NO_PERMISSION | 您没有权限操作此文件 |
| 20002 | FILE_OPERATION_FAILED | 文件操作失败 |
| 20003 | FILE_NAME_ILLEGAL | 文件名不合法 |
| 20004 | FILE_NOT_FOUND | 文件不存在 |
| 20005 | FILE_ILLEGAL | 文件不符合约定 |
| 20006 | FILE_DUPLICATE | 存在同名文件 |

没有「用户名已存在」错误码。查重走 `checkUserName`，`data.is_available === false`。

---

## 用户名 / 密码（前后端一致）

- 用户名：非空；3–20；字母开头；只含字母数字下划线
- 密码：非空；8–64；必须同时有字母和数字，**且只能字母和数字**
- 确认密码只在前端
- 邀请码：非空字符串（Java 是 `String inviteCode`，生成值为 UUID）

---

## 接口

### 用户　`/api/user`

*check_user_name*　no jwt  
POST `/api/user/checkUserName`  
DTO: `{ name }`  
VO: `{ is_available: boolean }`（Jackson 字段名 `is_available`）

*register*　no jwt  
POST `/api/user/register`  
DTO: `{ name, password, inviteCode }`  
VO: `LoginVO`  
邀请码一次性：用过再注册别人 → `10010`

*login*　no jwt  
POST `/api/user/login`  
DTO: `{ name, password }`  
VO: `LoginVO`

*creat_invite_code*　要 JWT（管理员）  
GET `/api/user/creatInviteCode`  
DTO: 无（id 从 token 解析）  
VO: `{ inviteCode }`

*delete*　要 JWT  
POST `/api/user/delete`  
DTO: 无  
VO: `Void`  
成功后该 token 进黑名单，再请求回 `10013`

*logout*　要 JWT  
GET `/api/user/logout`  
DTO: 无  
VO: `Void`  
Java 是 GET（conteact 写成了 POST，以源码为准）。把当前 token 拉黑；前端清会话回登录。之后同一 token → `10013`

### 文件　`/api/file`（均要 JWT；P3/P4 再铺页面）

*get_files*　GET `/api/file/getFiles`  
DTO: 无  
VO: `FileVOS { fileListVOS, sharedFileVOS }`
`fileListVOS` 是 public 根 + 当前用户根；`sharedFileVOS` 是别人分享给当前用户的条目。

*add_file*　POST `/api/file/addFile`  
DTO: `FileDTO` `{ is_file: boolean, path }`　JSON（Java 已把 AddFileDTO 改名为 FileDTO）  
VO: `Void`

*delete_file*　POST `/api/file/deleteFile`  
DTO: `{ path }`  
VO: `Void`  
现网语义多为**软删**进回收站（以 Java 为准）。

*delete_files*　POST `/api/file/deleteFiles`  
DTO: `DeleteFileDTO[]`（JSON 数组，每项 `{ path }`）  
VO: `Void`  
批量软删；前端多选删除走此接口。

*rename_file*　POST `/api/file/renameFile`  
DTO: `{ path, new_name }`  
`new_name` 不能空、不能 `.` / `..`、不能含 `/` 或 `\`  
VO: `Void`

*upload_file*（兼容封装）  
旧整包 `POST /api/file/uploadFile` **已移除**。前端 `uploadFile()` 现封装为：`initUpload` → 一次 `continuableUploadFile` → `closeUpload`。

*init_upload*　POST `/api/file/initUpload`
DTO: `InitUploadDTO { uploadFilePath }`（完整目标文件路径，例如 `./files/8/video.mp4`）
VO: `Result<String>`（uploadKey / UUID）；后端在会话表同时记录目标路径
文件夹上传不走这里，见下方「文件夹断点上传」。

*continuable_upload_file*　POST `/api/file/continuableUploadFile?uploadKey=&filePath=`
请求体：`application/octet-stream` 原始文件字节；`@ModelAttribute ContinuableUploadDTO` 只绑定查询参数 `{ uploadKey, filePath }`。
**2026-10-22 后端改动：** `ContinuableUploadDTO` 的 `targetPath`（目录）改为 `filePath`（上传文件的**完整路径**，与 init 的 `uploadFilePath` 相同）。前端已同步。
VO: `Result<Void>`  
后端直接从 `HttpServletRequest.getInputStream()` 边收边追加到 init 登记的文件。网络中断时已收到部分仍会落盘；恢复前先查 size，再发送原文件剩余部分。

*get_uploaded_size*　GET `/api/file/getUploadedSize?uploadKey=`  
VO: `Result<Long>`（已落盘字节，权威 offset；文件不存在时返回 `0`）

*close_upload*　POST `/api/file/closeUpload`  
DTO: `{ uploadKey }`  
VO: `Result<Void>`（删除上传会话行）

*文件夹断点上传*（后端 2026-10-22 补丁；前端已对接）
1. `POST /api/file/initUploadFolder` — DTO: `List<InitUploadFolderDTO>`，`InitUploadFolderDTO { "is_file": boolean, uploadFilePath }`。一次登记整个文件夹：所有文件夹（前端逐级列出，父在前）+ 所有文件，路径均为完整服务端路径（如 `./files/8/docs`、`./files/8/docs/a.txt`）。VO: `Result<String>`（整个文件夹共用的 uploadKey）。
2. `POST /api/file/uploadFolder?uploadKey=&filePath=` — 请求体为该文件的原始字节（`application/octet-stream`，同 `continuableUploadFile`）；`filePath` = 该文件完整路径。
3. 中断后 `POST /api/file/getUploadedFolderStatus` — DTO: `GetUploadedSizeDTO { uploadKey }`；VO: `List<GetUploadedFolderStatusVO { uploadFilePath, status, size }>`，`status` 0 未开始 / 1 进行中（`size` = 已落盘字节）/ 2 已完成（`size = -1`）。前端按 `uploadFilePath` 找到该文件，从 `size` 起发送剩余字节；比较路径时忽略 `./` 前缀与 `\`、`/` 差异。
4. 每个文件传完 `POST /api/file/closeOneUpload` — DTO: `CloseOneUploadDTO { uploadKey, filePath }`。
5. 全部传完 `POST /api/file/closeUploadFolder` — DTO: `CloseUploadDTO { uploadKey }`。

前端约定（后端未明确的项按此假设实现，待确认）：
- `uploadFolder` 与 `continuableUploadFile` 同格式：原始字节流，`uploadKey`、`filePath` 走查询参数。
- 组内文件**逐个**上传；单个取消不关会话；组内全部完成/取消后才调 `closeUploadFolder`，有失败项时会话保持以便重试。
- 顶层文件夹与当前目录已有条目重名时，前端先改成 `名(1)` 再登记，不合并进旧文件夹。
- 空文件夹：浏览器目录选择器拿不到，不会登记。

*get_download_file_size*　GET `/api/file/getDownloadFileSize?path=`
VO: `Result<Long>`（下载前查询服务端实际文件大小）

*download_file*　POST `/api/file/downloadFile`  
DTO: `ContinuableDownloadDTO` `{ downloadFilePath, downloadedSize?, downloadType }`  
`downloadType`：0 首次全量；1 从 `downloadedSize` 跳过后续只传剩余。  
成功：二进制流（`Content-Disposition: attachment`），**不是 Result**  
失败：可能走异常处理器变成 `Result` 错误码（含 `20007` 回收站禁止）

*add_star_file*　POST `/api/file/addStarFile`  
DTO: `{ starFilePath }`  
VO: `Void`；已收藏 → `20009`

*delete_starred_file*　POST `/api/file/deleteStarredFile`  
DTO: `{ starFilePath }`  
VO: `Void`

*get_starred_files*　POST `/api/file/getStarredFiles`  
DTO: 无  
VO: `List<StarredFileVO>`（`{ starFilePath }`）  
前端侧栏「收藏」拉此列表展示。

*creat_share_link*　POST `/api/file/creatShareLink`
DTO: `CreatShareLinkDTO { shareFilePath, expireDuration }`（小时）
VO: `CreatShareLinkVO { shareKey, reused }`
注意后端路径和类型名当前就是 `creat`。`expireDuration` 按**小时**：0/空 → `defaultExpireDuration`（24），上限 720（30 天）。前端发 `24`。
**复用（本地 backend 2026-10-21 已实现，待合入现网）：** 同一 JWT 用户 + 同一 `shareFilePath` 若已有未过期码 → 返回原 `shareKey`、`reused: true`，并把 `expireTime` 刷新为 `now + expireDuration`；否则新建 UUID 码、`reused: false`。前端据此提示「沿用并续期」或「新建」。

*add_share_file_by_share_link*　POST `/api/file/addShareFileByShareLink`
DTO: `LinkDTO { link }`
VO: `SharedFileVO`；无效/过期 → `20010`，已使用 → `20011`。成功后该条目出现在下一次 `getFiles.sharedFileVOS`。
领取仍偶发 `20010`（库有行却查不到或已过期被定时删）：见备忘录「当前阻塞」。

*delete_shared_file*　POST `/api/file/deleteSharedFile`
DTO: `LinkDTO { link }`
VO: `Result<Void>`；撤销该码并删除所有通过该码建立的共享记录，接收者之后不再可见。
**安全要求：** 必须先校验 `share_file_links.sharer_id == JWT user_id`（码行已被清掉时退回看领取记录）。非分享者 → `20001`；码不存在 → `20010`；`link` 空 → `30001`；未被领取过也可成功撤销。本地 backend 已修，部署前前端不开放撤销按钮。

*zip*　POST `/api/file/zip`  
DTO: `ZipFileDTO` `{ path, targetDir }`（驼峰；`targetDir` 必须是文件夹，空字符串 = 源文件父目录）  
VO: `Result<Void>`  
前端：右键单选压缩，`targetDir` 为当前目录。

*unzip*　POST `/api/file/unzip`  
DTO: 同上 `ZipFileDTO`  
VO: `Result<Void>`  
`targetDir` 为解压目标文件夹（可不存在，后端会 `mkdirs`）。前端默认在原地建**与压缩包同名**的文件夹再解入；「解压到…」先选父目录再按同样规则建夹。解压成功后前端会尽力删除目标内的 `__MACOSX`。

*move_file*　POST `/api/file/moveFile`  
DTO: `MoveFileDTO` `{ path, targetDir, fileHandle }`  
`targetDir` 禁止为空。`fileHandle`：0/空 默认不处理（同名则 20006）；1 替换；2 忽略；7 末尾编号；其它值按 0 处理。不能移到原位或移进自身/子目录 → `20005`。前端一般发 0。  
VO: `Result<Void>`

*move_files*　POST `/api/file/moveFiles`（本地 backend 2026-10-21 新增，待合入现网）  
DTO: `List<MoveFileDTO>`，每项字段同 `moveFile`。  
VO: `MoveFilesVO { moved, failed: [{ path, code }] }`  
逐项沿用 `moveFile` 的鉴权、撞名与自身/子目录校验。**部分失败仍 `code=1`**，失败项在 `failed`；空列表 → `30001`。非事务：前面成功的不回滚。前端多选移动走此接口，按 `failed` 提示成功数与失败文件名。

*delete_bin_file*　POST `/api/file/deleteBinFile`  
DTO: `{ path }`（须在回收站路径下）  
VO: `Void`  
回收站内永久删除（以后端为准）。

*delete_bin_all_files*　POST `/api/file/deleteBinAllFiles`  
DTO: `DeleteBinAllFilesDTO`（路径类型：用户站 / 公共站等，以后端为准）  
VO: `Void`  
清空回收站。

*restore_file*　POST `/api/file/restoreFile`  
DTO: `{ path }`（回收站内项；后端用落盘路径查还原元数据）  
VO: `Void`  
从回收站还原。前端当前仍有一套本机软删/还原逻辑，与后端回收站 API 可并存，联调时以现网为准。

### 断点传输（backend `cdf6773` 新流式实现）

前端适配层：`frontend/src/api/files.ts` + `frontend/src/api/transfers.ts`；传输列表在线模式直接调这些接口，不再使用拟定的 `/file/transfer/...`。

- 上传：`POST initUpload`（完整目标路径）→ `POST continuableUploadFile`（原始字节流，正常时发送整个文件）→ 中断后 `GET getUploadedSize` 获取已落盘 offset，再发送剩余字节 → 完整响应后 `closeUpload`
- 下载：`downloadFile` + `downloadType`/`downloadedSize`；传输列表用 `onDownloadProgress` 更新进度
- 数据库只存 uploadKey 与目标路径；上传请求不再经过 `MultipartFile`，避免完整 multipart 解析前中断导致全部失效

错误码补充：`20007` 回收站禁止、`20008` 上传 KEY 不存在、`20009` 已收藏、`20010` 分享码无效、`20011` 分享码已使用、`30001` 传参有误。

待闭环（见 `备忘录.md`「当前阻塞 / 下一步」与 `claude-任务包.md`）：大文件上传现网手测；分享码领取 `20010`；领取通后再做「同用户同路径未过期码复用，并刷新 `expireTime`」。前端 Phase A（浏览器响应式、多文件上传入队）已完成；文件夹上传 / 批量移动 API 仍待后端。

---

## DTO / VO 字段（按 Java）

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
（`is_admin` 来自 `@JsonProperty`。conteact 曾写 `user_id`，Java 字段是 `userId`。）

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FileVOS `{ List<FileListVO> fileListVOS; List<SharedFileVO> sharedFileVOS }`

FileListVO `{ List<FileListVO> fileListVOS; String fileName; Long length; Long lastModified; boolean is_file }`

SharedFileVO `{ FileListVO fileListVO; Integer sharerId; String sharedFilePath }`

FileDTO `{ boolean is_file; String path }`（原 AddFileDTO）  
path 示例（后端注释）：相对路径从最底层开始，如 `../files/public/document/a.txt`  
普通树只回每层 `fileName`，不回完整 path；前端用前缀 `../files` + 面包屑拼接。共享条目直接使用 `sharedFilePath` 下载、收藏或再次分享。

RenameFileDTO `{ String path; String new_name }`

ContinuableUploadDTO `{ String uploadKey; String targetPath }`（查询参数；文件内容是原始请求体）

DownloadFileDTO / DeleteFileDTO `{ String path }`

批量删除 body：`List<DeleteFileDTO>`（`/deleteFiles`）

ZipFileDTO `{ String path; String targetDir }`

MoveFileDTO `{ String path; String targetDir; Integer fileHandle }`

DeleteBinAllFilesDTO：清空回收站用（字段以后端为准，常见为路径类型枚举）

PO User `{ userId, password, name, isDeleted, isAdmin }`（无 documentId）

---

## 前端本阶段

登录/注册/发码已按 **code + data + 错误码表** 接。`/drive` 已接列表与进文件夹；自己的房间可新建/重命名/删除/上传/下载/移动。  
**Ctrl/Cmd 多选**；多选删除走 `deleteFiles`；移动暂仅单选。  
右键接入 **zip / unzip**（解压默认同名文件夹，「解压到…」可选父目录；清 `__MACOSX`）。  
侧栏**回收站 / 收藏 / 共享**可进；共享支持生成分享码及凭码接收。最近仍占位。公共目录普通用户只能下载，管理员可增删改。设置页删号。
离线 mock 走本地；在线经 Vite 到 FRP。
2026-08-30 现网探测：`checkUserName` / `register` / `login` / 非管理员发码 `10002` / `getFiles` 均 HTTP 200 且为 Result。JWT 30 天、无 refresh。

---

# API contract (English)

This is the frontend/backend contract. Object fields follow `conteact/` on the `backend` branch; **Java source wins over stale `conteact` drafts** (those still mention integer `invite_code` and `msg`).
Swagger comes later. Database is MySQL. Live backend: `8.130.215.175:8080` (FRP; not always up). Error table: `conteact/ErrorCode.md`.

Conventions:
- DTO = frontend → backend (JSON + `@RequestBody`, except file upload)
- VO = backend → frontend (inside `Result.data`)
- `Result { Integer code; T data }` — **no `msg`**
  - `code = 1` success
  - on failure, `code` **is** the error code (10000+ / 20000+ / 99999); the frontend looks up local copy (for i18n later)
- JSON is mostly camelCase; some booleans/renames are snake_case via Jackson `@JsonProperty` (see field list)
- Password only in requests
- Authenticated calls: header **`token`** = `LoginVO.token` (not Bearer). User id comes from the JWT; **do not send `userId` in DTOs**
- JWT lasts **30 days**. Expiry → `10000`. Logout/delete blacklists the token → `10013`. Frontend clears the session in both cases. **No refresh**
- `no jwt`: `/checkUserName`, `/login`, `/register`
- Not logged in / expired token: `code = 10000`; revoked token: `code = 10013`. Frontend clears the session in both cases
- `Document` was removed; do not use `documentId`

Product: multi-user, one private room per user, one shared server disk. Each user's folder is located with JWT `user_id`. A public folder is returned together with the file list.

---

## Wrapper

```text
Result<T> { Integer code; T data; }
```

| code | meaning |
|------|---------|
| 1 | success; `data` is the VO (may be null) |
| 10000+ | user/auth failure; see error table |
| 20000+ | file failure |
| 99999 | backend processing error |

HTTP may still be 200 with a failure `code`, or 4xx/500. The frontend reads `code` in both cases.

---

## Error codes (frontend display)

Full table: backend `conteact/ErrorCode.md`. Common ones:

| code | name | meaning |
|------|------|---------|
| 99999 | EXCEPTION | backend processing error |
| 10000 | NOT_LOGIN | not logged in |
| 10001 | USER_NOT_FOUND | no such account |
| 10002 | NOT_ADMIN | not an admin |
| 10003–10008 | USERNAME_* / PASSWORD_* | empty / length / format |
| 10009 | INVITE_CODE_EMPTY | invite code empty |
| 10010 | INVITE_CODE_INVALID | invalid invite code |
| 10011 | USERNAME_OR_PASSWORD_INVALID | username or password incorrect |
| 10012 | DELETE_USER_FAILED | failed to delete user |
| 10013 | BLACKLISTED_JWT | JWT revoked (after logout or delete) |
| 20001 | NO_PERMISSION | no permission for this file |
| 20002 | FILE_OPERATION_FAILED | file operation failed |
| 20003 | FILE_NAME_ILLEGAL | illegal file name |
| 20004 | FILE_NOT_FOUND | file not found |
| 20005 | FILE_ILLEGAL | file does not match the contract |
| 20006 | FILE_DUPLICATE | duplicate file name |

There is no `USERNAME_EXISTS` code. Duplicate check is `checkUserName` with `data.is_available === false`.

---

## Username / password (frontend and backend)

- Username: non-empty; 3–20; starts with a letter; letters, digits, underscore only
- Password: non-empty; 8–64; must contain both letters and digits, **and only letters and digits**
- Confirm password: frontend only
- Invite code: non-empty string (Java `String inviteCode`; issued as UUID)

---

## Endpoints

### User　`/api/user`

*check_user_name*　no jwt  
POST `/api/user/checkUserName`  
DTO: `{ name }`  
VO: `{ is_available: boolean }` (Jackson name `is_available`)

*register*　no jwt  
POST `/api/user/register`  
DTO: `{ name, password, inviteCode }`  
VO: `LoginVO`  
Invite codes are one-shot: reuse → `10010`

*login*　no jwt  
POST `/api/user/login`  
DTO: `{ name, password }`  
VO: `LoginVO`

*creat_invite_code*　JWT (admin)  
GET `/api/user/creatInviteCode`  
DTO: none (id from token)  
VO: `{ inviteCode }`

*delete*　JWT  
POST `/api/user/delete`  
DTO: none  
VO: `Void`  
The token is blacklisted afterwards; later calls return `10013`

*logout*　JWT  
GET `/api/user/logout`  
DTO: none  
VO: `Void`  
Java is GET (`conteact` wrote POST). Blacklists the current token; frontend clears the session. Same token afterwards → `10013`

### File　`/api/file` (all JWT; UI in P3/P4)

*get_files*　GET `/api/file/getFiles`  
DTO: none  
VO: `FileVOS { fileListVOS, sharedFileVOS }`
`fileListVOS` contains the public and current-user roots; `sharedFileVOS` contains files shared with the current user.

*add_file*　POST `/api/file/addFile`  
DTO: `FileDTO` `{ is_file: boolean, path }` JSON (Java renamed AddFileDTO → FileDTO)  
VO: `Void`

*delete_file*　POST `/api/file/deleteFile`  
DTO: `{ path }`  
VO: `Void`  
Live servers typically **soft-delete** into the recycle bin (follow Java).

*delete_files*　POST `/api/file/deleteFiles`  
DTO: `DeleteFileDTO[]` (JSON array of `{ path }`)  
VO: `Void`  
Batch soft-delete; multi-select delete on the frontend uses this.

*rename_file*　POST `/api/file/renameFile`  
DTO: `{ path, new_name }`  
`new_name` must not be blank, `.`, `..`, or contain `/` or `\`  
VO: `Void`

*upload_file* (compat wrapper)  
Legacy `POST /api/file/uploadFile` is **removed**. Frontend `uploadFile()` now wraps `initUpload` → one `continuableUploadFile` → `closeUpload`.

*init_upload*　POST `/api/file/initUpload`
Body: `InitUploadDTO { uploadFilePath }` — complete destination file path, e.g. `./files/8/video.mp4`
VO: `Result<String>` (uploadKey). Folder uploads use the folder endpoints below.

*continuable_upload_file*　POST `/api/file/continuableUploadFile?uploadKey=&filePath=`
Body: raw `application/octet-stream`; `ContinuableUploadDTO { uploadKey, filePath }` is bound from query parameters. Since 2026-10-22 `filePath` is the full file path (it replaced the old `targetPath` directory).
VO: `Result<Void>`
The server appends bytes as they arrive. After a disconnect, query the persisted size and resend only the remaining `File.slice(offset)`.

*get_uploaded_size*　GET `/api/file/getUploadedSize?uploadKey=`  
VO: `Result<Long>`

*close_upload*　POST `/api/file/closeUpload`  
DTO: `{ uploadKey }`  
VO: `Result<Void>`

*Resumable folder upload* (backend patch 2026-10-22; frontend wired)
1. `POST /api/file/initUploadFolder` — body `List<InitUploadFolderDTO { "is_file", uploadFilePath }>` listing every folder (each level, parents first) and every file with full server paths. Returns one `uploadKey` for the whole folder.
2. `POST /api/file/uploadFolder?uploadKey=&filePath=` — raw bytes of one file; `filePath` is that file's full path.
3. After an interruption: `POST /api/file/getUploadedFolderStatus` with `{ uploadKey }` → `List<{ uploadFilePath, status, size }>` (0 pending / 1 in progress, `size` = bytes on disk / 2 done, `size = -1`). Resume that file from `size`.
4. After each file: `POST /api/file/closeOneUpload` `{ uploadKey, filePath }`.
5. After all files: `POST /api/file/closeUploadFolder` `{ uploadKey }`.

Frontend assumptions pending backend confirmation: files of one folder upload sequentially; the folder session is closed only after every file is completed or canceled; a clashing top-level folder is renamed to `name(1)` before registering; empty folders are not registered.

*get_download_file_size*　GET `/api/file/getDownloadFileSize?path=`
VO: `Result<Long>`

*download_file*　POST `/api/file/downloadFile`  
DTO: `ContinuableDownloadDTO` `{ downloadFilePath, downloadedSize?, downloadType }`  
`downloadType` 0 = full file; 1 = skip `downloadedSize` then stream the rest.  
Success: binary stream (`Content-Disposition: attachment`), **not Result**

*add_star_file*　POST `/api/file/addStarFile`  
DTO: `{ starFilePath }` → `Void` (already starred → `20009`)

*delete_starred_file*　POST `/api/file/deleteStarredFile`  
DTO: `{ starFilePath }` → `Void`

*get_starred_files*　POST `/api/file/getStarredFiles`  
VO: `List<StarredFileVO>` (`{ starFilePath }`)

*creat_share_link*　POST `/api/file/creatShareLink`
DTO: `CreatShareLinkDTO { shareFilePath, expireDuration }` (hours)
VO: `CreatShareLinkVO { shareKey, reused }`
The backend spells the endpoint and types as `creat`. `expireDuration` is in **hours** (0/empty → `defaultExpireDuration` = 24, capped at 720). The frontend sends `24`.
**Reuse (local backend 2026-10-21, not deployed yet):** same JWT user + same `shareFilePath` with a non-expired key → returns that key with `reused: true` and refreshes `expireTime` to `now + expireDuration`; otherwise a new key with `reused: false`.

*add_share_file_by_share_link*　POST `/api/file/addShareFileByShareLink`
DTO: `LinkDTO { link }`
VO: `SharedFileVO`; invalid/expired → `20010`, already used → `20011`.
Redeem still intermittently returns `20010` even when a row was inserted — see `备忘录.md`.

*delete_shared_file*　POST `/api/file/deleteSharedFile`
DTO: `LinkDTO { link }`. Revokes the key and removes all recipient records created from it.
The backend must verify the JWT user is the key's `sharerId` (non-sharer → `20001`, unknown key → `20010`, empty link → `30001`). The local backend patch adds this check and makes an unused key revocable.

*zip*　POST `/api/file/zip`  
DTO: `ZipFileDTO` `{ path, targetDir }` (camelCase; `targetDir` must be a folder; empty string = parent of source)  
VO: `Result<Void>`  
UI: context-menu compress on a single selection; `targetDir` is the current folder.

*unzip*　POST `/api/file/unzip`  
DTO: same `ZipFileDTO`  
VO: `Result<Void>`  
`targetDir` is the extract folder (created if missing). Frontend default: create a folder named after the archive in place, then extract into it; **Extract to…** picks a parent first. After success the UI best-effort deletes `__MACOSX` under the target.

*move_file*　POST `/api/file/moveFile`  
DTO: `MoveFileDTO` `{ path, targetDir, fileHandle }`  
`targetDir` must not be empty. `fileHandle`: 0/empty default (duplicate → 20006); 1 replace; 2 ignore; 7 numeric suffix; anything else behaves like 0. Moving onto itself or into its own subfolder → `20005`.  
VO: `Result<Void>`

*move_files*　POST `/api/file/moveFiles` (local backend 2026-10-21, not deployed yet)  
DTO: `List<MoveFileDTO>`  
VO: `MoveFilesVO { moved, failed: [{ path, code }] }` — each item uses `moveFile` rules. **Partial failure still returns `code=1`** with details in `failed`; empty list → `30001`. Not transactional. The frontend uses it for multi-select move.

*delete_bin_file*　POST `/api/file/deleteBinFile`  
DTO: `{ path }` (must be under recycle bin)  
VO: `Void`

*delete_bin_all_files*　POST `/api/file/deleteBinAllFiles`  
DTO: `DeleteBinAllFilesDTO` (path type: user / public bin — follow Java)  
VO: `Void`

*restore_file*　POST `/api/file/restoreFile`  
DTO: `{ path }` (item in recycle bin)  
VO: `Void`

### Resumable transfer (backend `cdf6773` streaming implementation)

Frontend adapters: `files.ts` + `transfers.ts`. Online transfer list calls these endpoints (not the old proposed `/file/transfer/...` draft).

- Upload: `POST initUpload` with the complete destination path → one raw-stream `continuableUploadFile` request for normal uploads → after interruption, `getUploadedSize` and resend only the remainder → `closeUpload` after the whole file succeeds.
- Download: `downloadFile` with `downloadType` / `downloadedSize`
- Extra error codes: `20007` bin forbidden, `20008` upload key missing, `20009` already starred, `20010` invalid share key, `20011` share key used, `30001` bad args

Still open (see `备忘录.md`): large-file upload live test; share-key redeem `20010`; after redeem works, reuse non-expired keys without refreshing expiry.

---

## DTO / VO fields (from Java)

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
(`is_admin` from `@JsonProperty`. `conteact` listed `user_id`; Java field is `userId`.)

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FileVOS `{ List<FileListVO> fileListVOS; List<SharedFileVO> sharedFileVOS }`

FileListVO `{ List<FileListVO> fileListVOS; String fileName; Long length; Long lastModified; boolean is_file }`

SharedFileVO `{ FileListVO fileListVO; Integer sharerId; String sharedFilePath }`

FileDTO `{ boolean is_file; String path }` (was AddFileDTO)  
Path note from backend: start from the leaf, e.g. `../files/public/document/a.txt`  
Regular trees return `fileName` per node only, so the frontend joins `../files` + breadcrumbs. Shared entries use `sharedFilePath` directly for download, star, and re-share.

RenameFileDTO `{ String path; String new_name }`

ContinuableUploadDTO `{ String uploadKey; String targetPath }` (query parameters; file bytes are the raw request body)

DownloadFileDTO / DeleteFileDTO `{ String path }`

Batch delete body: `List<DeleteFileDTO>` (`/deleteFiles`)

ZipFileDTO `{ String path; String targetDir }`

MoveFileDTO `{ String path; String targetDir; Integer fileHandle }`

DeleteBinAllFilesDTO: empty recycle bin (fields follow Java)

PO User `{ userId, password, name, isDeleted, isAdmin }` (no `documentId`)

---

## Frontend this phase

Login / register / invite codes use **code + data + error table**. `/drive` lists files; a user's room can mkdir / rename / delete / upload / download / move.  
**Ctrl/Cmd multi-select**; batch delete via `deleteFiles`; move is single-select for now.  
Context menu **zip / unzip** (same-named folder by default; Extract to… picks parent; scrub `__MACOSX`).  
Sidebar **Trash / Starred / Shared** is usable. Sharing can create a key and accept a key; Recent remains a placeholder. Public: everyone can download; only admin can write. Settings page deletes the account.
Offline mock locally; online via Vite → FRP.  
2026-08-30 live probe: `checkUserName` / `register` / `login` / non-admin invite `10002` / `getFiles` all HTTP 200 Result. JWT is 30 days; no refresh.
