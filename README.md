# Кромка

Сайт записи, админка и Telegram-бот для барбершопа в Екатеринбурге.

## Запуск

```bash
npm install
npm run dev
```

Сайт: http://localhost:3000  
Админка: http://localhost:3000/admin  
Пароль по умолчанию: `kromka`

Бот отдельным процессом:

```bash
npm run bot
```

Скопируйте `.env.example` в `.env` и заполните переменные.

## Telegram

1. Создайте бота у [BotFather](https://t.me/BotFather) и вставьте токен в `TELEGRAM_BOT_TOKEN`.
2. Напишите боту любое сообщение.
3. Откройте `https://api.telegram.org/bot<TOKEN>/getUpdates` и возьмите `chat.id` — это `TELEGRAM_NOTIFY_CHAT_ID`. Для группы добавьте бота в чат и повторите шаг.

Новые заявки с сайта и из бота, а также отмены, дублируются в этот чат. Если токена или id нет, запись всё равно сохраняется.

База: `data/kromka.sqlite`. Мокап создаётся при первом запуске.
