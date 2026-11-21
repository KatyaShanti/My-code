// Анкета предзаписи на бесплатные разборы 2027 → бот-продажник (он пишет строку в Notion и сообщает Кате).
// Адрес бота с ключом — переменная Vercel ANKETA_WEBHOOK_URL: http://<сервер>:8080/leads/anketa?key=…
const FIELDS = ['name', 'city', 'telegram', 'request', 'since', 'tried', 'result'];
const REQUIRED = ['name', 'telegram', 'request'];
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  if (body.website) return res.status(200).json({ ok: true });   // поле-ловушка заполнили — это робот

  const data = {};
  for (const k of FIELDS) data[k] = clean(body[k], ['name', 'city', 'telegram'].includes(k) ? 100 : 1800);
  const missing = REQUIRED.find((k) => !data[k]);
  if (missing) return res.status(400).json({ ok: false, error: `missing ${missing}` });

  const webhook = process.env.ANKETA_WEBHOOK_URL;
  if (!webhook) return res.status(500).json({ ok: false, error: 'not_configured' });
  try {
    const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch {
    return res.status(502).json({ ok: false });
  }
};
