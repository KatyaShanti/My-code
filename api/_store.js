// Хранилище счётчиков: Upstash Redis через REST (Vercel → Storage → Upstash for Redis).
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = () => Boolean(url() && token());

// commands: [["INCR","key"], ...] → массив результатов
async function pipeline(commands) {
  const r = await fetch(`${url()}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`store ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

// Дата по Москве, чтобы сутки в отчёте совпадали с привычными
const day = (d = new Date()) => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10);

module.exports = { configured, pipeline, day };
