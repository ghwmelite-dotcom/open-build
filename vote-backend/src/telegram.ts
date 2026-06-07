import type { Env } from "./types";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Post a message to a Telegram chat (group or channel) via the bot.
// Returns true on success. Never throws — callers can treat it as best-effort.
export async function tgSend(env: Env, chatId: string, text: string): Promise<boolean> {
  if (!chatId || !env.TELEGRAM_BOT_TOKEN) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
