import os
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot import types

TOKEN = '8647743816:AAHxk9I_dnFOf6K3KHyrv7CBF4sEQ8SFftI'
WEBAPP_URL = 'https://2025iwork-lab.github.io/math-grade1/public/'
PARENT_LINKS_FILE = 'parent_links.json'

bot = telebot.TeleBot(TOKEN)

def load_parent_links():
    if os.path.exists(PARENT_LINKS_FILE):
        try:
            with open(PARENT_LINKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {PARENT_LINKS_FILE}: {e}")
    return {}

def save_parent_links(links):
    try:
        with open(PARENT_LINKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(links, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving {PARENT_LINKS_FILE}: {e}")

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot is running!')

    def log_message(self, format, *args):
        return

def run_server():
    port = int(os.environ.get('PORT', 10000))
    server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
    server.serve_forever()

@bot.message_handler(commands=['parent'])
def parent_command(message):
    try:
        user_id = message.from_user.id
        bot_username = bot.get_me().username
        link = f"https://t.me/{bot_username}?start=parent_{user_id}"
        msg = f"📱 Ссылка для устройства ребёнка:\nПерешлите эту ссылку ребёнку на его телефон или планшет:\n\n{link}\n\nКак только он перейдёт по ней, его прогресс будет приходить вам в этот чат! 🎉"
        bot.send_message(message.chat.id, msg)
    except Exception as e:
        print(f"Error handling /parent command: {e}")

@bot.message_handler(commands=['start'])
def start(message):
    args = message.text.split()
    if len(args) > 1 and args[1].startswith('parent_'):
        parent_id_str = args[1].replace('parent_', '')
        if parent_id_str.isdigit():
            parent_id = int(parent_id_str)
            child_id = message.from_user.id

            links = load_parent_links()
            links[str(child_id)] = parent_id
            save_parent_links(links)

            # Сообщение ребёнку
            markup = types.InlineKeyboardMarkup()
            btn = types.InlineKeyboardButton("🚀 Открыть тренажёр", web_app=types.WebAppInfo(url=WEBAPP_URL))
            markup.add(btn)
            bot.send_message(
                message.chat.id,
                "Привет! Твой профиль успешно привязан к родителю. Приятных тренировок! 🚀",
                reply_markup=markup
            )

            # Уведомление родителю
            try:
                bot.send_message(parent_id, "Ребёнок успешно подключился по вашей ссылке! 🎉")
            except Exception as e:
                print(f"Could not notify parent {parent_id}: {e}")
            return

    # Штатный запуск без параметров
    markup = types.InlineKeyboardMarkup()
    btn = types.InlineKeyboardButton("🚀 Открыть тренажёр", web_app=types.WebAppInfo(url=WEBAPP_URL))
    markup.add(btn)
    bot.send_message(
        message.chat.id,
        "Привет! 👋 Нажми на кнопку ниже, чтобы запустить тренажёр по математике:",
        reply_markup=markup
    )

if __name__ == '__main__':
    threading.Thread(target=run_server, daemon=True).start()
    bot.infinity_polling(skip_pending=True)
