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
- `no jwt`：`/checkUserName`、`/login`、`/register`
- 未登录：`code = 10000`，前端清会话并回登录页
- 没有 refresh，过期就重新登录
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
| 20001 | NO_PERMISSION | 您没有权限操作此文件 |
| 20002 | FILE_OPERATION_FAILED | 文件操作失败 |
| 20003 | FILE_NAME_ILLEGAL | 文件名不合法 |
| 20004 | FILE_NOT_FOUND | 文件不存在 |

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

### 文件　`/api/file`（均要 JWT；P3/P4 再铺页面）

*get_files*　GET `/api/file/getFiles`  
DTO: 无  
VO: `List<FilesVO>`（当前实现会返回 public 根 + 当前用户根两棵树）

*add_file*　POST `/api/file/addFile`  
DTO: `{ is_file: boolean, path }`　JSON  
VO: `Void`

*delete_file*　POST `/api/file/deleteFile`  
DTO: `{ path }`  
VO: `Void`

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

压缩包/rar：后端打算以后再做，先把上传下载和增删改查跑通。

---

## DTO / VO 字段（按 Java）

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
（`is_admin` 来自 `@JsonProperty`。conteact 曾写 `user_id`，Java 字段是 `userId`。）

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FilesVO `{ List<FilesVO> filesVOS; String fileName; Long length; Long lastModified; boolean is_file }`

AddFileDTO `{ boolean is_file; String path }`  
path 示例（后端注释）：相对路径从最底层开始，如 `../files/public/document/a.txt`

RenameFileDTO `{ String path; String new_name }`

UploadFileDTO `{ String path; MultipartFile file }`

DownloadFileDTO / DeleteFileDTO `{ String path }`

PO User `{ userId, password, name, isDeleted, isAdmin }`（无 documentId）

---

## 前端本阶段

登录/注册/发码已按 **code + data + 错误码表** 接。文件 API 类型和 `src/api/files.ts` 已铺，网盘列表 UI 仍是下一阶段。  
离线 mock 走本地；在线经 Vite 到 FRP。

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
- `no jwt`: `/checkUserName`, `/login`, `/register`
- Not logged in: `code = 10000`; frontend clears the session and returns to login
- No refresh; expired token means log in again
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
| 20001 | NO_PERMISSION | no permission for this file |
| 20002 | FILE_OPERATION_FAILED | file operation failed |
| 20003 | FILE_NAME_ILLEGAL | illegal file name |
| 20004 | FILE_NOT_FOUND | file not found |

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

### File　`/api/file` (all JWT; UI in P3/P4)

*get_files*　GET `/api/file/getFiles`  
DTO: none  
VO: `List<FilesVO>` (implementation currently returns public root + current user root)

*add_file*　POST `/api/file/addFile`  
DTO: `{ is_file: boolean, path }` JSON  
VO: `Void`

*delete_file*　POST `/api/file/deleteFile`  
DTO: `{ path }`  
VO: `Void`

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

Archives/rar: later. Upload/download and CRUD first.

---

## DTO / VO fields (from Java)

LoginVO `{ String token; Integer userId; String name; boolean is_admin }`  
(`is_admin` from `@JsonProperty`. `conteact` listed `user_id`; Java field is `userId`.)

CheckUserNameVO `{ boolean is_available }`

CreatInviteCodeVO `{ String inviteCode }`

FilesVO `{ List<FilesVO> filesVOS; String fileName; Long length; Long lastModified; boolean is_file }`

AddFileDTO `{ boolean is_file; String path }`  
Path note from backend: start from the leaf, e.g. `../files/public/document/a.txt`

RenameFileDTO `{ String path; String new_name }`

UploadFileDTO `{ String path; MultipartFile file }`

DownloadFileDTO / DeleteFileDTO `{ String path }`

PO User `{ userId, password, name, isDeleted, isAdmin }` (no `documentId`)

---

## Frontend this phase

Login / register / invite codes use **code + data + error table**. File types and `src/api/files.ts` exist; drive list UI is next.  
Offline mock locally; online via Vite → FRP.
