// Счётчик анкеты: событие со страницы → в общее хранилище счётчиков (проект finansy-na-kukhne, /api/track с f=ank).
const FNK = (process.env.FNK_URL || 'https://finansy-na-kukhne.vercel.app').replace(/\/$/, '');
const EVENTS = new Set(['visit', 'step1', 'step2', 'step3']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const e = String((body && body.e) || '');
  if (!EVENTS.has(e)) return res.status(400).end();
  try {
    await fetch(`${FNK}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ e, f: 'ank' }) });
  } catch {}
  return res.status(204).end();
};
