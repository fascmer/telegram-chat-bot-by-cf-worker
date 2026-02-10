# Telegram 双向聊天机器人（Cloudflare Worker 版）

这是一个基于 **Cloudflare Workers** 的轻量级 Telegram 机器人，支持访客匿名发送消息给管理员，管理员可回复、拉黑用户或设置验证暗号，所有逻辑运行在边缘网络，无需服务器。

---

## ✨ 功能特性

- 📨 访客发送消息自动转发给管理员
- 💬 管理员可与指定访客开启双向对话（`/to <chat_id>`）
- 🔒 支持设置验证暗号（访客需输入正确口令才能联系管理员）
- 🚫 黑名单管理（`/ban` / `/unban` / `/banlist`）
- 🧹 清空验证名单、关闭验证等快捷命令
- ☁️ 完全无服务器，数据存储于 Cloudflare KV

---
## 🚀 部署步骤

1. **创建 Cloudflare Worker**  
   登录 [Cloudflare Dashboard](https://dash.cloudflare.com)，进入 **Workers & Pages**，点击 **Create application** → **Worker**，创建一个新 Worker（名称任意，例如 `tg-anonymous-bot`）。

2. **设置环境变量（Secrets）**  
   在 Worker 编辑页面，进入 **Settings → Variables**，添加以下 **Secrets**（敏感信息，不会公开）：
   - `BOT_TOKEN`：你的 Telegram 机器人 Token（通过 [@BotFather](https://t.me/BotFather) 获取）
   - `OWNER_ID`：你的 Telegram 用户 ID（纯数字，可通过 [@userinfobot](https://t.me/userinfobot) 查询）
   - `WEBHOOK_UUID`：自行生成一个唯一字符串（如 UUID），用于安全绑定 Webhook（例如：`a1b2c3d4e5f6`）

3. **创建并绑定 KV 命名空间**  
   - 在 **KV** 页面创建一个新的命名空间，命名为 `tg-chat`。
   - 返回 Worker 的 **Settings → Variables**，在 **KV Namespace Bindings** 中：
     - **Variable name**: `tg-chat`
     - **KV namespace**: 选择刚刚创建的 `tg-chat`

4. **部署代码**  
   将本项目的 `worker.js`（或主入口文件）代码复制到 Worker 的代码编辑器中，点击 **Save and Deploy**。

5. **绑定 Telegram bot**  
   部署成功后，访问以下链接进行：https://your-worker-url/connect/YOUR_UUID

## 👮 管理员命令（仅限 OWNER_ID）

向机器人发送以下命令以管理访客和系统设置：

| 命令 | 说明 |
|------|------|
| `/help` | 查看本帮助信息 |
| `/to <chat_id>` | 开始与指定访客的双向对话（可回复其消息） |
| `/unto` | 关闭当前正在对话的访客连接 |
| `/ban <user_id>` | 将用户加入黑名单，禁止其使用机器人 |
| `/unban <user_id>` | 从黑名单中移除用户 |
| `/banlist` | 列出所有被拉黑的用户 ID |
| `/yz <密码>` | 设置验证暗号（访客需发送此密码才能联系管理员） |
| `/unyz` | 关闭验证机制，允许所有人直接发消息 |
| `/clean` | 清空所有已通过验证的用户记录 |
