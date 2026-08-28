# API 契约（前端 / 后端）

当前用这份文档对接。对象细节以 backend 分支 `conteact/` 为准；前端 TypeScript 按 Java 字段驼峰对接。
Swagger 后做。数据库 MySQL，服务器后端 `8.130.215.175:8080`（FRP，不一定一直通）。

约定：
- DTO = 前端 → 后端
- VO = 后端 → 前端（包在 Result.data 里）
- 所有接口 HTTP 体都是 Result：`{ code, msg, data }`
  - `code = 1` 成功
  - `code = 0` 失败，`msg` 给前端失败原因
  - `data` 为 VO（失败时多为 null）
- JSON 驼峰（`inviteCode`，不要 `invite_code`）
- 密码只出现在请求里
- `no jwt`：该路径不拦截 JWT（login / register / getUsersName）
- 其余请求：请求头 **`token`** = 登录/注册返回的 `LoginVO.token`（不是 `Authorization: Bearer`）
- 未登录：`msg = NOT_LOGIN`，前端清会话并回登录页
- 现在没有 refresh 接口，过期就重新登录

产品模型：多用户、单人单间、共享一块服务器硬盘。`User.documentId` 指向该用户房间根目录。

---

## 统一外壳

```text
Result<T> { Integer code; String msg; T data; }
```

业务成败看 `code` / `msg` / `data`。HTTP 用来区分 Axios 走 `try` 还是 `catch`（见下节）。

---

## HTTP 状态码（现在约定，后端稍后对齐即可）

不要只靠 body 里的 true/false 或只靠 `Result.code`。Axios 非 2xx 会进 `catch`。

| 情况 | HTTP | Result.code | Result.msg |
|------|------|-------------|------------|
| 注册/登录成功 | 200 | 1 | `null` |
| 用户名已存在 | 409 | 0 | `用户名已存在` |
| 邀请码无效/已用/过期/撤销、参数空、登录密码错 | 400 | 0 | 见状态表 |
| 服务器内部错误 | 500 | 0 或无 body | 可选 |

前端兼容：现有 Java 若仍是 `200 + code=0`，照样读 `msg`；对齐后走 `catch` 里的同一套 `msg`。

**以后再升、现在不强迫：** 业务码 `USERNAME_EXISTS`、`INVALID_INVITE_CODE` 等。现在继续用 `msg` 中文。

---

## 登录 / 注册状态（前端按这个显示）

JWT 已上：请求头 `token`。login / register / getUsersName 仍是 **no jwt**。没有 refresh。

### register　POST /api/user/register

| code | msg | data | 含义 |
|------|-----|------|------|
| 1 | `null` | `LoginVO` | 注册成功，前端写入会话并进入网盘 |
| 0 | `无效的邀请码` | `null` | 邀请码不存在或已使用 |
| 0 | `用户名已存在` | `null` | 用户名已被占用（前端也会先调 getUsersName） |

### login　POST /api/user/login

| code | msg | data | 含义 |
|------|-----|------|------|
| 1 | `null` | `LoginVO` | 登录成功 |
| 0 | `用户名或密码不正确` | `null` | 用户不存在或密码错误 |

需要 JWT 的接口失败时可能是 `msg = NOT_LOGIN`。

当前 Java：注册失败返回「无效的邀请码」，登录失败返回「用户名或密码不正确」，发码非管理员返回「您不是管理员」。

---

## 接口

*check_user_name*　no jwt
get: /api/user/getUsersName
DTO: （无）
VO: Set&lt;String&gt; 用户名列表

*creat_invite_code*　需要管理员；请求头 `token`
post: /api/user/creatInviteCode
DTO: CreatInviteCodeDTO
VO: CreatInviteCodeVO

*register*　no jwt
post: /api/user/register
DTO: RegisterDTO
VO: LoginVO

*login*　no jwt
post: /api/user/login
DTO: LoginDTO
VO: LoginVO

---

## DTO / VO 字段

RegisterDTO `{ String name; String password; String inviteCode }`
（Java 为 String inviteCode。conteact/object/dto 曾写 Integer invite_code，前端按 Java 驼峰字符串发。）

LoginDTO `{ String name; String password }`

CreatInviteCodeDTO `{ Integer userId; String name }`

LoginVO `{ String token; Integer userId; String name; boolean isAdmin }`
（不含 password。conteact 曾写 `user_id`，Java 字段是 `userId`，前端两种都认。）

CreatInviteCodeVO `{ String inviteCode }`

PO（前端不直接用）User `{ userId, password, name, isDeleted, documentId, isAdmin }`
（布尔字段用 `is`+状态：`isDeleted` / `isAdmin`。Java 若仍是 `isDelete`，只做兼容映射。）

