import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot import types

TOKEN = '8647743816:AAHxk9I_dnFOf6K3KHyrv7CBF4sEQ8SFftI'
WEBAPP_URL = 'https://2025iwork-lab.github.io/math-grade1/public/'

bot = telebot.TeleBot(TOKEN)

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

@bot.message_handler(commands=['start'])
def start(message):
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

