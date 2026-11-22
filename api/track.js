// Принимает событие воронки со страницы и увеличивает счётчик за день.
const { configured, pipeline, day } = require('./_store');
const FUNNELS = require('./_funnels');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const f = body?.f === 'ank' ? 'ank' : 'fnk';   // ank — анкета предзаписи (шлёт её сайт)
  const ev = String(body?.e || '');
  if (!FUNNELS[f].events.some(([k]) => k === ev)) return res.status(400).end();

  const key = `${f}:${day()}:${ev}`;
  try {
    await pipeline([['INCR', key], ['EXPIRE', key, 60 * 60 * 24 * 400]]);
  } catch {
    return res.status(502).end();
  }
  return res.status(204).end();
};
