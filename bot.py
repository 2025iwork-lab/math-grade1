import os
import json
import time
import datetime
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot import types

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None
    HAS_PSYCOPG2 = False

TOKEN = os.getenv("BOT_TOKEN", "8647743816:AAEZsQYGw63XrPYrWjScJjWPgG5zCftgE1I").strip()
WEBAPP_URL = 'https://2025iwork-lab.github.io/math-grade1/public/'
PARENT_LINKS_FILE = 'parent_links.json'
DAILY_STATS_FILE = 'daily_stats.json'
STATS_HISTORY_FILE = 'stats_history.json'
SUBSCRIPTIONS_FILE = 'subscriptions.json'
ADMIN_IDS = [623166117]

bot = telebot.TeleBot(TOKEN)

def get_db_connection():
    if not HAS_PSYCOPG2:
        return None
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None
    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        return conn
    except Exception as e:
        print(f"[DB ERROR] Failed to connect to PostgreSQL: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if not conn:
        print("[DB INFO] PostgreSQL connection is not available. Operating in local JSON fallback mode.")
        return False
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id BIGINT PRIMARY KEY,
                        username TEXT,
                        first_name TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS parent_child (
                        parent_id BIGINT,
                        child_id BIGINT,
                        PRIMARY KEY (parent_id, child_id)
                    );

                    CREATE TABLE IF NOT EXISTS daily_stats (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT,
                        date DATE,
                        sessions_count INT DEFAULT 0,
                        solved_count INT DEFAULT 0,
                        correct_count INT DEFAULT 0,
                        errors_count INT DEFAULT 0,
                        total_stars INT DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, date)
                    );

                    CREATE TABLE IF NOT EXISTS stats_history (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT,
                        child_name TEXT,
                        date DATE,
                        correct INT DEFAULT 0,
                        total INT DEFAULT 0,
                        errors INT DEFAULT 0,
                        stars INT DEFAULT 0,
                        timestamp BIGINT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS subscriptions (
                        user_id BIGINT PRIMARY KEY,
                        status TEXT,
                        amount INT DEFAULT 0,
                        start_date DATE,
                        expire_date DATE,
                        history JSONB,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
        print("[DB INFO] Database schema initialized successfully.")
        return True
    except Exception as e:
        print(f"[DB ERROR] Failed to initialize schema: {e}")
        return False
    finally:
        conn.close()

def migrate_json_to_db():
    conn = get_db_connection()
    if not conn:
        return
    try:
        # 1. Migrate parent_links.json
        if os.path.exists(PARENT_LINKS_FILE):
            try:
                with open(PARENT_LINKS_FILE, 'r', encoding='utf-8') as f:
                    links = json.load(f)
                if isinstance(links, dict) and links:
                    with conn:
                        with conn.cursor() as cur:
                            for child_id_str, parent_id in links.items():
                                if child_id_str and parent_id:
                                    c_id = int(child_id_str)
                                    p_id = int(parent_id)
                                    cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (c_id,))
                                    cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (p_id,))
                                    cur.execute("INSERT INTO parent_child (parent_id, child_id) VALUES (%s, %s) ON CONFLICT (parent_id, child_id) DO NOTHING;", (p_id, c_id))
                    print(f"[DB MIGRATION] Imported records from {PARENT_LINKS_FILE}")
            except Exception as e:
                print(f"[DB MIGRATION ERROR] {PARENT_LINKS_FILE}: {e}")

        # 2. Migrate daily_stats.json
        if os.path.exists(DAILY_STATS_FILE):
            try:
                with open(DAILY_STATS_FILE, 'r', encoding='utf-8') as f:
                    stats = json.load(f)
                if isinstance(stats, dict) and stats:
                    with conn:
                        with conn.cursor() as cur:
                            for date_str, day_data in stats.items():
                                if isinstance(day_data, dict):
                                    for child_id_str, c_info in day_data.items():
                                        if str(child_id_str).isdigit():
                                            c_id = int(child_id_str)
                                            c_name = c_info.get('child_name')
                                            cur.execute("INSERT INTO users (user_id, first_name) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, users.first_name);", (c_id, c_name))
                                            p_id = c_info.get('parent_id')
                                            if p_id:
                                                cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (int(p_id),))
                                                cur.execute("INSERT INTO parent_child (parent_id, child_id) VALUES (%s, %s) ON CONFLICT (parent_id, child_id) DO NOTHING;", (int(p_id), c_id))

                                            sessions = int(c_info.get('sessions_count', 0))
                                            solved = int(c_info.get('total_solved', 0))
                                            correct = int(c_info.get('correct_solved', 0))
                                            errors = int(c_info.get('errors', 0))
                                            stars = int(c_info.get('total_stars', 0))
                                            cur.execute("""
                                                INSERT INTO daily_stats (user_id, date, sessions_count, solved_count, correct_count, errors_count, total_stars)
                                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                                                ON CONFLICT (user_id, date) DO UPDATE SET
                                                    sessions_count = GREATEST(daily_stats.sessions_count, EXCLUDED.sessions_count),
                                                    solved_count = GREATEST(daily_stats.solved_count, EXCLUDED.solved_count),
                                                    correct_count = GREATEST(daily_stats.correct_count, EXCLUDED.correct_count),
                                                    errors_count = GREATEST(daily_stats.errors_count, EXCLUDED.errors_count),
                                                    total_stars = GREATEST(daily_stats.total_stars, EXCLUDED.total_stars);
                                            """, (c_id, date_str, sessions, solved, correct, errors, stars))
                    print(f"[DB MIGRATION] Imported records from {DAILY_STATS_FILE}")
            except Exception as e:
                print(f"[DB MIGRATION ERROR] {DAILY_STATS_FILE}: {e}")

        # 3. Migrate stats_history.json
        if os.path.exists(STATS_HISTORY_FILE):
            try:
                with open(STATS_HISTORY_FILE, 'r', encoding='utf-8') as f:
                    history = json.load(f)
                if isinstance(history, list) and history:
                    with conn:
                        with conn.cursor() as cur:
                            for rec in history:
                                if isinstance(rec, dict) and rec.get('child_id'):
                                    c_id = int(rec['child_id'])
                                    c_name = rec.get('child_name')
                                    d_str = rec.get('date')
                                    correct = int(rec.get('correct', 0))
                                    total = int(rec.get('total', 0))
                                    errors = int(rec.get('errors', 0))
                                    stars = int(rec.get('stars', 0))
                                    ts = int(rec.get('timestamp') or time.time())
                                    cur.execute("INSERT INTO users (user_id, first_name) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, users.first_name);", (c_id, c_name))
                                    cur.execute("""
                                        INSERT INTO stats_history (user_id, child_name, date, correct, total, errors, stars, timestamp)
                                        SELECT %s, %s, %s, %s, %s, %s, %s, %s
                                        WHERE NOT EXISTS (
                                            SELECT 1 FROM stats_history WHERE user_id = %s AND timestamp = %s
                                        );
                                    """, (c_id, c_name, d_str, correct, total, errors, stars, ts, c_id, ts))
                    print(f"[DB MIGRATION] Imported records from {STATS_HISTORY_FILE}")
            except Exception as e:
                print(f"[DB MIGRATION ERROR] {STATS_HISTORY_FILE}: {e}")

        # 4. Migrate subscriptions.json
        if os.path.exists(SUBSCRIPTIONS_FILE):
            try:
                with open(SUBSCRIPTIONS_FILE, 'r', encoding='utf-8') as f:
                    subs = json.load(f)
                if isinstance(subs, dict) and subs:
                    sub_items = [subs] if ("user_id" in subs and "status" in subs) else list(subs.values())
                    with conn:
                        with conn.cursor() as cur:
                            for s in sub_items:
                                if isinstance(s, dict) and s.get('user_id'):
                                    u_id = int(s['user_id'])
                                    status = s.get('status')
                                    amount = int(s.get('amount', 0))
                                    start_date = s.get('start_date')
                                    expire_date = s.get('expire_date')
                                    hist = json.dumps(s.get('history', []))
                                    cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (u_id,))
                                    cur.execute("""
                                        INSERT INTO subscriptions (user_id, status, amount, start_date, expire_date, history)
                                        VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                                        ON CONFLICT (user_id) DO UPDATE SET
                                            status = EXCLUDED.status,
                                            amount = EXCLUDED.amount,
                                            start_date = EXCLUDED.start_date,
                                            expire_date = EXCLUDED.expire_date,
                                            history = EXCLUDED.history;
                                    """, (u_id, status, amount, start_date, expire_date, hist))
                    print(f"[DB MIGRATION] Imported records from {SUBSCRIPTIONS_FILE}")
            except Exception as e:
                print(f"[DB MIGRATION ERROR] {SUBSCRIPTIONS_FILE}: {e}")

    except Exception as e:
        print(f"[DB MIGRATION ERROR] Migration failed: {e}")
    finally:
        conn.close()