---

## 前端本阶段

注册页、登录页、网盘占位、管理员发码；离线 mock + 在线 FRP 两套契约/冒烟。
登录/注册成功存 `LoginVO`，之后请求带请求头 `token`。
不连上 8.130.215.175 时，离线模式仍可出门。

---

# API contract (English)

This document is the frontend/backend contract. Object fields follow `conteact/` on the `backend` branch; the frontend sends camelCase matching the Java DTOs/VOs.
Swagger comes later. Database is MySQL. Live backend: `8.130.215.175:8080` (via FRP; not always reachable).

Conventions:
- DTO = frontend → backend
- VO = backend → frontend (inside `Result.data`)
- Every response is `Result { Integer code; String msg; T data; }`
  - `code = 1` success
  - `code = 0` failure; `msg` explains why
  - `data` is the VO (usually null on failure)
- JSON camelCase (`inviteCode`, not `invite_code`)
- Password only in requests
- `no jwt` means the path does not require a JWT (login / register / getUsersName)
- Other requests send header **`token`** = `LoginVO.token` (not `Authorization: Bearer`)
- Not logged in: `msg = NOT_LOGIN`; frontend clears the session and returns to login
- No refresh endpoint yet; expired token means log in again

Product: multi-user, one private room per user, one shared server disk. `User.documentId` is that user's root folder.

---

## Wrapper

```text
Result<T> { Integer code; String msg; T data; }
```

Success/failure is `code` / `msg` / `data`. HTTP decides whether Axios hits `try` or `catch`.

---

## HTTP status (agree now; backend can align later)

Do not rely only on boolean or only on `Result.code`. Axios treats non-2xx as `catch`.

| Case | HTTP | Result.code | Result.msg |
|------|------|-------------|------------|
| register/login success | 200 | 1 | `null` |
| username taken | 409 | 0 | `用户名已存在` |
| bad invite / used / expired / revoked, empty params, bad password | 400 | 0 | see status table |
| server error | 500 | 0 or empty | optional |

Frontend accepts both: current Java `200 + code=0`, and the table above (`4xx + code=0`).

**Later, not now:** machine codes like `USERNAME_EXISTS`. Keep using Chinese `msg` for now.

---

## Login / register status (frontend displays these)

JWT is live: header `token`. login / register / getUsersName stay **no jwt**. No refresh.

### register　POST /api/user/register

| code | msg | data | meaning |
|------|-----|------|---------|
| 1 | `null` | `LoginVO` | registered; frontend stores session and opens the drive |
| 0 | `无效的邀请码` | `null` | invite code missing or already used |
| 0 | `用户名已存在` | `null` | username taken (frontend also calls getUsersName first) |

### login　POST /api/user/login

| code | msg | data | meaning |
|------|-----|------|---------|
| 1 | `null` | `LoginVO` | logged in |
| 0 | `用户名或密码不正确` | `null` | unknown user or bad password |

Protected calls may return `msg = NOT_LOGIN`.

Java currently returns `无效的邀请码` on register failure, `用户名或密码不正确` on login failure, and `您不是管理员` if a non-admin creates an invite code.

---

## Endpoints

*check_user_name*　no jwt
get: /api/user/getUsersName
DTO: none
VO: Set&lt;String&gt; usernames

*creat_invite_code*　admin; header `token`
post: /api/user/creatInviteCode
DTO: CreatInviteCodeDTO
VO: CreatInviteCodeVO

*register*　no jwt
post: /api/user/register
DTO: RegisterDTO
VO: LoginVO

*login*　no jwt
post: /api/user/login
DTO: LoginDTO
VO: LoginVO

---

## DTO / VO fields

RegisterDTO `{ String name; String password; String inviteCode }`
(Java uses String `inviteCode`. `conteact/object/dto` listed Integer `invite_code`; the frontend follows Java.)

LoginDTO `{ String name; String password }`

CreatInviteCodeDTO `{ Integer userId; String name }`

LoginVO `{ String token; Integer userId; String name; boolean isAdmin }`
(No password. `conteact` listed `user_id`; Java field is `userId`. Frontend accepts both.)

CreatInviteCodeVO `{ String inviteCode }`

PO (not used by frontend) User `{ userId, password, name, isDeleted, documentId, isAdmin }`
(Booleans use `is` + state: `isDeleted` / `isAdmin`. If Java still uses `isDelete`, map it.)

---

## Frontend this phase

Register + login + drive placeholder + admin invite page. Contract/smoke have **offline** (local mock) and **online** (FRP) modes.
Session is `LoginVO`; later requests send header `token`.
If `8.130.215.175:8080` is down, offline mode is still enough to ship the frontend slice.
