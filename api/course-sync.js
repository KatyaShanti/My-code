// Принимает цифры мини-курса «Финансы на кухне» от бота-продажника (Telegram).
// Бот шлёт POST с заголовком X-Stats-Key: STATS_KEY в 8:00 и 18:00 МСК и по кнопке «Обновить данные».
const { configured, pipeline } = require('./_store');

module.exports = async (req, res) => {
  const secret = process.env.STATS_KEY;
  if (!secret || req.headers['x-stats-key'] !== secret) return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(500).json({ ok: false, error: 'store_not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || !body.periods || !Array.isArray(body.stages)) return res.status(400).json({ ok: false });

  try {
    await pipeline([['SET', 'fnk:course', JSON.stringify(body)]]);
  } catch {
    return res.status(502).json({ ok: false });
  }
  return res.status(200).json({ ok: true });
};
