// Личный кабинет Кати: одна страница со всеми счётчиками (22.11 просьба Кати).
// Вход по паролю KABINET_PASSWORD (22.11 Катя выбрала простой) или STATS_KEY. Под каждой ссылкой — сколько людей за 30 дней и за всё время.
// Сайт программы считает сам (база Neon) и отдаёт две цифры по ключу HUB_KEY: PROGRAM_URL/api/summary.
const { configured, pipeline, day } = require('./_store');

const PROGRAM = (process.env.PROGRAM_URL || 'https://ot-haosa-k-poryadku.vercel.app').replace(/\/$/, '');
const ANKETA = 'https://anketa-vercel-olive.vercel.app';
const ALL_DAYS = 400;   // столько дней живут дневные счётчики

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('ru-RU'));

// {month, total} по дневным счётчикам события ev воронки f
async function sums(f, ev) {
  const keys = Array.from({ length: ALL_DAYS }, (_, i) => `${f}:${day(new Date(Date.now() - i * 864e5))}:${ev}`);
  const [vals] = await pipeline([['MGET', ...keys]]);
  const v = (vals || []).map((x) => Number(x) || 0);
  return { month: v.slice(0, 30).reduce((a, b) => a + b, 0), total: v.reduce((a, b) => a + b, 0) };
}

async function program() {
  const key = process.env.HUB_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${PROGRAM}/api/summary`, { headers: { 'X-Hub-Key': key } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const page = (body) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Личный кабинет</title><style>
body{margin:0;background:#0B0D0C;color:#EEF3F0;font:16px/1.45 system-ui,sans-serif;padding:24px 16px}
main{max-width:640px;margin:0 auto}h1{font-size:24px;margin:0 0 4px}.sub{color:#93A39A;margin:0 0 20px}
.card{display:block;background:#141816;border:1px solid #2C3530;border-radius:16px;padding:16px 18px;margin-bottom:12px;color:inherit;text-decoration:none}
.card:hover{border-color:#5DB58C}.card b{font-size:18px}.card .go{color:#5DB58C;float:right}
.line{color:#93A39A;font-size:14px;margin-top:6px}.line strong{color:#EEF3F0;font-weight:600}
.small{color:#93A39A;font-size:13px;margin-top:4px}
form{display:flex;gap:8px;flex-wrap:wrap}input{flex:1;min-width:0;font:inherit;padding:12px 14px;border-radius:12px;border:1px solid #2C3530;background:#141816;color:#EEF3F0}
button{font:inherit;padding:12px 18px;border:0;border-radius:12px;background:#5DB58C;color:#0E3B27;font-weight:600}
.err{color:#EF6A5F}</style></head><body><main>${body}</main></body></html>`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const secret = process.env.STATS_KEY;
  const given = String(req.query.key || '');
  const pass = (process.env.KABINET_PASSWORD || '').trim();
  if (!secret || !given || (given !== secret && given !== pass)) {
    return res.status(given ? 401 : 200).send(page(`<h1>Личный кабинет</h1><p class="sub">Все счётчики на одной странице.</p>
<form method="get"><input type="password" name="key" id="k" placeholder="Пароль" autocomplete="current-password" required><button>Войти</button></form>
${given ? '<p class="err">Пароль не подошёл.</p>' : ''}
<script>try{var k=localStorage.getItem('kab-key');if(k&&!${JSON.stringify(Boolean(given))})location.replace('?key='+encodeURIComponent(k));if(${JSON.stringify(Boolean(given))})localStorage.removeItem('kab-key')}catch(e){}</script>`));
  }

  const q = encodeURIComponent(secret);
  let nav = null, ank = null, sent = null, course = null;
  const prog = program();
  if (configured()) {
    try {
      [nav, ank, sent] = await Promise.all([sums('fnk', 'visit'), sums('ank', 'visit'), sums('ank', 'step3')]);
      const [raw] = await pipeline([['GET', 'fnk:course']]);
      course = raw ? JSON.parse(raw) : null;
    } catch {}
  }
  const pr = await prog;
  const started = (p) => (course && course.periods && course.periods[p] ? Number(course.periods[p].started) || 0 : null);
  const line = (what, s) => `<div class="line">${what}: за месяц <strong>${num(s && s.month)}</strong> · за всё время <strong>${num(s && s.total)}</strong></div>`;
  const card = (href, title, lines, ext) => `<a class="card" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}><span class="go">Открыть →</span><b>${esc(title)}</b>${lines}</a>`;

  res.status(200).send(page(`<h1>Личный кабинет</h1><p class="sub">Все счётчики на одной странице. «За месяц» — последние 30 дней.</p>
${card(`${PROGRAM}/stats`, 'Программа курса «От хаоса к порядку»', line('Зашли на сайт', pr) + '<div class="small">Пароль тот же, что здесь.</div>', true)}
${card(`/api/stats?key=${q}&days=30`, 'Приложение «Финансы на кухне»', line('Открыли навигатор', nav))}
${card(`/api/course?key=${q}&p=30`, 'Мини-курс «Финансы на кухне» в боте', line('Начали курс', { month: started('30'), total: started('all') }))}
${card(`/api/stats?key=${q}&f=ank&days=30`, 'Анкета предзаписи на разборы 2027', line('Открыли анкету', ank) + line('Анкета дошла', sent) + '<div class="small">Считаем с 22.11.2026.</div>')}
<p class="small"><a href="${ANKETA}" target="_blank" rel="noopener" style="color:#93A39A">Сама анкета</a> · <a href="/" target="_blank" rel="noopener" style="color:#93A39A">Сам навигатор</a> · <a href="${PROGRAM}" target="_blank" rel="noopener" style="color:#93A39A">Сайт программы</a></p>
<script>try{localStorage.setItem('kab-key',${JSON.stringify(secret)})}catch(e){}</script>`));
};
