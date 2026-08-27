# API 契约（前端 / 后端）

当前用这份文档对接。Swagger 等注册接口稳定后再做。
数据库用 MySQL，之后直接接在服务器上；本阶段先把账号注册打通。
前端已定：Vue 3 + Vite + TypeScript（详见 `备忘录.md`）。

约定：
- JSON 字段一律驼峰（`inviteCode`，不要 `invite_code`）
- DTO = 前端发给后端的请求体
- return = 后端返回给前端的数据
- 密码只出现在请求里，任何返回都不要带 password

产品模型：多用户、单人单间、共享一块服务器硬盘。每人一个根目录（房间），`User.documentId` 指向该用户的 `Document`。

---

## 本阶段：注册

*register*
path: POST /api/user/register
DTO: String name; String password; String inviteCode
return: boolean

说明：
- `true` = 注册成功
- `false` = 注册失败（用户名已存在 / 邀请码无效或已使用 / 参数为空等）
- 邀请码由管理员发放，一码一人，用过即失效
- 注册成功时，后端同时创建该用户的房间（一条 Document，path 为该用户根目录）

请求示例：
```json
{
  "name": "alice",
  "password": "********",
  "inviteCode": "K7M2Q9"
}
```

成功：`true`
失败：`false`

前端本阶段要做：注册页（用户名、密码、邀请码）→ 调上述接口 → 按布尔值提示成功或失败。
本阶段不做：登录鉴权、文件列表、邀请码管理页、Swagger。

联调前后端需能在 MySQL 里预置一条未使用邀请码（可先手工插入），否则前端无法测注册。

---

## 下一阶段（先写在这里，本阶段不实现）

*login*
path: POST /api/user/login
DTO: String name; String password
return: 下一阶段再定（注册可继续用 boolean；登录需要带上当前用户身份，不能只用 boolean）

登录之后才会用到：当前用户 `userId / name / role`、进自己的房间、管理员发邀请码。

---

## 注册阶段后端落库（给对字段用，前端不直接调表）

User
- userId
- name
- password（库内哈希，不返回前端）
- role（ADMIN / USER；邀请码注册出来的是 USER）
- isDelete
- documentId（该用户房间根目录）

Document
- documentId
- path（该用户在服务器硬盘上的根路径）

InviteCode
- code（字符串）
- createdBy
- usedBy
- status（UNUSED / USED / REVOKED）
- expiresAt
- createdAt
- usedAt

---

# API contract (English)

This document is the frontend/backend contract. Swagger comes later, after the register API is stable.
Database is MySQL, to be connected on the server later. Current phase: get account registration working.
Frontend stack: Vue 3 + Vite + TypeScript (see `备忘录.md`).

Conventions:
- JSON fields use camelCase (`inviteCode`, not `invite_code`)
- DTO = request body from frontend to backend
- return = data from backend to frontend
- Password appears only in requests; never include it in any response

Product model: multi-user, one private room per user, sharing one server disk. Each user has a root folder (room). `User.documentId` points to that user's `Document`.

---

## Current phase: register

*register*
path: POST /api/user/register
DTO: String name; String password; String inviteCode
return: boolean

Notes:
- `true` = registration succeeded
- `false` = registration failed (username taken / invite code invalid or already used / empty fields, etc.)
- Invite codes are issued by an admin; one code per person; a used code cannot be reused
- On success, the backend also creates that user's room (one Document whose path is the user's root directory)

Request example:
```json
{
  "name": "alice",
  "password": "********",
  "inviteCode": "K7M2Q9"
}
```

Success: `true`
Failure: `false`

Frontend in this phase: register page (username, password, invite code) → call the endpoint above → show success or failure from the boolean.
Out of scope this phase: login/auth, file list, invite-code admin UI, Swagger.

For live backend integration, MySQL must contain an unused invite code (manual insert is fine). Otherwise the frontend cannot test real registration.

---

## Next phase (written here, not implemented now)

*login*
path: POST /api/user/login
DTO: String name; String password
return: to be decided in the next phase (register can keep using boolean; login must include the current user identity and cannot return boolean only)

After login we will need: current user `userId / name / role`, entering the user's own room, and admin invite-code issuance.

---

## Register-phase backend tables (for field alignment; frontend does not query tables directly)

User
- userId
- name
- password (hashed in DB, never returned to the frontend)
- role (ADMIN / USER; users created via invite code are USER)
- isDelete
- documentId (root folder of this user's room)

Document
- documentId
- path (this user's root path on the server disk)

InviteCode
- code (string)
- createdBy
- usedBy
- status (UNUSED / USED / REVOKED)
- expiresAt
- createdAt
- usedAt

