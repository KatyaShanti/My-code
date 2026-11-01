// Принимает событие воронки со страницы и увеличивает счётчик за день.
const { configured, pipeline, day } = require('./_store');
const EVENTS = new Set(require('./_events').map(([k]) => k));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!configured()) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const ev = String(body?.e || '');
  if (!EVENTS.has(ev)) return res.status(400).end();

  const key = `fnk:${day()}:${ev}`;
  try {
    await pipeline([['INCR', key], ['EXPIRE', key, 60 * 60 * 24 * 400]]);
  } catch {
    return res.status(502).end();
  }
  return res.status(204).end();
};
