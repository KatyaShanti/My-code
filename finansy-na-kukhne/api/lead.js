// Принимает заявку из навигатора и пересылает её в Telegram-бот Кати.
// Токен бота и chat_id хранятся в переменных окружения Vercel, а не в странице.
const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 100);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const name = clean(body?.name);
  const tg = clean(body?.tg);
  if (!name || !tg) return res.status(400).json({ ok: false, error: 'missing_fields' });

  const text = [
    '🎟 Новая активация мини-курса «Финансы на кухне»',
    `Имя: ${name}`,
    `Telegram: ${tg}`,
    `Источник: ${clean(body?.source) || 'навигатор'}`,
  ].join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch {
    return res.status(502).json({ ok: false });
  }
};
