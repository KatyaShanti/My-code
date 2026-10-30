# Финансы на кухне — навигатор

Страница навигатора (`index.html`) и обработчик заявок (`api/lead.js`) для Vercel.

Когда человек активирует бесплатное участие в мини-курсе, страница отправляет имя и Telegram на `/api/lead`, а обработчик пересылает их в Telegram-бот.

## Настройка в Vercel
1. Add New → Project → импортировать этот репозиторий.
2. Root Directory: `./` (корень). Framework Preset: Other.
3. Settings → Environment Variables:
   - `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather.
   - `TELEGRAM_CHAT_ID` — id чата, куда приходят заявки.
4. Deploy.