def load_subscriptions():
    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT user_id, status, amount, start_date::text, expire_date::text, history FROM subscriptions;")
                    rows = cur.fetchall()
                    res = {}
                    for row in rows:
                        u_id = str(row['user_id'])
                        res[u_id] = {
                            "user_id": u_id,
                            "status": row['status'],
                            "amount": row['amount'] or 0,
                            "start_date": row['start_date'],
                            "expire_date": row['expire_date'],
                            "history": row['history'] if row['history'] else []
                        }
                    return res
        except Exception as e:
            print(f"[DB ERROR] Error loading subscriptions from DB: {e}")
        finally:
            conn.close()

    if os.path.exists(SUBSCRIPTIONS_FILE):
        try:
            with open(SUBSCRIPTIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {SUBSCRIPTIONS_FILE}: {e}")
    return {}

def save_subscriptions(subs):
    try:
        with open(SUBSCRIPTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(subs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving {SUBSCRIPTIONS_FILE}: {e}")

    conn = get_db_connection()
    if conn:
        try:
            items = []
            if isinstance(subs, dict):
                if "user_id" in subs and "status" in subs:
                    items = [subs]
                else:
                    for k, v in subs.items():
                        if isinstance(v, dict):
                            v_copy = dict(v)
                            if "user_id" not in v_copy:
                                v_copy["user_id"] = str(k)
                            items.append(v_copy)
            elif isinstance(subs, list):
                items = subs

            with conn:
                with conn.cursor() as cur:
                    for item in items:
                        if isinstance(item, dict) and item.get('user_id'):
                            u_id = int(item.get('user_id'))
                            status = item.get('status')
                            amount = int(item.get('amount', 0))
                            start_date = item.get('start_date')
                            expire_date = item.get('expire_date')
                            hist = json.dumps(item.get('history', []))
                            cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (u_id,))
                            cur.execute("""
                                INSERT INTO subscriptions (user_id, status, amount, start_date, expire_date, history)
                                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                                ON CONFLICT (user_id) DO UPDATE SET
                                    status = EXCLUDED.status,
                                    amount = EXCLUDED.amount,
                                    start_date = EXCLUDED.start_date,
                                    expire_date = EXCLUDED.expire_date,
                                    history = EXCLUDED.history;
                            """, (u_id, status, amount, start_date, expire_date, hist))
        except Exception as e:
            print(f"[DB ERROR] Error saving subscriptions to DB: {e}")
        finally:
            conn.close()

def get_subscription_list():
    subs = load_subscriptions()
    if isinstance(subs, dict):
        if "user_id" in subs and "status" in subs:
            return [subs]
        res = []
        for k, v in subs.items():
            if isinstance(v, dict):
                v_copy = dict(v)
                if "user_id" not in v_copy:
                    v_copy["user_id"] = str(k)
                res.append(v_copy)
        return res
    elif isinstance(subs, list):
        return subs
    return []

def load_parent_links():
    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT child_id, parent_id FROM parent_child;")
                    rows = cur.fetchall()
                    res = {}
                    for row in rows:
                        res[str(row['child_id'])] = row['parent_id']
                    return res
        except Exception as e:
            print(f"[DB ERROR] Error loading parent_links from DB: {e}")
        finally:
            conn.close()

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

    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor() as cur:
                    for child_id_str, parent_id in links.items():
                        if child_id_str and parent_id:
                            c_id = int(child_id_str)
                            p_id = int(parent_id)
                            cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (c_id,))
                            cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (p_id,))
                            cur.execute("INSERT INTO parent_child (parent_id, child_id) VALUES (%s, %s) ON CONFLICT (parent_id, child_id) DO NOTHING;", (p_id, c_id))
        except Exception as e:
            print(f"[DB ERROR] Error saving parent_links to DB: {e}")
        finally:
            conn.close()

