# Финансы на кухне — навигатор

Страница навигатора (`index.html`) и обработчик заявок (`api/lead.js`) для Vercel.

Когда человек активирует бесплатное участие в мини-курсе, страница отправляет имя и Telegram на `/api/lead`, а обработчик пересылает их в Telegram-бот.

## Настройка в Vercel
1. Add New → Project → импортировать этот репозиторий.
2. Root Directory: `./` (корень). Framework Preset: Other.
3. Settings → Environment Variables:
   - `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather.
   - `TELEGRAM_CHAT_ID` — id чата, куда приходят заявки.
   - `LEAD_WEBHOOK_URL` — (необязательно) адрес webhook ИИ-агента, туда уходит JSON с заявкой.
4. Deploy.

## Счётчик воронки
1. Vercel → проект → Storage → Create Database → Upstash for Redis (бесплатный план) → Connect к проекту. Переменные `KV_REST_API_URL` и `KV_REST_API_TOKEN` добавятся сами.
2. Settings → Environment Variables → `STATS_KEY` — любой длинный секрет (например, 20 случайных букв и цифр).
3. Redeploy.
4. Отчёт: `https://<адрес сайта>/api/stats?key=<STATS_KEY>`. Переключатели: сегодня, 7, 30, 90 дней.
