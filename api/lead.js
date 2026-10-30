// Принимает заявку из навигатора и пересылает её в Telegram-бот и/или на webhook ИИ-агента.
// Токен, chat_id и адрес webhook хранятся в переменных окружения Vercel, а не в странице.
const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 100);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (!(token && chatId) && !webhook) return res.status(500).json({ ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const name = clean(body?.name);
  const tg = clean(body?.tg);
  if (!name || !/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(tg)) {
    return res.status(400).json({ ok: false, error: 'invalid_fields' });
  }
  const source = clean(body?.source) || 'навигатор';

  const text = [
    '🎟 Новая активация мини-курса «Финансы на кухне»',
    `Имя: ${name}`,
    `Telegram: ${tg}`,
    `Источник: ${source}`,
  ].join('\n');

  const sends = [];
  if (token && chatId) {
    sends.push(fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }));
  }
  if (webhook) {
    sends.push(fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'course_activation', name, tg, source, text }),
    }));
  }

  const results = await Promise.allSettled(sends);
  const ok = results.some((r) => r.status === 'fulfilled' && r.value.ok);
  return res.status(ok ? 200 : 502).json({ ok });
};
