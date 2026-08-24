import telebot
from telebot import types

TOKEN = "8647743816:AAHxk9I_dnFOf6K3KHyrv7CBF4sEQ8SFftI"
WEB_APP_URL = "https://2025iwork-lab.github.io/math-grade1/public/"

bot = telebot.TeleBot(TOKEN)


@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup()
    web_app_info = types.WebAppInfo(url=WEB_APP_URL)
    btn = types.InlineKeyboardButton(text="🚀 Открыть тренажёр", web_app=web_app_info)
    markup.add(btn)

    user_name = message.from_user.first_name or "друг"
    greeting = (
        f"Привет, {user_name}! 👋\n\n"
        "Добро пожаловать в Математический тренажёр!\n"
        "Нажми кнопку ниже, чтобы запустить приложение прямо в Telegram."
    )
    bot.send_message(message.chat.id, greeting, reply_markup=markup)


if __name__ == "__main__":
    print("🤖 Бот успешно запущен и готов к работе...")
    bot.infinity_polling()