def load_daily_stats():
    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT ds.user_id, ds.date::text, ds.sessions_count, ds.solved_count, ds.correct_count, ds.errors_count, ds.total_stars,
                               u.first_name AS child_name, pc.parent_id
                        FROM daily_stats ds
                        LEFT JOIN users u ON ds.user_id = u.user_id
                        LEFT JOIN parent_child pc ON ds.user_id = pc.child_id;
                    """)
                    rows = cur.fetchall()
                    res = {}
                    for row in rows:
                        d_str = row['date']
                        c_key = str(row['user_id'])
                        if d_str not in res:
                            res[d_str] = {}
                        res[d_str][c_key] = {
                            'parent_id': row['parent_id'],
                            'child_name': row['child_name'] or 'Ребёнок',
                            'sessions_count': row['sessions_count'] or 0,
                            'total_solved': row['solved_count'] or 0,
                            'correct_solved': row['correct_count'] or 0,
                            'errors': row['errors_count'] or 0,
                            'total_stars': row['total_stars'] or 0
                        }
                    return res
        except Exception as e:
            print(f"[DB ERROR] Error loading daily_stats from DB: {e}")
        finally:
            conn.close()

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

    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor() as cur:
                    for date_str, day_data in stats.items():
                        if isinstance(day_data, dict):
                            for child_id_str, c_info in day_data.items():
                                if str(child_id_str).isdigit():
                                    c_id = int(child_id_str)
                                    c_name = c_info.get('child_name')
                                    cur.execute("INSERT INTO users (user_id, first_name) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, users.first_name);", (c_id, c_name))
                                    p_id = c_info.get('parent_id')
                                    if p_id:
                                        cur.execute("INSERT INTO users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING;", (int(p_id),))
                                        cur.execute("INSERT INTO parent_child (parent_id, child_id) VALUES (%s, %s) ON CONFLICT (parent_id, child_id) DO NOTHING;", (int(p_id), c_id))

                                    sessions = int(c_info.get('sessions_count', 0))
                                    solved = int(c_info.get('total_solved', 0))
                                    correct = int(c_info.get('correct_solved', 0))
                                    errors = int(c_info.get('errors', 0))
                                    stars = int(c_info.get('total_stars', 0))
                                    cur.execute("""
                                        INSERT INTO daily_stats (user_id, date, sessions_count, solved_count, correct_count, errors_count, total_stars)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                                        ON CONFLICT (user_id, date) DO UPDATE SET
                                            sessions_count = EXCLUDED.sessions_count,
                                            solved_count = EXCLUDED.solved_count,
                                            correct_count = EXCLUDED.correct_count,
                                            errors_count = EXCLUDED.errors_count,
                                            total_stars = EXCLUDED.total_stars;
                                    """, (c_id, date_str, sessions, solved, correct, errors, stars))
        except Exception as e:
            print(f"[DB ERROR] Error saving daily_stats to DB: {e}")
        finally:
            conn.close()

def load_stats_history():
    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT user_id, child_name, date::text, correct, total, errors, stars, timestamp FROM stats_history ORDER BY timestamp ASC;")
                    rows = cur.fetchall()
                    res = []
                    for row in rows:
                        res.append({
                            "child_id": str(row['user_id']),
                            "child_name": row['child_name'] or 'Ребёнок',
                            "date": row['date'],
                            "correct": row['correct'] or 0,
                            "total": row['total'] or 0,
                            "errors": row['errors'] or 0,
                            "stars": row['stars'] or 0,
                            "timestamp": row['timestamp']
                        })
                    return res
        except Exception as e:
            print(f"[DB ERROR] Error loading stats_history from DB: {e}")
        finally:
            conn.close()

    if os.path.exists(STATS_HISTORY_FILE):
        try:
            with open(STATS_HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {STATS_HISTORY_FILE}: {e}")
    return []

def save_stats_history(history):
    try:
        with open(STATS_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving {STATS_HISTORY_FILE}: {e}")

    conn = get_db_connection()
    if conn:
        try:
            with conn:
                with conn.cursor() as cur:
                    for rec in history:
                        if isinstance(rec, dict) and rec.get('child_id'):
                            c_id = int(rec['child_id'])
                            c_name = rec.get('child_name')
                            d_str = rec.get('date')
                            correct = int(rec.get('correct', 0))
                            total = int(rec.get('total', 0))
                            errors = int(rec.get('errors', 0))
                            stars = int(rec.get('stars', 0))
                            ts = int(rec.get('timestamp') or time.time())
                            cur.execute("INSERT INTO users (user_id, first_name) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, users.first_name);", (c_id, c_name))
                            cur.execute("""
                                INSERT INTO stats_history (user_id, child_name, date, correct, total, errors, stars, timestamp)
                                SELECT %s, %s, %s, %s, %s, %s, %s, %s
                                WHERE NOT EXISTS (
                                    SELECT 1 FROM stats_history WHERE user_id = %s AND timestamp = %s
                                );
                            """, (c_id, c_name, d_str, correct, total, errors, stars, ts, c_id, ts))
        except Exception as e:
            print(f"[DB ERROR] Error saving stats_history to DB: {e}")
        finally:
            conn.close()


def get_main_reply_keyboard():
    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
    btn_app = types.KeyboardButton("🚀 Открыть тренажёр", web_app=types.WebAppInfo(url=WEBAPP_URL))
    btn_link = types.KeyboardButton("📱 Ссылка для ребёнка")
    btn_stats = types.KeyboardButton("📊 Статистика")
    keyboard.add(btn_app, btn_link)
    keyboard.add(btn_stats)
    return keyboard

def setup_bot_commands():
    try:
        commands = [
            types.BotCommand("start", "🚀 Запустить тренажёр"),
            types.BotCommand("link", "📱 Ссылка для ребёнка"),
            types.BotCommand("stats", "📊 Статистика ребёнка"),
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
            now = datetime.datetime.now(msk_tz)
            today_str = now.strftime('%Y-%m-%d')
            timestamp = int(data.get('timestamp') or time.time())

            correct = int(data.get('correct', 0))
            total = int(data.get('total', 0))
            errors = int(data.get('errors', 0))
            stars = int(data.get('stars', 0))

            # 1. Сохранение истории сессии в stats_history.json
            history = load_stats_history()
            history.append({
                "child_id": str(child_id),
                "child_name": child_name,
                "date": today_str,
                "correct": correct,
                "total": total,
                "errors": errors,
                "stars": stars,
                "timestamp": timestamp
            })
            save_stats_history(history)

            # 2. Обновление ежедневных итогов в daily_stats.json
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
            c_stats['total_solved'] += total
            c_stats['correct_solved'] += correct
            c_stats['errors'] += errors
            c_stats['total_stars'] += stars

            save_daily_stats(stats)
    except Exception as e:
        print(f"Error handling web_app_data: {e}")

@bot.message_handler(commands=['stats'])
@bot.message_handler(func=lambda msg: msg.text and 'Статистика' in msg.text)
def send_stats_command(message):
    try:
        user_id = message.from_user.id
        links = load_parent_links()

        # Поиск всех детей, привязанных к родительскому аккаунту
        linked_children = []
        for child_id_str, p_id in links.items():
            if p_id and (str(p_id) == str(user_id)):
                linked_children.append(child_id_str)

        if not linked_children:
            bot.send_message(
                message.chat.id,
                "У вас пока нет привязанных устройств. Отправьте ребёнку ссылку по кнопке \"📱 Ссылка для ребёнка\".",
                reply_markup=get_main_reply_keyboard()
            )
            return

        history = load_stats_history()
        msk_tz = datetime.timezone(datetime.timedelta(hours=3))
        now_dt = datetime.datetime.now(msk_tz)
        today_dt = now_dt.date()

        for child_id in linked_children:
            child_records = [r for r in history if str(r.get('child_id')) == str(child_id)]

            child_name = "Ребёнок"
            if child_records and child_records[-1].get('child_name'):
                child_name = child_records[-1]['child_name']

            today_str = today_dt.strftime('%Y-%m-%d')
            d7_cutoff = today_dt - datetime.timedelta(days=6)
            d30_cutoff = today_dt - datetime.timedelta(days=29)

            def calc_period_stats(records_list, filter_func):
                filtered = [r for r in records_list if filter_func(r)]
                sessions = len(filtered)
                total = sum(int(r.get('total', 0)) for r in filtered)
                correct = sum(int(r.get('correct', 0)) for r in filtered)
                stars = sum(int(r.get('stars', 0)) for r in filtered)
                accuracy = round((correct / total) * 100) if total > 0 else 0
                return {
                    'sessions': sessions,
                    'total': total,
                    'correct': correct,
                    'stars': stars,
                    'accuracy': accuracy
                }

            def is_today(rec):
                return rec.get('date') == today_str

            def is_7days(rec):
                try:
                    rec_date = datetime.datetime.strptime(rec.get('date'), '%Y-%m-%d').date()
                    return rec_date >= d7_cutoff
                except Exception:
                    return False

            def is_30days(rec):
                try:
                    rec_date = datetime.datetime.strptime(rec.get('date'), '%Y-%m-%d').date()
                    return rec_date >= d30_cutoff
                except Exception:
                    return False

            st_today = calc_period_stats(child_records, is_today)
            st_7 = calc_period_stats(child_records, is_7days)
            st_30 = calc_period_stats(child_records, is_30days)

            msg_text = (
                f"📊 Статистика успехов ({child_name}):\n\n"
                f"📅 Сегодня:\n"
                f"• Сессий: {st_today['sessions']}\n"
                f"• Решено примеров: {st_today['total']}\n"
                f"• Точность: {st_today['accuracy']}% ⭐\n"
                f"• Звёзд: +{st_today['stars']} 💰\n\n"
                f"📈 За последние 7 дней:\n"
                f"• Сессий: {st_7['sessions']}\n"
                f"• Решено примеров: {st_7['total']}\n"
                f"• Точность: {st_7['accuracy']}% ⭐\n"
                f"• Звёзд: +{st_7['stars']} 💰\n\n"
                f"🏆 За последние 30 дней:\n"
                f"• Сессий: {st_30['sessions']}\n"
                f"• Решено примеров: {st_30['total']}\n"
                f"• Точность: {st_30['accuracy']}% ⭐\n"
                f"• Звёзд: +{st_30['stars']} 💰"
            )

            bot.send_message(message.chat.id, msg_text, reply_markup=get_main_reply_keyboard())
    except Exception as e:
        print(f"Error handling /stats command: {e}")

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

@bot.message_handler(commands=['admin'])
def admin_command(message):
    if message.from_user.id not in ADMIN_IDS:
        return
    try:
        parent_links = load_parent_links()
        daily_stats = load_daily_stats()
        stats_history = load_stats_history()
        subs_list = get_subscription_list()

        msk_tz = datetime.timezone(datetime.timedelta(hours=3))
        now_dt = datetime.datetime.now(msk_tz)
        today_dt = now_dt.date()
        today_str = today_dt.strftime('%Y-%m-%d')
        month_str = today_str[:7]

        # 1. Пользователи
        user_ids = set()
        for child_id_str, parent_id in parent_links.items():
            if child_id_str:
                user_ids.add(str(child_id_str))
            if parent_id:
                user_ids.add(str(parent_id))

        for day_data in daily_stats.values():
            if isinstance(day_data, dict):
                for child_key, c_info in day_data.items():
                    user_ids.add(str(child_key))
                    p_id = c_info.get('parent_id')
                    if p_id:
                        user_ids.add(str(p_id))

        for rec in stats_history:
            c_id = rec.get('child_id')
            if c_id:
                user_ids.add(str(c_id))

        for sub in subs_list:
            u_id = sub.get('user_id')
            if u_id:
                user_ids.add(str(u_id))

        total_users = len(user_ids)
        parent_child_pairs = sum(1 for c_id, p_id in parent_links.items() if p_id)

        # 2. Монетизация
        paying_user_ids = set()
        revenue_today = 0
        revenue_month = 0
        revenue_all = 0

        for sub in subs_list:
            u_id = sub.get('user_id')
            history = sub.get('history', [])
            status = sub.get('status', '')
            amount = sub.get('amount', 0)

            if status == 'active' or (isinstance(history, list) and len(history) > 0) or amount > 0:
                if u_id:
                    paying_user_ids.add(str(u_id))

            if history and isinstance(history, list):
                for item in history:
                    if isinstance(item, dict):
                        amt = int(item.get('amount', 0))
                        p_date = str(item.get('date', ''))
                        revenue_all += amt
                        if p_date == today_str:
                            revenue_today += amt
                        if p_date.startswith(month_str):
                            revenue_month += amt
            else:
                amt = int(amount)
                start_date = str(sub.get('start_date', ''))
                if amt > 0:
                    revenue_all += amt
                    if start_date == today_str:
                        revenue_today += amt
                    if start_date.startswith(month_str):
                        revenue_month += amt

        paying_count = len(paying_user_ids)
        conversion_rate = round((paying_count / total_users) * 100, 1) if total_users > 0 else 0.0

        # 3. Сроки подписок
        active_subs = 0
        expiring_subs = 0
        expired_subs = 0

        for sub in subs_list:
            exp_str = sub.get('expire_date')
            if not exp_str:
                continue
            try:
                exp_date = datetime.datetime.strptime(exp_str, '%Y-%m-%d').date()
                days_left = (exp_date - today_dt).days
                if exp_date >= today_dt:
                    active_subs += 1
                    if 0 <= days_left <= 3:
                        expiring_subs += 1
                else:
                    expired_subs += 1
            except Exception:
                pass

        # 4. Активность за сегодня
        today_data = daily_stats.get(today_str, {})
        dau_today = len(today_data)
        sessions_today = sum(int(c.get('sessions_count', 0)) for c in today_data.values())
        quota_met_today = sum(1 for c in today_data.values() if int(c.get('sessions_count', 0)) >= 2)
        solved_today = sum(int(c.get('total_solved', 0)) for c in today_data.values())

        # 5. За все время
        solved_all_time = sum(int(r.get('total', 0)) for r in stats_history)
        correct_all_time = sum(int(r.get('correct', 0)) for r in stats_history)
        avg_accuracy = round((correct_all_time / solved_all_time) * 100, 1) if solved_all_time > 0 else 0.0

        msg_text = (
            f"📊 Секретная бизнес-аналитика владельца (/admin)\n\n"
            f"👥 Пользователи:\n"
            f"• Всего пользователей в системе: {total_users}\n"
            f"• Пар «родитель-ребёнок»: {parent_child_pairs}\n\n"
            f"💰 Монетизация:\n"
            f"• Число платящих: {paying_count}\n"
            f"• Конверсия в оплату: {conversion_rate}%\n"
            f"• Сумма оплат за сегодня: {revenue_today} ₽\n"
            f"• Сумма оплат за текущий месяц: {revenue_month} ₽\n"
            f"• Сумма оплат за всё время: {revenue_all} ₽\n\n"
            f"⏳ Сроки подписок:\n"
            f"• Активные: {active_subs}\n"
            f"• Истекающие (1–3 дня): {expiring_subs}\n"
            f"• Истёкшие: {expired_subs}\n\n"
            f"⚡️ Активность за сегодня ({today_str}):\n"
            f"• Уникальные ученики (DAU): {dau_today}\n"
            f"• Число сессий: {sessions_today}\n"
            f"• Выполнили норму (≥2 сессий): {quota_met_today}\n"
            f"• Решено примеров: {solved_today}\n\n"
            f"🏆 За всё время:\n"
            f"• Всего решено задач: {solved_all_time}\n"
            f"• Средний % точности по всей базе: {avg_accuracy}%"
        )

        bot.send_message(message.chat.id, msg_text)
    except Exception as e:
        print(f"Error handling /admin command: {e}")

if __name__ == '__main__':
    setup_bot_commands()
    if init_db():
        migrate_json_to_db()
    threading.Thread(target=run_server, daemon=True).start()
    threading.Thread(target=daily_digest_scheduler, daemon=True).start()
    bot.infinity_polling(skip_pending=True)

