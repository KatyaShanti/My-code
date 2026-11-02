// Аналитика мини-курса «Финансы на кухне» (Telegram-бот). Открывается по секретной ссылке: /api/course?key=STATS_KEY&p=7
// Цифры присылает бот (api/course-sync.js). Кнопка «Обновить данные» просит бота прислать свежие: BOT_URL/stats/course/refresh.
const { configured, pipeline } = require('./_store');

const PERIODS = [['today', 'Сегодня'], ['7', '7 дней'], ['30', '30 дней'], ['90', '90 дней'], ['all', 'Всё время']];
const ROWS = [['offer', 'Получили предложение по тарифу'], ['special', 'Получили спецпредложение'], ['active', 'Активировали спецпредложение']];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const msk = (ts) => new Date(ts * 1000).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function refresh(secret) {
  const bot = (process.env.BOT_URL || 'https://sales-agent-production-4dce.up.railway.app').replace(/\/$/, '');
  if (!bot) return 'off';
  try {
    const r = await fetch(`${bot}/stats/course/refresh`, { method: 'POST', headers: { 'X-Stats-Key': secret } });
    return r.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

module.exports = async (req, res) => {
  const secret = process.env.STATS_KEY;
  if (!secret || req.query.key !== secret) return res.status(404).send('Not found');
  if (!configured()) return res.status(500).send('Хранилище не подключено: Vercel → Storage → Upstash for Redis.');

  const p = PERIODS.some(([k]) => k === req.query.p) ? req.query.p : '7';
  const link = (q) => `?key=${encodeURIComponent(secret)}&p=${q}`;
  if (req.method === 'POST') {
    const r = await refresh(secret);
    res.setHeader('Location', `${link(p)}&r=${r}`);
    return res.status(303).end();
  }

  let data = null;
  try {
    const [raw] = await pipeline([['GET', 'fnk:course']]);
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return res.status(502).send('Не удалось прочитать цифры');
  }

  const c = (data && data.periods && data.periods[p]) || {};
  const n = (k) => Number(c[k]) || 0;
  const started = n('started');
  const rows = ROWS.map(([k, label]) => `<tr><td>${esc(label)}</td>
    <td class="n">${n(`${k}_self`)}</td><td class="n">${n(`${k}_personal`)}</td></tr>`).join('');
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const got = n(`day${d}`);
    const prev = d === 1 ? started : n(`day${d - 1}`);
    return `<tr><td>День ${d}${d === 7 ? ' (итог)' : ''}</td><td class="n">${got}</td>
    <td class="n">${pct(got, started)}</td><td class="n">${pct(got, prev)}</td></tr>`;
  }).join('');
  const notes = { ok: 'Бот прислал свежие цифры.', fail: 'Бот сейчас не ответил. Цифры ниже — с прошлого обновления.', off: 'Кнопка ещё не подключена к боту (нет BOT_URL).' };
  const note = notes[req.query.r] ? `<p class="note ${req.query.r === 'ok' ? '' : 'warn'}">${notes[req.query.r]}</p>` : '';

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Воронка мини-курса</title><style>
body{margin:0;background:#0B0D0C;color:#EEF3F0;font:15px/1.4 system-ui,sans-serif;padding:20px 16px}
h1{font-size:22px;margin:0 0 4px}p{color:#93A39A;margin:0 0 16px}
nav{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}nav a{color:#EEF3F0;border:1px solid #2C3530;border-radius:999px;padding:6px 14px;text-decoration:none}
nav a.on{background:#5DB58C;color:#0E3B27;border-color:#5DB58C}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.card{border:1px solid #2C3530;border-radius:12px;padding:12px}.card b{display:block;font-size:28px;font-variant-numeric:tabular-nums}.card span{color:#93A39A;font-size:13px}
.card.paid{border-color:#5DB58C}
.main{border:1px solid #5DB58C;background:#12241B;border-radius:14px;padding:16px;margin-bottom:16px}
.main b{display:block;font-size:44px;line-height:1.1;color:#5DB58C;font-variant-numeric:tabular-nums}.main span{color:#C9D6CF}
h2{font-size:17px;margin:22px 0 8px}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:420px}
th,td{padding:10px 8px;border-bottom:1px solid #2C3530;text-align:left}th{color:#93A39A;font-weight:500;font-size:13px}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:17px}
form{margin:0 0 16px}button{background:#EEF3F0;color:#0B0D0C;border:0;border-radius:999px;padding:9px 18px;font:inherit;font-weight:600;cursor:pointer}
button:disabled{opacity:.6}.note{color:#5DB58C}.note.warn{color:#E8B04A}.small{font-size:13px}</style></head><body>
<h1>Воронка мини-курса «Финансы на кухне»</h1>
<p>${data ? `Цифры от бота на ${esc(msk(data.updated))} МСК. Сам бот обновляет их в 8:00 и 18:00 МСК.` : 'Бот ещё не прислал цифры. Нажмите «Обновить данные».'}</p>
${note}
<form method="post" action="${link(p)}" onsubmit="this.querySelector('button').disabled=true;this.querySelector('button').textContent='Обновляю…'"><button type="submit">Обновить данные</button></form>
<nav>${PERIODS.map(([k, label]) => `<a class="${k === p ? 'on' : ''}" href="${link(k)}">${label}</a>`).join('')}</nav>
<div class="main"><span>Главная конверсия: начали курс → оплатили</span><b>${pct(n('paid'), started)}</b>
<span>${n('paid')} из ${started}</span></div>
<div class="cards">
<div class="card"><b>${started}</b><span>Начали курс</span></div>
<div class="card"><b>${n('day7')}</b><span>Дошли до итога дня 7</span></div>
<div class="card paid"><b>${n('paid')}</b><span>Оплатили · ${pct(n('paid'), started)} от начавших</span></div>
</div>
<h2>Прохождение по дням</h2>
<div class="wrap"><table><tr><th>День курса</th><th class="n">Получили</th><th class="n">От начавших</th><th class="n">От прошлого дня</th></tr>${days}</table></div>
<h2>Тарифы</h2>
<div class="wrap"><table><tr><th>Шаг</th><th class="n">Самостоятельный</th><th class="n">Личный</th></tr>${rows}</table></div>
<p class="small">Люди считаются по дню, когда сделали шаг: «Получили день 3 за 7 дней» — кому день 3 пришёл за эти 7 дней. «Активировали»: написали МЕД или ХОЧУ (самостоятельный), ХОЧУ (личный).
«Оплатили» — люди в папке 🥂. Для шагов до 01.11 день взят из записи курса, а если его нет — день старта курса.</p>
</body></html>`);
};
