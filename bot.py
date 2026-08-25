import os
import json
import time
import datetime
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot import types

TOKEN = '8647743816:AAHxk9I_dnFOf6K3KHyrv7CBF4sEQ8SFftI'
WEBAPP_URL = 'https://2025iwork-lab.github.io/math-grade1/public/'
PARENT_LINKS_FILE = 'parent_links.json'
DAILY_STATS_FILE = 'daily_stats.json'

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

def load_daily_stats():
    if os.path.exists(DAILY_STATS_FILE):
        try:
            with open(DAILY_STATS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {DAILY_STATS_FILE}: {e}")
    return {}

def save_daily_stats(stats):
    try:
        with open(DAILY_STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving {DAILY_STATS_FILE}: {e}")

def get_main_reply_keyboard():
    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
    btn_app = types.KeyboardButton("🚀 Открыть тренажёр", web_app=types.WebAppInfo(url=WEBAPP_URL))
    btn_link = types.KeyboardButton("📱 Ссылка для ребёнка")
    keyboard.add(btn_app, btn_link)
    return keyboard

def setup_bot_commands():
    try:
        commands = [
            types.BotCommand("start", "🚀 Запустить тренажёр"),
            types.BotCommand("link", "📱 Ссылка для ребёнка"),
        ]
        bot.set_my_commands(commands)
    except Exception as e:
        print(f"Error setting bot commands: {e}")

def send_1730_child_reminders(date_str):
    links = load_parent_links()
    stats = load_daily_stats()
    day_data = stats.get(date_str, {})

    for child_id_str in links.keys():
        c_stats = day_data.get(child_id_str, {})
        sessions_count = c_stats.get('sessions_count', 0)
        if sessions_count == 0:
            msg_text = (
                "🚀 Привет! Пора размять мозги!\n"
                "Сегодня ещё не было тренировок (0 из 2). Заходи решить примеры и сохранить ударный режим! 🔥"
            )
            try:
                bot.send_message(int(child_id_str), msg_text, reply_markup=get_main_reply_keyboard())
            except Exception as e:
                print(f"Failed to send 17:30 reminder to child {child_id_str}: {e}")

def send_1900_child_reminders(date_str):
    links = load_parent_links()
    stats = load_daily_stats()
    day_data = stats.get(date_str, {})

    for child_id_str in links.keys():
        c_stats = day_data.get(child_id_str, {})
        sessions_count = c_stats.get('sessions_count', 0)
        if sessions_count == 1:
            msg_text = (
                "🎯 Остался один шаг!\n"
                "Ты выполнил 1 тренировку из 2. Сделай ещё один подход, чтобы закрыть дневную цель! ⭐️"
            )
            try:
                bot.send_message(int(child_id_str), msg_text, reply_markup=get_main_reply_keyboard())
            except Exception as e:
                print(f"Failed to send 19:00 reminder to child {child_id_str}: {e}")

def send_daily_digests(date_str):
    links = load_parent_links()
    stats = load_daily_stats()
    day_data = stats.get(date_str, {})

    for child_id_str, parent_id in links.items():
        if not parent_id:
            continue

        c_stats = day_data.get(child_id_str, {})
        sessions_count = c_stats.get('sessions_count', 0)
        child_name = c_stats.get('child_name', 'Ребёнок')
        total_solved = c_stats.get('total_solved', 0)
        correct_solved = c_stats.get('correct_solved', 0)
        total_stars = c_stats.get('total_stars', 0)

        if sessions_count >= 1:
            accuracy = round((correct_solved / total_solved) * 100) if total_solved > 0 else 0
            status_note = "✅ Дневная норма выполнена на отлично! 🚀" if sessions_count >= 2 else "⏳ Занятия начаты, но дневная норма не закрыта."
            msg_text = (
                f"🌙 Итоги дня по математике ({child_name}):\n\n"
                f"🎯 План на день: {sessions_count} из 2 сессий\n"
                f"🧮 Всего решено примеров: {total_solved}\n"
                f"⭐ Без ошибок: {correct_solved} из {total_solved} ({accuracy}%)\n"
                f"💰 Заработано звёзд: +{total_stars}\n\n"
                f"{status_note}"
            )
        else:
            msg_text = (
                f"🌙 Итоги дня по математике ({child_name}):\n\n"
                f"⚠️ Сегодня занятий не было (0 из 2 сессий).\n"
                f"Напомните ребёнку потренироваться завтра, чтобы не сбить ударный режим! 🔥"
            )

        try:
            bot.send_message(parent_id, msg_text)
        except Exception as e:
            print(f"Failed to send digest to parent {parent_id}: {e}")

def daily_digest_scheduler():
    last_sent_1730 = None
    last_sent_1900 = None
    last_sent_2000 = None

    while True:
        try:
            msk_tz = datetime.timezone(datetime.timedelta(hours=3))
            now = datetime.datetime.now(msk_tz)
            today_str = now.strftime('%Y-%m-%d')

            # 17:30 Напоминание детям (0 сессий)
            if now.hour == 17 and now.minute == 30:
                if last_sent_1730 != today_str:
                    send_1730_child_reminders(today_str)
                    last_sent_1730 = today_str

            # 19:00 Напоминание детям (1 сессия)
            if now.hour == 19 and now.minute == 0:
                if last_sent_1900 != today_str:
                    send_1900_child_reminders(today_str)
                    last_sent_1900 = today_str

            # 20:00 Вечерний дайджест родителям
            if now.hour == 20 and now.minute == 0:
                if last_sent_2000 != today_str:
                    send_daily_digests(today_str)
                    last_sent_2000 = today_str

            time.sleep(30)
        except Exception as e:
            print(f"Error in daily_digest_scheduler: {e}")
            time.sleep(30)

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

@bot.message_handler(content_types=['web_app_data'])
def handle_web_app_data(message):
    try:
        raw_data = message.web_app_data.data
        data = json.loads(raw_data)
        if data.get('type') == 'session_complete':
            child_id = message.from_user.id
            child_name = message.from_user.first_name or "Ребёнок"

            links = load_parent_links()
            parent_id = links.get(str(child_id))

            msk_tz = datetime.timezone(datetime.timedelta(hours=3))
            today_str = datetime.datetime.now(msk_tz).strftime('%Y-%m-%d')

            stats = load_daily_stats()
            if today_str not in stats:
                stats[today_str] = {}

            child_key = str(child_id)
            if child_key not in stats[today_str]:
                stats[today_str][child_key] = {
                    'parent_id': parent_id,
                    'child_name': child_name,
                    'sessions_count': 0,
                    'total_solved': 0,
                    'correct_solved': 0,
                    'errors': 0,
                    'total_stars': 0
                }

            c_stats = stats[today_str][child_key]
            c_stats['parent_id'] = parent_id or c_stats.get('parent_id')
            c_stats['child_name'] = child_name
            c_stats['sessions_count'] += 1
            c_stats['total_solved'] += int(data.get('total', 0))
            c_stats['correct_solved'] += int(data.get('correct', 0))
            c_stats['errors'] += int(data.get('errors', 0))
            c_stats['total_stars'] += int(data.get('stars', 0))

            save_daily_stats(stats)
    except Exception as e:
        print(f"Error handling web_app_data: {e}")

@bot.message_handler(commands=['link', 'parent'])
@bot.message_handler(func=lambda msg: msg.text and 'Ссылка для ребёнка' in msg.text)
def send_child_invite_link(message):
    try:
        user_id = message.from_user.id
        bot_username = bot.get_me().username
        link = f"https://t.me/{bot_username}?start=parent_{user_id}"
        msg_text = f"📱 Ссылка для устройства ребёнка:\nПерешлите эту ссылку ребёнку на его телефон или планшет:\n\n{link}\n\nКак только он перейдёт по ней, его прогресс будет приходить вам в этот чат! 🎉"
        bot.send_message(message.chat.id, msg_text, reply_markup=get_main_reply_keyboard())
    except Exception as e:
        print(f"Error sending child invite link: {e}")

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
            bot.send_message(
                message.chat.id,
                "Привет! Твой профиль успешно привязан к родителю. Приятных тренировок! 🚀",
                reply_markup=get_main_reply_keyboard()
            )

            # Уведомление родителю
            try:
                bot.send_message(parent_id, "Ребёнок успешно подключился по вашей ссылке! 🎉")
            except Exception as e:
                print(f"Could not notify parent {parent_id}: {e}")
            return

    # Штатный запуск без параметров
    bot.send_message(
        message.chat.id,
        "Привет! 👋 Нажми на кнопку ниже, чтобы запустить тренажёр по математике:",
        reply_markup=get_main_reply_keyboard()
    )

if __name__ == '__main__':
    setup_bot_commands()
    threading.Thread(target=run_server, daemon=True).start()
    threading.Thread(target=daily_digest_scheduler, daemon=True).start()
    bot.infinity_polling(skip_pending=True)
