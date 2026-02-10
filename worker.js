export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") return new Response("\u6b22\u8fce\u4f7f\u7528\u0074\x67\u53cc\u5411\u804a\u5929\u673a\u5668\u4eba\uff1a\x68\x74\u0074\u0070\u0073\x3a\x2f\x2f\x67\u0069\x74\x68\u0075\u0062\x2e\u0063\u006f\x6d\u002f\u0066\x61\x73\u0063\x6d\x65\x72\u002f\u0074\u0065\u006c\u0065\u0067\x72\u0061\u006d\u002d\u0063\u0068\u0061\x74\x2d\x62\x6f\x74\x2d\x62\u0079\x2d\x63\x66\x2d\u0077\u006f\u0072\x6b\u0065\x72", { status: 200 });

    if (url.pathname === "/connect/" + env.WEBHOOK_UUID) {
      const workerDomain = request.headers.get("host");
      const webhookUrl = `https://${workerDomain}/webhook/${env.WEBHOOK_UUID}`;
      const apiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      });

      const result = await response.json();
      if (result.ok) {
        return new Response("Webhook successfully set!", { status: 200 });
      } else {
        return new Response(`Failed to set webhook: ${result.description}`, { status: 500 });
      }
    }

    if (!url.pathname.startsWith("/webhook/" + env.WEBHOOK_UUID)) return new Response("Forbidden", { status: 403 });
    if (request.method !== "POST") return new Response("OK");

    const update = await request.json();
    if (!update.message) return new Response("No message");

    const msg = update.message;
    const fromId = msg.from?.id;
    const text = msg.text?.trim();
    const kv = env["tg-chat"];

    const VERIFIED_KEY = "verified_users";
    const BLACKLIST_KEY = "blacklist";
    const PASSWORD_KEY = "password";
    const CURRENT_CHAT_KEY = "current_chat";
    const api = `https://api.telegram.org/bot${env.BOT_TOKEN}`;

    let verifiedList = await kv.get(VERIFIED_KEY);
    verifiedList = verifiedList ? JSON.parse(verifiedList) : [];

    let blacklist = await kv.get(BLACKLIST_KEY);
    blacklist = blacklist ? JSON.parse(blacklist) : [];

    let currentChat = await kv.get(CURRENT_CHAT_KEY);
    const currentChatId = currentChat ? Number(currentChat) : null;

    if (fromId === Number(env.OWNER_ID) && text) {
      if (text === "/help") {
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.OWNER_ID,
            text: `📜 可用命令列表：
            /help - 查看此帮助信息
            /ban <user_id> - 禁用用户
            /unban <user_id> - 解除禁用
            /banlist - 查看黑名单
            /to <chat_id> - 开始与该用户的双向对话
            /unto - 关闭当前对话
            /yz <new_password> - 更换验证暗号
            /clean - 清空验证用户名单
            /unyz - 关闭验证`
          })
        });
        return new Response("OK");
      }

      if (text.startsWith("/ban ")) {
        const targetId = Number(text.split(" ")[1]);
        if (!blacklist.includes(targetId)) blacklist.push(targetId);
        await kv.put(BLACKLIST_KEY, JSON.stringify(blacklist));
        return new Response("OK");
      }

      if (text.startsWith("/unban ")) {
        const targetId = Number(text.split(" ")[1]);
        blacklist = blacklist.filter(id => id !== targetId);
        await kv.put(BLACKLIST_KEY, JSON.stringify(blacklist));
        return new Response("OK");
      }

      if (text === "/banlist") {
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: `📛 黑名单用户:\n${blacklist.join("\n") || "空"}` })
        });
        return new Response("OK");
      }

      if (text.startsWith("/to ")) {
        const targetChatId = Number(text.split(" ")[1]);
        await kv.put(CURRENT_CHAT_KEY, targetChatId.toString());
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: `✅ 已开启与 ${targetChatId} 的双向对话` })
        });
        return new Response("OK");
      }

      if (text.startsWith("/unto")) {
        await kv.delete(CURRENT_CHAT_KEY);
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: "✅ 已关闭双向对话" })
        });
        return new Response("OK");
      }

      if (text.startsWith("/unyz")) {
        await kv.put(PASSWORD_KEY, "");
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: "✅ 已关闭验证" })
        });
        return new Response("OK");
      }

      if (text.startsWith("/yz ")) {
        const newPassword = text.split(" ")[1];
        await kv.put(PASSWORD_KEY, newPassword);
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: `✅ 暗号已更换为：${newPassword}` })
        });
        return new Response("OK");
      }

      if (text === "/clean") {
        await kv.put(VERIFIED_KEY, JSON.stringify([]));
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.OWNER_ID, text: "✅ 验证名单已清空" })
        });
        return new Response("OK");
      }
    }

    if (fromId === Number(env.OWNER_ID) && currentChatId) {
      await fetch(`${api}/copyMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: currentChatId,
          from_chat_id: msg.chat.id,
          message_id: msg.message_id
        })
      });
      return new Response("OK");
    }

    if (fromId === Number(env.OWNER_ID)) {
      return new Response("Ignored");
    }

    if (blacklist.includes(fromId)) {
      await fetch(`${api}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: fromId, text: "❌ 你已被管理员拉入黑名单，无法继续与机器人互动。" })
      });
      return new Response("OK");
    }

    const currentPassword = await kv.get(PASSWORD_KEY);
    const isVerified = verifiedList.includes(fromId);

    if (currentPassword && !isVerified) {
      if (text === currentPassword) {
        verifiedList.push(fromId);
        await kv.put(VERIFIED_KEY, JSON.stringify(verifiedList));
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: fromId, text: "✅ 验证成功，你的消息将被转发给管理员。" })
        });
      } else {
        await fetch(`${api}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: fromId, text: "❌ 请发送正确的暗号验证身份。" })
        });
      }
      return new Response("OK");
    }

    await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.OWNER_ID,
        text:
          `📨 新消息\n` +
          `👤 ${msg.from.first_name || ""} ${msg.from.last_name || ""}\n` +
          `/to ${fromId}\n` +
          `/ban ${fromId}\n` +
          (msg.from.username ? `@${msg.from.username}` : "")
      })
    });

    await fetch(`${api}/copyMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.OWNER_ID,
        from_chat_id: msg.chat.id,
        message_id: msg.message_id
      })
    });

    return new Response("OK");
  }
};

