// Отчёт по воронке. Открывается только по секретной ссылке: /api/stats?key=STATS_KEY&days=7
const { configured, pipeline, day } = require('./_store');
const EVENTS = require('./_events');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

module.exports = async (req, res) => {
  const secret = process.env.STATS_KEY;
  if (!secret || req.query.key !== secret) return res.status(404).send('Not found');
  if (!configured()) return res.status(500).send('Хранилище не подключено: Vercel → Storage → Upstash for Redis.');

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 365);
  const dates = Array.from({ length: days }, (_, i) => day(new Date(Date.now() - i * 864e5)));

  let values;
  try {
    values = await pipeline(dates.flatMap((d) => EVENTS.map(([k]) => ['GET', `fnk:${d}:${k}`])));
  } catch {
    return res.status(502).send('Не удалось прочитать счётчики');
  }
  const total = Object.fromEntries(EVENTS.map(([k]) => [k, 0]));
  dates.forEach((_, di) => EVENTS.forEach(([k], ei) => { total[k] += Number(values[di * EVENTS.length + ei]) || 0; }));
  const today = Object.fromEntries(EVENTS.map(([k], ei) => [k, Number(values[ei]) || 0]));

  const visits = total.visit;
  const funnel = EVENTS.slice(0, 9);
  const rows = funnel.map(([k, label], i) => {
    const prev = i ? total[funnel[i - 1][0]] : total[k];
    const w = visits ? Math.round((total[k] / visits) * 100) : 0;
    return `<tr><td>${esc(label)}</td><td class="n">${total[k]}</td><td class="n">${pct(total[k], visits)}</td>
      <td class="n ${i && prev && total[k] / prev < 0.5 ? 'bad' : ''}">${i ? pct(total[k], prev) : ''}</td>
      <td class="bar"><i style="width:${w}%"></i></td><td class="n muted">${today[k]}</td></tr>`;
  }).join('');
  const extra = EVENTS.slice(9).map(([k, label]) =>
    `<tr><td>${esc(label)}</td><td class="n">${total[k]}</td><td class="n">${pct(total[k], visits)}</td><td></td><td></td><td class="n muted">${today[k]}</td></tr>`).join('');

  const link = (d) => `?key=${encodeURIComponent(secret)}&days=${d}`;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Воронка навигатора</title><style>
body{margin:0;background:#0B0D0C;color:#EEF3F0;font:15px/1.4 system-ui,sans-serif;padding:20px 16px}
h1{font-size:22px;margin:0 0 4px}p{color:#93A39A;margin:0 0 16px}
nav{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}nav a{color:#EEF3F0;border:1px solid #2C3530;border-radius:999px;padding:6px 14px;text-decoration:none}
nav a.on{background:#5DB58C;color:#0E3B27;border-color:#5DB58C}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:560px}
th,td{padding:10px 8px;border-bottom:1px solid #2C3530;text-align:left}th{color:#93A39A;font-weight:500;font-size:13px}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.muted{color:#93A39A}.bad{color:#EF6A5F;font-weight:600}
.bar{width:28%}.bar i{display:block;height:10px;border-radius:5px;background:#5DB58C}
h2{font-size:17px;margin:24px 0 8px}</style></head><body>
<h1>Воронка навигатора «Финансы на кухне»</h1>
<p>Уникальные люди за ${days} дн. Красным — шаги, где отваливается больше половины.</p>
<nav>${[1, 7, 30, 90].map((d) => `<a class="${d === days ? 'on' : ''}" href="${link(d)}">${d === 1 ? 'Сегодня' : d + ' дн.'}</a>`).join('')}</nav>
<div class="wrap"><table><tr><th>Шаг</th><th class="n">Людей</th><th class="n">От входа</th><th class="n">От прошлого</th><th></th><th class="n">Сегодня</th></tr>${rows}</table></div>
<h2>Действия</h2>
<div class="wrap"><table><tr><th>Действие</th><th class="n">Людей</th><th class="n">От входа</th><th></th><th></th><th class="n">Сегодня</th></tr>${extra}</table></div>
</body></html>`);
};
