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
VO: `List<FilesVO>`（当前实现会返回 public 根 + 当前用户根两棵树）

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

*upload_file*　POST `/api/file/uploadFile`  
**multipart**（`@ModelAttribute`，不是 JSON）：`path` + `file`  
VO: `Result<Void>`

*download_file*　POST `/api/file/downloadFile`  
DTO: `{ path }` JSON  
成功：二进制流（`Content-Disposition: attachment`），**不是 Result**  
失败：可能走异常处理器变成 `Result` 错误码

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
`targetDir` 禁止为空。`fileHandle`：0 默认不处理（同名则 20006）；1 替换；2 忽略；部分后端还有 7（末尾编号）。前端一般发 0，且**暂不支持批量移动**。  
VO: `Result<Void>`

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

### 断点传输（拟定契约，后端尚未实现）

前端只依赖 `frontend/src/api/transfers.ts` 适配层；后端最终命名若变化，只改该文件。

- `POST /api/file/transfer/upload/init`：`{ targetDir, fileName, totalSize, contentType?, contentHash?, chunkSize?, clientUploadId, fileHandle? }` → `TransferSessionVO`
- `GET /api/file/transfer/upload/{transferId}`：返回服务端权威 `nextOffset`、`chunkSize`、状态和过期时间
- `PUT /api/file/transfer/upload/{transferId}`：raw bytes；请求头 `Content-Range: bytes start-end/total`，可带 `X-Chunk-Hash`
- `POST /api/file/transfer/upload/{transferId}/complete`：校验总长度/哈希后原子落盘
- `DELETE /api/file/transfer/upload/{transferId}`：取消并清理临时文件
- `POST /api/file/transfer/download/init`：`{ path, clientDownloadId }` → size、ETag、chunkSize
- `POST /api/file/transfer/download/range`：body `{ path, transferId? }`，请求头 `Range` + `If-Range`，成功应为 `206`
- `DELETE /api/file/transfer/download/{transferId}`：取消可选下载会话

约束：UUID 必须绑定用户与文件元数据；数据库只存会话/已收区间，文件内容写临时文件；v1 严格顺序分块并校验 `offset === nextOffset`；`clientUploadId` 保证 init 幂等；重复块同 offset+同哈希应幂等；完成前校验 size/hash；取消和 TTL 到期清理；下载文件变化时 ETag 不匹配必须重新初始化。建议预留 `TRANSFER_NOT_FOUND / EXPIRED / OFFSET_MISMATCH / INCOMPLETE / ALREADY_COMPLETE / CHECKSUM_MISMATCH` 错误码。

---

## DTO / VO 字段（按 Java）

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
（`is_admin` 来自 `@JsonProperty`。conteact 曾写 `user_id`，Java 字段是 `userId`。）

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FilesVO `{ List<FilesVO> filesVOS; String fileName; Long length; Long lastModified; boolean is_file }`

FileDTO `{ boolean is_file; String path }`（原 AddFileDTO）  
path 示例（后端注释）：相对路径从最底层开始，如 `../files/public/document/a.txt`  
`getFiles` 只回每层 `fileName`，不回完整 path。前端用前缀 `../files` + 面包屑拼接后再调增删改。

RenameFileDTO `{ String path; String new_name }`

UploadFileDTO `{ String path; MultipartFile file }`

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
侧栏**回收站**可进；最近 / 收藏 / 共享仍占位。公共目录普通用户只能下载，管理员可增删改。设置页删号。  
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
VO: `List<FilesVO>` (implementation currently returns public root + current user root)

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

*upload_file*　POST `/api/file/uploadFile`  
**multipart** (`@ModelAttribute`, not JSON): `path` + `file`  
VO: `Result<Void>`

*download_file*　POST `/api/file/downloadFile`  
DTO: `{ path }` JSON  
Success: binary stream (`Content-Disposition: attachment`), **not Result**  
Failure: may become a `Result` error via the exception handler

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
`targetDir` must not be empty. `fileHandle`: 0 default / no-op (duplicate → 20006); 1 replace; 2 ignore; some backends also use 7 (numeric suffix). Frontend usually sends 0 and **does not batch-move** yet.  
VO: `Result<Void>`

*delete_bin_file*　POST `/api/file/deleteBinFile`  
DTO: `{ path }` (must be under recycle bin)  
VO: `Void`

*delete_bin_all_files*　POST `/api/file/deleteBinAllFiles`  
DTO: `DeleteBinAllFilesDTO` (path type: user / public bin — follow Java)  
VO: `Void`

*restore_file*　POST `/api/file/restoreFile`  
DTO: `{ path }` (item in recycle bin)  
VO: `Void`

### Resumable transfer (proposed; backend not implemented yet)

The frontend is isolated behind `frontend/src/api/transfers.ts`.

- `POST /api/file/transfer/upload/init`
- `GET /api/file/transfer/upload/{transferId}`
- `PUT /api/file/transfer/upload/{transferId}` with raw bytes and `Content-Range`
- `POST /api/file/transfer/upload/{transferId}/complete`
- `DELETE /api/file/transfer/upload/{transferId}`
- `POST /api/file/transfer/download/init`
- `POST /api/file/transfer/download/range` with `Range` and `If-Range` (return `206`)
- `DELETE /api/file/transfer/download/{transferId}`

The server owns `nextOffset`; upload v1 is strictly sequential and retries are idempotent. Bind UUIDs to user/file metadata, keep bytes in temporary storage rather than the database, validate size/hash before atomic commit, expire abandoned sessions, and use ETag for download resume.

---

## DTO / VO fields (from Java)

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
(`is_admin` from `@JsonProperty`. `conteact` listed `user_id`; Java field is `userId`.)

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FilesVO `{ List<FilesVO> filesVOS; String fileName; Long length; Long lastModified; boolean is_file }`

FileDTO `{ boolean is_file; String path }` (was AddFileDTO)  
Path note from backend: start from the leaf, e.g. `../files/public/document/a.txt`  
`getFiles` returns `fileName` per node only. The frontend joins prefix `../files` + breadcrumb before add/delete/rename.

RenameFileDTO `{ String path; String new_name }`

UploadFileDTO `{ String path; MultipartFile file }`

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
Sidebar **Trash** is usable; Recent / Starred / Shared remain placeholders. Public: everyone can download; only admin can write. Settings page deletes the account.  
Offline mock locally; online via Vite → FRP.  
2026-08-30 live probe: `checkUserName` / `register` / `login` / non-admin invite `10002` / `getFiles` all HTTP 200 Result. JWT is 30 days; no refresh.
