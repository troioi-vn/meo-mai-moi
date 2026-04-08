interface TelegramLoginSettings {
  telegram_bot_username?: string | null;
}

function normalizeTelegramBotUsername(username?: string | null): string | null {
  if (typeof username !== "string") {
    return null;
  }

  const normalized = username.trim().replace(/^@+/, "");

  return normalized.length > 0 ? normalized : null;
}

export function resolveTelegramBotUsername(settings?: TelegramLoginSettings | null): string | null {
  const settingsUsername = normalizeTelegramBotUsername(settings?.telegram_bot_username);
  if (settingsUsername) {
    return settingsUsername;
  }

  return normalizeTelegramBotUsername(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
}

export function getTelegramLoginHref(settings?: TelegramLoginSettings | null): string | null {
  const username = resolveTelegramBotUsername(settings);

  return username ? `https://t.me/${username}?start=login` : null;
}
