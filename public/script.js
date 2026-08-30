    <script>
        (async function() {
        // Инициализация игры
        let currentRuleType = 'over_ten'; // По умолчанию переход через десяток
        let coins = localStorage.getItem('coins') !== null ? parseInt(localStorage.getItem('coins'), 10) : 15;
        let streak = localStorage.getItem('streak') !== null ? parseInt(localStorage.getItem('streak'), 10) : 3;
        let currentProblem = null;
        let currentInput = "";
        let isInputLocked = false;

        // --- ДНЕВНАЯ ЦЕЛЬ ---
        const DAILY_GOAL = 10;
        const todayKey = 'dailyGoal_' + new Date().toISOString().slice(0, 10);
        let dailySolved = localStorage.getItem(todayKey) !== null ? parseInt(localStorage.getItem(todayKey), 10) : 0;
        let dailyGoalCompleted = dailySolved >= DAILY_GOAL;

        // Получение DOM элементов
        const questionText = document.getElementById('question-text');
        const answerDisplay = document.getElementById('answer-display');
        const gameCard = document.getElementById('game-card');
        const questionContainer = document.getElementById('question-container');
        const equalsSign = document.getElementById('equals-sign');
        const unitDisplay = document.getElementById('unit-display');

        const badgeCoinsList = document.querySelectorAll('.coins-badge');
        const badgeStreakList = document.querySelectorAll('.streak-badge');
        const badgeGoalList = document.querySelectorAll('.daily-goal-badge');
        const btnBackToHub = document.getElementById('btn-back-to-hub');

        // --- СИСТЕМА ПЕРСОНАЖЕЙ (6 героев для сетки 2x3) ---
        const CHARACTERS = [
            { id: 'robik', emoji: '🤖', name: 'Робик', unlockAt: 0, description: 'Твой первый друг!' },
            { id: 'capybara', emoji: '🦫', name: 'Капибара', unlockAt: 20, description: 'Спокойный и мудрый' },
            { id: 'cat', emoji: '🐱', name: 'Квадратный Кот', unlockAt: 50, description: 'Загадочный мастер' },
            { id: 'fox', emoji: '🦊', name: 'Кибер-Лис', unlockAt: 100, description: 'Хитрый и быстрый' },
            { id: 'axolotl', emoji: '🦎', name: 'Аксолотль Лотти', unlockAt: 175, description: 'Милый водный супергерой!' },
            { id: 'dragon', emoji: '🐉', name: 'Золотой Дракон', unlockAt: 300, description: 'Легендарный повелитель математики!' }
        ];
        let totalSolved = parseInt(localStorage.getItem('totalSolved') || '0', 10);
        let activeCharId = localStorage.getItem('activeCharacter') || 'robik';

        // --- ГАРДЕРОб & RPG ИНВЕНТАРЬ (4 ТЕМАТИЧЕСКИЕ КАТЕГОРИИ) ---
        const WARDROBE_CATEGORIES = [
            {
                id: 'hats',
                title: 'ГОЛОВНЫЕ УБОРЫ',
                icon: '🎩',
                items: [
                    { id: 'cap', emoji: '🧢', name: 'Кепка геймера', price: 30 },
                    { id: 'sheriff', emoji: '🤠', name: 'Шляпа шерифа', price: 70 },
                    { id: 'crown', emoji: '👑', name: 'Корона мастера', price: 100 },
                    { id: 'wizard', emoji: '🧙‍♂️', name: 'Колпак мага', price: 150 }
                ]
            },
            {
                id: 'masks',
                title: 'ОЧКИ И МАСКИ',
                icon: '🕶',
                items: [
                    { id: 'glasses', emoji: '🕶', name: 'Очки крутости', price: 50 },
                    { id: 'snorkel', emoji: '🤿', name: 'Маска ныряльщика', price: 60 },
                    { id: 'visor', emoji: '🥽', name: 'Кибер-визор', price: 90 },
                    { id: 'ninja_mask', emoji: '🥷', name: 'Маска ниндзя', price: 110 }
                ]
            },
            {
                id: 'gadgets',
                title: 'ГАДЖЕТЫ И СПУТНИКИ',
                icon: '🎧',
                items: [
                    { id: 'headphones', emoji: '🎧', name: 'RGB-наушники', price: 120 },
                    { id: 'gamepad', emoji: '🎮', name: 'Золотой джойстик', price: 140 },
                    { id: 'aura', emoji: '⚡', name: 'Электро-аура', price: 180 },
                    { id: 'jetpack', emoji: '🚀', name: 'Мини-джетпак', price: 200 }
                ]
            },
            {
                id: 'artifacts',
                title: 'АРТЕФАКТЫ ЗНАНИЙ',
                icon: '📜',
                items: [
                    { id: 'scroll', emoji: '📜', name: 'Свиток мудрости', price: 80 },
                    { id: 'crystal', emoji: '💎', name: 'Кристалл ума', price: 250 },
                    { id: 'trophy', emoji: '🏆', name: 'Кубок чемпиона', price: 300 }
                ]
            }
        ];

        const ALL_ACCESSORIES = WARDROBE_CATEGORIES.flatMap(cat => cat.items);

        let wardrobeData = JSON.parse(localStorage.getItem('sokrat_wardrobe') || '{"owned":[],"equipped":null}');

        function getEquippedAccessory() {
            if (!wardrobeData.equipped) return null;
            return ALL_ACCESSORIES.find(a => a.id === wardrobeData.equipped) || null;
        }

        // --- ПРОГРЕСС ПО ТЕМАМ И ЗВЁЗДЫ МАСТЕРСТВА ---
        let topicProgress = JSON.parse(localStorage.getItem('sokrat_topic_progress') || '{}');

        function getTopicCount(type) {
            const aliases = {
                'target_10': ['target_10', 'composition10'],
                'over_ten': ['over_ten', 'with_carry'],
                'sub_ten': ['sub_ten', 'subtraction'],
                'tens': ['tens'],
                'word_problems': ['word_problems'],
                'quantities': ['quantities']
            };
            const keys = aliases[type] || [type];
            for (const k of keys) {
                if (topicProgress[k] !== undefined && topicProgress[k] !== null) return topicProgress[k];
            }
            return 0;
        }

        function getTopicStars(count) {
            if (count >= 75) return 5;
            if (count >= 50) return 4;
            if (count >= 30) return 3;
            if (count >= 15) return 2;
            if (count >= 5) return 1;
            return 0;
        }

        function updateTopicStars() {
            const topicsMap = {
                'target_10': 'btn-target-10',
                'over_ten': 'btn-over-ten',
                'sub_ten': 'btn-sub-ten',
                'tens': 'btn-tens',
                'word_problems': 'btn-word-problems',
                'quantities': 'btn-quantities'
            };

            Object.keys(topicsMap).forEach(type => {
                const btn = document.getElementById(topicsMap[type]);
                if (!btn) return;
                let starsContainer = btn.querySelector('.topic-stars');
                if (!starsContainer) {
                    starsContainer = document.createElement('div');
                    starsContainer.className = 'topic-stars flex items-center justify-center gap-0.5 text-[13px]';
                    btn.appendChild(starsContainer);
                }
                const count = getTopicCount(type);
                const starsCount = getTopicStars(count);
                starsContainer.innerHTML = '';
                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span');
                    star.className = i <= starsCount
                        ? 'text-amber-400 drop-shadow-[0_1px_3px_rgba(245,158,11,0.6)] font-bold text-[13px]'
                        : 'text-slate-300/60 text-[13px]';
                    star.textContent = '★';
                    starsContainer.appendChild(star);
                }
            });
        }

        const charEmojiDisplay = document.getElementById('char-emoji-display');
        const robikZone = document.getElementById('robik-zone');
        const petAvatarBtns = document.querySelectorAll('.pet-avatar-btn');
        const collectionGrid = document.getElementById('collection-grid');
        const totalSolvedDisplay = document.getElementById('total-solved-display');
        const unlockModal = document.getElementById('unlock-modal');
        const unlockModalEmoji = document.getElementById('unlock-modal-emoji');
        const unlockModalName = document.getElementById('unlock-modal-name');
        const unlockModalBtn = document.getElementById('unlock-modal-btn');

        function getActiveChar() {
            return CHARACTERS.find(c => c.id === activeCharId) || CHARACTERS[0];
        }

        function isUnlocked(char) {
            return totalSolved >= char.unlockAt;
        }

        // Обновить аватар в шапках и в игровой карточке
        function updateCharacterDisplay() {
            const ch = getActiveChar();
            const acc = getEquippedAccessory();

            // Аватары в шапках
            petAvatarBtns.forEach(btn => {
                btn.style.position = 'relative';
                btn.textContent = ch.emoji;
                let badge = btn.querySelector('.pet-accessory-badge');
                if (acc) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'pet-accessory-badge absolute -top-1 -right-1 text-[11px] bg-slate-900/80 rounded-full w-4.5 h-4.5 flex items-center justify-center border border-amber-300 shadow-sm z-10';
                        btn.appendChild(badge);
                    }
                    badge.textContent = acc.emoji;
                    badge.style.display = 'flex';
                } else if (badge) {
                    badge.style.display = 'none';
                }
            });

            // Игровая карточка
            if (ch.id === 'robik') {
                robikZone.style.display = '';
                charEmojiDisplay.style.display = 'none';
                charEmojiDisplay.textContent = '';
            } else {
                robikZone.style.display = 'none';
                charEmojiDisplay.style.display = 'block';
                charEmojiDisplay.textContent = ch.emoji;
            }

            // Надетый аксессуар на игровой карточке
            const gameAccessoryBadge = document.getElementById('game-accessory-badge');
            if (gameAccessoryBadge) {
                if (acc) {
                    gameAccessoryBadge.textContent = acc.emoji;
                    gameAccessoryBadge.classList.remove('hidden');
                    gameAccessoryBadge.style.display = 'block';
                } else {
                    gameAccessoryBadge.classList.add('hidden');
                    gameAccessoryBadge.style.display = 'none';
                }
            }

            // Имя и статус персонажа под аватаром
            const gameCharName = document.getElementById('game-char-name');
            const gameCharStatus = document.getElementById('game-char-status');
            if (gameCharName) gameCharName.textContent = ch.name;
            if (gameCharStatus) gameCharStatus.textContent = ch.description || 'Уровень 1 • Исследователь';
        }

        // Сбросить glow у эмодзи персонажа
        function setCharEmojiState(state) {
            charEmojiDisplay.classList.remove('success-glow', 'error-glow');
            if (state === 'success') charEmojiDisplay.classList.add('success-glow');
            if (state === 'error') charEmojiDisplay.classList.add('error-glow');
        }

        // Показать модалку разблокировки
        function showUnlockModal(char) {
            unlockModalEmoji.textContent = char.emoji;
            unlockModalName.textContent = char.name;
            unlockModal.classList.remove('hidden');
            playSound('goal');
            confetti.explode();
            confetti.explode();
        }

        if (unlockModalBtn) {
            unlockModalBtn.addEventListener('click', () => {
                haptic('light');
                if (unlockModal) unlockModal.classList.add('hidden');
            });
        }

        // Проверить новые разблокировки
        function checkUnlocks() {
            for (const ch of CHARACTERS) {
                if (ch.unlockAt === 0) continue; // Робик всегда открыт
                const prevSolved = totalSolved - 1;
                if (prevSolved < ch.unlockAt && totalSolved >= ch.unlockAt) {
                    // Только что разблокировался
                    setTimeout(() => showUnlockModal(ch), 1200);
                }
            }
        }

        // Рендер гардероба (4 категории RPG инвентаря)
        function renderWardrobe() {
            const container = document.getElementById('wardrobe-categories-container');
            if (!container) return;
            container.innerHTML = '';

            WARDROBE_CATEGORIES.forEach(cat => {
                const catCard = document.createElement('div');
                catCard.className = 'category-card';

                // Заголовок-пилюля
                const pill = document.createElement('div');
                pill.className = 'category-pill-badge';
                pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.title}</span>`;
                catCard.appendChild(pill);

                // Сетка ячеек (4 колонки)
                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-4 gap-2.5 sm:gap-3 items-start justify-items-center mt-1';

                cat.items.forEach(item => {
                    const isOwned = wardrobeData.owned.includes(item.id);
                    const isEquipped = wardrobeData.equipped === item.id;
                    const canAfford = coins >= item.price;

                    const cell = document.createElement('div');
                    cell.className = 'inventory-item-cell';

                    // Круглая иконка
                    const circle = document.createElement('div');
                    circle.className = 'item-circle ' +
                        (isEquipped ? 'circle-equipped' :
                            isOwned ? 'circle-owned' :
                                canAfford ? 'circle-affordable' : 'circle-locked');

                    const emojiSpan = document.createElement('span');
                    emojiSpan.textContent = item.emoji;
                    circle.appendChild(emojiSpan);

                    // Бейдж цены / галочки
                    const badge = document.createElement('span');
                    if (isEquipped) {
                        badge.className = 'item-badge badge-equipped';
                        badge.textContent = '✓';
                    } else if (isOwned) {
                        badge.className = 'item-badge badge-owned';
                        badge.textContent = '✓';
                    } else if (canAfford) {
                        badge.className = 'item-badge badge-affordable';
                        badge.textContent = `${item.price}🪙`;
                    } else {
                        badge.className = 'item-badge badge-locked';
                        badge.textContent = `${item.price}🪙`;
                    }
                    circle.appendChild(badge);
                    cell.appendChild(circle);

                    // 2-строчная подпись
                    const nameLabel = document.createElement('span');
                    nameLabel.className = 'text-[11px] font-extrabold text-[#2e0b65] text-center leading-tight max-w-[72px]';
                    nameLabel.textContent = item.name;
                    cell.appendChild(nameLabel);

                    // Обработчик клика (покупка / надевание / снятие)
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (isEquipped) {
                            // Снять
                            playSound('click');
                            haptic('light');
                            wardrobeData.equipped = null;
                            localStorage.setItem('sokrat_wardrobe', JSON.stringify(wardrobeData));
                            updateCharacterDisplay();
                            renderCollection();
                        } else if (isOwned) {
                            // Надеть
                            playSound('click');
                            haptic('light');
                            wardrobeData.equipped = item.id;
                            localStorage.setItem('sokrat_wardrobe', JSON.stringify(wardrobeData));
                            updateCharacterDisplay();
                            renderCollection();
                        } else if (canAfford) {
                            // Купить и надеть
                            playSound('goal');
                            haptic('success');
                            coins -= item.price;
                            localStorage.setItem('coins', coins);
                            wardrobeData.owned.push(item.id);
                            wardrobeData.equipped = item.id;
                            localStorage.setItem('sokrat_wardrobe', JSON.stringify(wardrobeData));

                            updateCoinsAndStreak();
                            updateCharacterDisplay();
                            renderCollection();
                        } else {
                            // Не хватает монет
                            playSound('error');
                            haptic('error');
                        }
                    });

                    grid.appendChild(cell);
                });

                catCard.appendChild(grid);
                container.appendChild(catCard);
            });
        }

        // Рендер коллекции
        function renderCollection() {
            if (totalSolvedDisplay) totalSolvedDisplay.textContent = totalSolved;
            if (!collectionGrid) return;
            collectionGrid.innerHTML = '';
            const equippedAcc = getEquippedAccessory();

            CHARACTERS.forEach(ch => {
                const unlocked = isUnlocked(ch);
                const isActive = ch.id === activeCharId;
                const card = document.createElement('div');
                card.className = 'char-card' + (isActive ? ' active-char' : '') + (!unlocked ? ' locked-char' : '');

                if (isActive) {
                    const badge = document.createElement('span');
                    badge.className = 'active-badge';
                    badge.textContent = 'Активен';
                    card.appendChild(badge);

                    if (equippedAcc) {
                        const accBadge = document.createElement('span');
                        accBadge.className = 'absolute top-2 left-2 text-xs bg-amber-400/20 border border-amber-400/40 rounded-full w-6 h-6 flex items-center justify-center shadow-sm';
                        accBadge.textContent = equippedAcc.emoji;
                        accBadge.title = `Надето: ${equippedAcc.name}`;
                        card.appendChild(accBadge);
                    }
                }

                const emojiEl = document.createElement('div');
                emojiEl.className = 'char-emoji';
                emojiEl.textContent = ch.emoji;
                card.appendChild(emojiEl);

                const nameEl = document.createElement('div');
                nameEl.className = 'char-name';
                nameEl.textContent = ch.name;
                card.appendChild(nameEl);

                const descEl = document.createElement('div');
                descEl.style.cssText = 'font-size:0.65rem;color:#94a3b8;font-weight:600;text-align:center;';
                descEl.textContent = unlocked ? ch.description : `Реши ещё ${ch.unlockAt - totalSolved} примеров`;
                card.appendChild(descEl);

                if (unlocked) {
                    // Шкала прогресса не нужна — показываем кнопку выбора
                    const btn = document.createElement('button');
                    btn.className = 'char-select-btn ' + (isActive ? 'btn-selected' : 'btn-select');
                    btn.textContent = isActive ? '✓ Выбран' : 'Выбрать';
                    if (!isActive) {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            haptic('light');
                            playSound('click');
                            activeCharId = ch.id;
                            localStorage.setItem('activeCharacter', activeCharId);
                            updateCharacterDisplay();
                            renderCollection();
                        });
                    }
                    card.appendChild(btn);
                } else {
                    // Шкала прогресса для заблокированного
                    const pct = Math.min((totalSolved / ch.unlockAt) * 100, 100);
                    const wrap = document.createElement('div');
                    wrap.className = 'char-progress-wrap';
                    const bar = document.createElement('div');
                    bar.className = 'char-progress-bar';
                    bar.style.width = pct + '%';
                    wrap.appendChild(bar);
                    card.appendChild(wrap);

                    const label = document.createElement('div');
                    label.className = 'char-progress-label';
                    label.textContent = `${totalSolved} / ${ch.unlockAt}`;
                    card.appendChild(label);
                }

                collectionGrid.appendChild(card);
            });

            renderWardrobe();
        }

        // Единая функция переключения экранов в JS
        function showScreen(screenId) {
            const topicScreen = document.getElementById('screen-topics');
            const gameScreen = document.getElementById('screen-game');
            const collectionScreen = document.getElementById('screen-collection');

            if (topicScreen) {
                topicScreen.style.setProperty('display', 'none', 'important');
                topicScreen.classList.add('hidden');
                topicScreen.classList.remove('active');
            }
            if (gameScreen) {
                gameScreen.style.setProperty('display', 'none', 'important');
                gameScreen.classList.add('hidden');
                gameScreen.classList.remove('active');
            }
            if (collectionScreen) {
                collectionScreen.style.setProperty('display', 'none', 'important');
                collectionScreen.classList.add('hidden');
                collectionScreen.classList.remove('active');
            }

            const cleanId = screenId.replace(/^screen-/, '');
            const target = document.getElementById(`screen-${cleanId}`) || document.getElementById(screenId);

            if (target) {
                target.classList.remove('hidden');
                target.classList.add('active');
                const displayStyle = (target.id === 'screen-collection' || target.id === 'screen-topics') ? 'block' : 'flex';
                target.style.setProperty('display', displayStyle, 'important');
            }

            // Принудительное скрытие элементов игры вне экрана игры
            const keyboard = document.getElementById('keyboard');
            const gameCard = document.getElementById('game-card');
            const isGameActive = target && target.id === 'screen-game';

            if (keyboard) {
                keyboard.style.setProperty('display', isGameActive ? 'flex' : 'none', 'important');
            }
            if (gameCard) {
                gameCard.style.setProperty('display', isGameActive ? 'flex' : 'none', 'important');
            }

            if (cleanId === 'topics') {
                updateTopicStars();
                if (typeof initTopicClicks === 'function') initTopicClicks();
            }

            window.scrollTo(0, 0);
        }

        // Навигация: открыть коллекцию
        function openCollection(fromScreen) {
            playSound('click');
            haptic('light');
            renderCollection();
            showScreen('screen-collection');
            window.scrollTo(0, 0);
            // Запомним откуда пришли
            const backBtn = document.getElementById('btn-back-from-collection');
            if (backBtn) backBtn._fromScreen = fromScreen;
        }

        const btnHubColl = document.getElementById('btn-open-collection-hub');
        if (btnHubColl) btnHubColl.addEventListener('click', () => openCollection('hub'));

        const btnGameColl = document.getElementById('btn-open-collection-game');
        if (btnGameColl) btnGameColl.addEventListener('click', () => openCollection('game'));

        const btnBackColl = document.getElementById('btn-back-from-collection');
        if (btnBackColl) {
            btnBackColl.addEventListener('click', () => {
                playSound('click');
                haptic('light');
                const from = btnBackColl._fromScreen;
                if (from === 'game') {
                    showScreen('screen-game');
                } else {
                    showScreen('screen-topics');
                }
            });
        }

        // --- HAPTIC FEEDBACK ---
        function haptic(type) {
            try {
                const hf = window.Telegram?.WebApp?.HapticFeedback;
                if (!hf) return;
                if (type === 'light') hf.impactOccurred('light');
                else if (type === 'success') hf.notificationOccurred('success');
                else if (type === 'error') hf.notificationOccurred('error');
            } catch (e) { }
        }

        function updateCoinsAndStreak() {
            badgeCoinsList.forEach(el => el.textContent = coins);
            badgeStreakList.forEach(el => {
                if (streak === 0) {
                    el.textContent = `0 дней`;
                } else {
                    el.textContent = `${streak} дня`;
                }
            });
            const solved = Math.min(dailySolved, DAILY_GOAL);
            badgeGoalList.forEach(el => {
                el.textContent = `${solved}/${DAILY_GOAL}`;
            });
        }

        // Заполнение счетчиков из загруженных данных
        updateCoinsAndStreak();
        updateCharacterDisplay();
        updateTopicStars();

        const btnTarget10 = document.getElementById('btn-target-10');
        const btnOverTen = document.getElementById('btn-over-ten');
        const btnSubTen = document.getElementById('btn-sub-ten');
        const btnTens = document.getElementById('btn-tens');
        const btnWordProblems = document.getElementById('btn-word-problems');
        const btnQuantities = document.getElementById('btn-quantities');
        const btnDelete = document.getElementById('btn-delete');
        const btnHint = document.getElementById('btn-hint');
        const btnCheck = document.getElementById('btn-check');

        const batteriesContainer = document.getElementById('batteries-container');
        const battery1Text = document.getElementById('battery-1-text');
        const battery2Text = document.getElementById('battery-2-text');
        const batteryHintFormula = document.getElementById('battery-hint-formula');
        const hintTitle = document.getElementById('hint-title');

        // Попытка динамического импорта MathEngine.
        // Если CORS блокирует импорт при локальном открытии через file://, используем резервный класс
        let engine;
        try {
            const module = await import('../src/engine/MathEngine.js');
            engine = new module.MathEngine();
        } catch (e) {
            console.warn("MathEngine.js could not be loaded via ESM. Using local fallback class.", e);
            class EmbeddedMathEngine {
                getDeclension(number, titles) {
                    const cases = [2, 0, 1, 1, 1, 2];
                    return titles[
                        (number % 100 > 4 && number % 100 < 20)
                            ? 2
                            : cases[Math.min(number % 10, 5)]
                    ];
                }

                generateProblem(type) {
                    if (type === 'target_10') {
                        const firstTerm = Math.floor(Math.random() * 9) + 1;
                        const secondTerm = 10 - firstTerm;
                        return {
                            question: `${firstTerm} + ${secondTerm}`,
                            correctAnswer: 10
                        };
                    } else if (type === 'over_ten') {
                        const firstTerm = Math.floor(Math.random() * 8) + 2;
                        const minSecondTerm = 11 - firstTerm;
                        const maxSecondTerm = 9;
                        const secondTerm = Math.floor(Math.random() * (maxSecondTerm - minSecondTerm + 1)) + minSecondTerm;
                        const correctAnswer = firstTerm + secondTerm;
                        const toTen = 10 - firstTerm;
                        const remain = secondTerm - toTen;
                        return {
                            question: `${firstTerm} + ${secondTerm}`,
                            correctAnswer,
                            splitHelp: { toTen, remain }
                        };
                    } else if (type === 'sub_ten') {
                        const a = Math.floor(Math.random() * (18 - 11 + 1)) + 11;
                        const minB = a - 9;
                        const startB = Math.max(2, minB);
                        const maxB = 9;
                        const b = Math.floor(Math.random() * (maxB - startB + 1)) + startB;
                        const correctAnswer = a - b;
                        const toTen = a - 10;
                        const remain = b - toTen;
                        return {
                            question: `${a} - ${b}`,
                            correctAnswer,
                            splitHelp: { toTen, remain }
                        };
                    } else if (type === 'tens') {
                        const isAdd = Math.random() < 0.5;
                        if (isAdd) {
                            const aTens = Math.floor(Math.random() * 9) + 1;
                            const bTens = Math.floor(Math.random() * (10 - aTens)) + 1;
                            const a = aTens * 10;
                            const b = bTens * 10;
                            const correctAnswer = a + b;
                            return {
                                question: `${a} + ${b}`,
                                correctAnswer
                            };
                        } else {
                            const aTens = Math.floor(Math.random() * 9) + 1;
                            const startATens = Math.max(2, aTens);
                            const a = startATens * 10;
                            const bTens = Math.floor(Math.random() * (startATens - 1)) + 1;
                            const b = bTens * 10;
                            const correctAnswer = a - b;
                            return {
                                question: `${a} - ${b}`,
                                correctAnswer
                            };
                        }
                    } else if (type === 'word_problems') {
                        const isAdd = Math.random() < 0.5;
                        if (isAdd) {
                            const a = Math.floor(Math.random() * 15) + 1;
                            const b = Math.floor(Math.random() * (20 - a)) + 1;
                            const correctAnswer = a + b;
                            const templates = [
                                `У Робика было ${a} ${this.getDeclension(a, ['яблоко', 'яблока', 'яблок'])}. Он нашел еще ${b} ${this.getDeclension(b, ['яблоко', 'яблока', 'яблок'])}. Сколько всего яблок стало?`,
                                `В коробке ${this.getDeclension(a, ['лежал', 'лежало', 'лежало'])} ${a} ${this.getDeclension(a, ['синий', 'синих', 'синих'])} ${this.getDeclension(a, ['карандаш', 'карандаша', 'карандашей'])} и ${b} ${this.getDeclension(b, ['красный', 'красных', 'красных'])} ${this.getDeclension(b, ['карандаш', 'карандаша', 'карандашей'])}. Сколько всего карандашей стало?`,
                                `На ветке ${this.getDeclension(a, ['сидела', 'сидело', 'сидело'])} ${a} ${this.getDeclension(a, ['птичка', 'птички', 'птичек'])}. ${this.getDeclension(b, ['Прилетела', 'Прилетело', 'Прилетело'])} еще ${b} ${this.getDeclension(b, ['птичка', 'птички', 'птичек'])}. Сколько птичек стало?`
                            ];
                            const text = templates[Math.floor(Math.random() * templates.length)];
                            return {
                                question: text,
                                correctAnswer,
                                formula: `${a} + ${b} = ${correctAnswer}`,
                                type: 'word_add'
                            };
                        } else {
                            const a = Math.floor(Math.random() * 19) + 2;
                            const b = Math.floor(Math.random() * (a - 1)) + 1;
                            const correctAnswer = a - b;
                            const templates = [
                                `${this.getDeclension(a, ['Была', 'Было', 'Было'])} ${a} ${this.getDeclension(a, ['конфета', 'конфеты', 'конфет'])}. Робик съел ${b} ${this.getDeclension(b, ['конфету', 'конфеты', 'конфет'])}. Сколько конфет осталось?`,
                                `${this.getDeclension(a, ['На полке стояла', 'На полке стояло', 'На полке стояло'])} ${a} ${this.getDeclension(a, ['книга', 'книги', 'книг'])}. Робик взял ${b} ${this.getDeclension(b, ['книгу', 'книги', 'книг'])}. Сколько книг осталось?`,
                                `У Робика ${this.getDeclension(a, ['был', 'было', 'было'])} ${a} ${this.getDeclension(a, ['шарик', 'шарика', 'шариков'])}. ${b} ${this.getDeclension(b, ['шарик улетел', 'шарика улетело', 'шариков улетело'])}. Сколько шариков осталось?`
                            ];
                            const text = templates[Math.floor(Math.random() * templates.length)];
                            return {
                                question: text,
                                correctAnswer,
                                formula: `${a} - ${b} = ${correctAnswer}`,
                                type: 'word_sub'
                            };
                        }
                    } else if (type === 'quantities') {
                        const option = Math.floor(Math.random() * 4);
                        if (option === 0) {
                            const dm = Math.floor(Math.random() * 2) + 1;
                            const correctAnswer = dm * 10;
                            return {
                                question: `${dm} дм`,
                                unit: 'см',
                                correctAnswer,
                                type: 'to_cm_simple',
                                dm
                            };
                        } else if (option === 1) {
                            const x = Math.floor(Math.random() * 9) + 1;
                            const correctAnswer = 10 + x;
                            return {
                                question: `1 дм ${x} см`,
                                unit: 'см',
                                correctAnswer,
                                type: 'to_cm_mixed',
                                x
                            };
                        } else if (option === 2) {
                            const dm = Math.floor(Math.random() * 2) + 1;
                            const cm = dm * 10;
                            return {
                                question: `${cm} см`,
                                unit: 'дм',
                                correctAnswer: dm,
                                type: 'to_dm',
                                cm
                            };
                        } else {
                            const isAdd = Math.random() < 0.5;
                            const b = Math.floor(Math.random() * 8) + 1;
                            if (isAdd) {
                                return { a: 10, b: b, operator: '+', question: `1 дм + ${b} см = ? см`, correctAnswer: 10 + b, unit: 'см', firstUnit: 'дм', secondUnit: 'см' };
                            } else {
                                return { a: 10, b: b, operator: '-', question: `1 дм - ${b} см = ? см`, correctAnswer: 10 - b, unit: 'см', firstUnit: 'дм', secondUnit: 'см' };
                            }
                        }
                    }
                }
            }
            engine = new EmbeddedMathEngine();
        }

        // --- ЗВУКОВОЙ СИНТЕЗАТОР (Web Audio API) ---
        let audioCtx = null;
        let isSoundMuted = localStorage.getItem('isSoundMuted') === 'true';

        function initAudio() {
            try {
                if (!audioCtx) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    if (AudioContextClass) {
                        audioCtx = new AudioContextClass();
                    }
                }
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
            } catch (e) {
                console.warn('AudioContext initialization deferred:', e);
            }
        }

        function unlockAudio() {
            initAudio();
            if (audioCtx) {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
                try {
                    const buffer = audioCtx.createBuffer(1, 1, 22050);
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);
                    source.start(0);
                } catch (e) {}
            }
            ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach(evt => {
                document.removeEventListener(evt, unlockAudio, true);
                window.removeEventListener(evt, unlockAudio, true);
            });
        }
        ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach(evt => {
            document.addEventListener(evt, unlockAudio, { once: true, capture: true });
            window.addEventListener(evt, unlockAudio, { once: true, capture: true });
        });

        function playSound(soundName) {
            isSoundMuted = localStorage.getItem('isSoundMuted') === 'true';
            if (isSoundMuted || !soundName) return;

            initAudio();
            if (!audioCtx) return;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }

            const type = String(soundName).toLowerCase().replace(/\.(mp3|wav|ogg|m4a)$/i, '');
            const now = audioCtx.currentTime;

            try {
                if (type === 'click' || type === 'tap' || type === 'button') {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    osc.start(now); osc.stop(now + 0.04);

                } else if (type === 'correct' || type === 'right' || type === 'success') {
                    const chordNotes = [
                        { freq: 523.25, delay: 0, duration: 0.25 },
                        { freq: 659.25, delay: 0.06, duration: 0.28 },
                        { freq: 783.99, delay: 0.12, duration: 0.32 },
                        { freq: 1046.50, delay: 0.18, duration: 0.40 }
                    ];
                    chordNotes.forEach(note => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain); gain.connect(audioCtx.destination);
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(note.freq, now + note.delay);
                        gain.gain.setValueAtTime(0, now + note.delay);
                        gain.gain.linearRampToValueAtTime(0.14, now + note.delay + 0.015);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + note.duration);
                        osc.start(now + note.delay); osc.stop(now + note.delay + note.duration);
                    });

                } else if (type === 'error' || type === 'incorrect' || type === 'wrong') {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
                    gain.gain.setValueAtTime(0.16, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    osc.start(now); osc.stop(now + 0.22);

                } else if (type === 'victory' || type === 'triumph' || type === 'goal') {
                    const fanfare = [
                        { freq: 523.25, delay: 0, duration: 0.2 },
                        { freq: 659.25, delay: 0.08, duration: 0.22 },
                        { freq: 783.99, delay: 0.16, duration: 0.25 },
                        { freq: 1046.50, delay: 0.26, duration: 0.45 }
                    ];
                    fanfare.forEach(n => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain); gain.connect(audioCtx.destination);
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(n.freq, now + n.delay);
                        gain.gain.setValueAtTime(0, now + n.delay);
                        gain.gain.linearRampToValueAtTime(0.16, now + n.delay + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.duration);
                        osc.start(now + n.delay); osc.stop(now + n.delay + n.duration);
                    });
                }
            } catch (e) {
                console.warn('Audio playback error:', e);
            }
        }

        // --- ДИНАМИЧЕСКИЕ ОБЛАЧКИ РЕЧИ (Speech Bubbles) ---
        const HAPPY_PHRASES = ['СУПЕР! 🔥', 'ГЕНИЙ! ⚡', 'УРА! 🚀', 'ОТЛИЧНО! ✨', 'КРУТО! 💫', 'ВАУ! 🌟', 'МАСТЕР! 🏆'];
        const SAD_PHRASES = ['Попробуй ещё! 💪', 'Давай проверим! 🧐', 'Почти! 😉', 'Не сдавайся! 🔥'];

        let speechTimer = null;
        function setSpeechBubble(text) {
            const bubble = document.getElementById('robik-speech-bubble');
            const textSpan = document.getElementById('robik-speech-text');
            if (!bubble || !textSpan) return;

            if (speechTimer) clearTimeout(speechTimer);
            textSpan.textContent = text;
            bubble.classList.remove('hidden');
            bubble.style.display = 'block';

            speechTimer = setTimeout(() => {
                bubble.classList.add('hidden');
                bubble.style.display = 'none';
            }, 1500);
        }

        function getRandomPhrase(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        // --- ФОНТАН ИЗ МОНЕТ 🪙 И ЗВЁЗД ⭐ ---
        function explodeFountainParticles(sourceEl) {
            const container = document.body;
            const rect = sourceEl ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const items = ['🪙', '⭐', '🪙', '✨', '🪙', '⭐', '🌟', '🪙', '⭐', '⚡', '🪙', '⭐'];

            items.forEach((symbol, i) => {
                const particle = document.createElement('div');
                particle.textContent = symbol;
                particle.className = 'fixed z-[9999] pointer-events-none text-2xl transition-all duration-900 ease-out';
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                particle.style.opacity = '1';
                particle.style.transform = 'translate(-50%, -50%) scale(0.4)';
                container.appendChild(particle);

                // Веер вверх и в стороны на 80-120px
                const angle = (Math.PI / 1.25) * (i / (items.length - 1)) - (Math.PI / 1.12); // upward fan
                const distance = 80 + Math.random() * 40; // 80-120px
                const targetX = Math.cos(angle) * distance;
                const targetY = Math.sin(angle) * distance - 20;

                requestAnimationFrame(() => {
                    particle.style.transform = `translate(${targetX}px, ${targetY}px) scale(1.35) rotate(${Math.random() * 360 - 180}deg)`;
                    particle.style.opacity = '0';
                });

                setTimeout(() => {
                    if (particle.parentNode) particle.parentNode.removeChild(particle);
                }, 950);
            });

            // Анимация начисления монет на счётчике (подпрыгивание scale 1.35)
            setTimeout(() => {
                const coinsBadges = document.querySelectorAll('.coins-badge');
                coinsBadges.forEach(badge => {
                    const parent = badge.parentElement;
                    if (parent) {
                        parent.classList.add('transition-transform', 'duration-200', 'scale-[1.35]', 'bg-amber-400/40');
                        setTimeout(() => {
                            parent.classList.remove('scale-[1.35]', 'bg-amber-400/40');
                        }, 250);
                    }
                });
            }, 350);
        }

        // --- РЕАКЦИЯ НА ПРАВИЛЬНЫЙ ОТВЕТ (ЗАКРЕПЛЕНО НА WINDOW) ---
        window.triggerExpressiveCorrectAnimation = function () {
            setRobikState('success');
            setCharEmojiState('success');
            setSpeechBubble(getRandomPhrase(HAPPY_PHRASES));

            const robik = document.querySelector('#screen-game .avatar-container, #screen-game img');
            if (robik) {
                robik.classList.add('robik-celebrate');
                setTimeout(() => robik.classList.remove('robik-celebrate'), 900);
            }

            const aura = document.getElementById('hologram-aura');
            if (aura) {
                aura.classList.add('neon-success-glow');
            }

            const answerDisplay = document.getElementById('answer-display');
            if (answerDisplay) {
                answerDisplay.classList.add('answer-flash-success');
            }

            const questionContainer = document.getElementById('question-container');
            if (typeof explodeFountainParticles === 'function') {
                explodeFountainParticles(questionContainer);
            }
            playSound('correct');

            setTimeout(() => {
                if (aura) aura.classList.remove('neon-success-glow');
                if (answerDisplay) answerDisplay.classList.remove('answer-flash-success');
                setRobikState('idle');
                setCharEmojiState('');
            }, 1200);
        };
        const triggerExpressiveCorrectAnimation = window.triggerExpressiveCorrectAnimation;

        // --- УПРАВЛЕНИЕ МИМИКОЙ РОБИКА ---
        function setRobikState(state) {
            const head = document.getElementById('robik-head');
            const antennaLine = document.getElementById('robik-antenna-line');
            const antennaLight = document.getElementById('antenna-light');
            const robikSvg = document.getElementById('robik-svg');

            const eyesIdle = document.getElementById('eyes-idle');
            const eyesHappy = document.getElementById('eyes-happy');
            const eyesSad = document.getElementById('eyes-sad');

            const mouthIdle = document.getElementById('mouth-idle');
            const mouthHappy = document.getElementById('mouth-happy');
            const mouthSad = document.getElementById('mouth-sad');

            // Скрытие всех элементов мимики
            [eyesIdle, eyesHappy, eyesSad, mouthIdle, mouthHappy, mouthSad].forEach(el => el.classList.add('hidden'));

            if (state === 'idle') {
                eyesIdle.classList.remove('hidden');
                mouthIdle.classList.remove('hidden');
                head.setAttribute('stroke', '#3b82f6');
                antennaLine.setAttribute('stroke', '#3b82f6');
                antennaLight.setAttribute('fill', '#06b6d4');
                robikSvg.style.filter = 'drop-shadow(0 0 15px rgba(56, 189, 248, 0.4))';
            } else if (state === 'success') {
                eyesHappy.classList.remove('hidden');
                mouthHappy.classList.remove('hidden');
                head.setAttribute('stroke', '#10b981');
                antennaLine.setAttribute('stroke', '#10b981');
                antennaLight.setAttribute('fill', '#10b981');
                robikSvg.style.filter = 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.6))';
            } else if (state === 'error') {
                eyesSad.classList.remove('hidden');
                mouthSad.classList.remove('hidden');
                head.setAttribute('stroke', '#ef4444');
                antennaLine.setAttribute('stroke', '#ef4444');
                antennaLight.setAttribute('fill', '#ef4444');
                robikSvg.style.filter = 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.6))';
            }
        }

        // --- АНИМАЦИЯ САЛЮТА МОНЕТ ---
        function explodeCoinSalute(sourceEl) {
            const container = document.body;
            const rect = sourceEl ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            for (let i = 0; i < 14; i++) {
                const coin = document.createElement('div');
                coin.textContent = '🪙';
                coin.className = 'fixed z-[9999] pointer-events-none text-2xl transition-all duration-1000 ease-out';
                coin.style.left = centerX + 'px';
                coin.style.top = centerY + 'px';
                coin.style.opacity = '1';
                coin.style.transform = 'translate(-50%, -50%) scale(0.5)';
                container.appendChild(coin);

                const angle = (Math.PI * 2 / 14) * i + (Math.random() * 0.4 - 0.2);
                const distance = 70 + Math.random() * 80;
                const targetX = Math.cos(angle) * distance;
                const targetY = Math.sin(angle) * distance - 70; // Веер вверх

                requestAnimationFrame(() => {
                    coin.style.transform = `translate(${targetX}px, ${targetY}px) scale(1.35) rotate(${Math.random() * 360}deg)`;
                    coin.style.opacity = '0';
                });

                setTimeout(() => {
                    if (coin.parentNode) coin.parentNode.removeChild(coin);
                }, 1000);
            }
        }



        // --- ЛОГИКА ГЕНЕРАЦИИ ПРИМЕРА ---
        function loadProblem() {
            currentProblem = engine.generateProblem(currentRuleType);
            currentInput = "";
            answerDisplay.textContent = "?";
            answerDisplay.className = "bg-[#0B0822]/80 border-2 border-indigo-500/40 rounded-2xl px-5 py-2 text-indigo-300 min-w-[90px] text-center shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-200";

            questionText.textContent = currentProblem.question;
            setRobikState('idle');
            setCharEmojiState('');

            // Адаптируем верстку под режим текстовых задач и величин
            if (currentRuleType === 'word_problems') {
                questionContainer.className = "w-full backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-[28px] py-5 px-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center gap-5 text-xl sm:text-2xl font-bold text-white text-center leading-relaxed";
                equalsSign.classList.add('hidden');
                questionText.className = "text-center leading-relaxed font-sans";
                unitDisplay.classList.add('hidden');
            } else if (currentRuleType === 'quantities') {
                questionContainer.className = "w-full backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-[28px] py-4 px-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.4)] flex flex-row items-center justify-center gap-4 text-4xl sm:text-5xl font-black text-white tracking-wide neon-glow-text whitespace-nowrap";
                equalsSign.classList.remove('hidden');
                questionText.className = "whitespace-nowrap font-sans";
                unitDisplay.classList.remove('hidden');
                unitDisplay.textContent = currentProblem.unit;
            } else {
                questionContainer.className = "w-full backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-[28px] py-4 px-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.4)] flex flex-row items-center justify-center gap-4 text-5xl sm:text-6xl font-black text-white tracking-wide font-mono neon-glow-text whitespace-nowrap";
                equalsSign.classList.remove('hidden');
                questionText.className = "whitespace-nowrap";
                unitDisplay.classList.add('hidden');
            }

            // Скрываем подсказки и обнуляем батареи
            batteriesContainer.classList.add('hidden');
            document.body.classList.remove('hint-open');
            resetBatteries();

            isInputLocked = false;
            updateCheckButtonState();
        }

        // --- УПРАВЛЕНИЕ АКТИВНОСТЬЮ КНОПКИ ПРОВЕРИТЬ ---
        function updateCheckButtonState() {
            if (currentInput.length > 0) {
                btnCheck.disabled = false;
                btnCheck.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                btnCheck.disabled = true;
                btnCheck.classList.add('opacity-50', 'pointer-events-none');
            }
        }

        // --- ЛОГИКА СЧЕТНЫХ ПАЛОЧЕК (COUNTING STICKS) ---
        let hintStepTimer1 = null;
        let hintStepTimer2 = null;

        function renderSticks(total, crossedOutCount = 0) {
            const container = document.getElementById('sticks-container');
            if (!container) return;
            container.innerHTML = ''; // Жесткая очистка от любого мусора
            
            for (let i = 0; i < total; i++) {
                const stick = document.createElement('div');
                // Зачеркиваем с конца
                if (i >= total - crossedOutCount) {
                    // Зачеркнутая палочка
                    stick.className = 'w-2 h-10 rounded-full bg-slate-700 opacity-60 relative transition-all duration-300';
                    const cross = document.createElement('div');
                    cross.className = 'absolute top-1/2 left-1/2 w-6 h-0.5 bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-45 shadow-[0_0_5px_red]';
                    stick.appendChild(cross);
                } else {
                    // Активная палочка
                    stick.className = 'w-2 h-10 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300';
                }
                container.appendChild(stick);
            }
        }

        function renderAdditionSticks(firstNum, secondNum, step) {
            const container = document.getElementById('sticks-container');
            if (!container) return;
            container.innerHTML = '';
            
            let totalToShow = 0;
            if (step === 0) totalToShow = firstNum; // Старт: только первое слагаемое
            if (step === 1) totalToShow = 10;       // Шаг 1: добили до круглого десятка
            if (step === 2) totalToShow = firstNum + secondNum; // Шаг 2: итоговая сумма

            for (let i = 0; i < totalToShow; i++) {
                const stick = document.createElement('div');
                
                // Первое слагаемое — голубое, второе (прибавляемое) — фиолетовое
                if (i < firstNum) {
                    stick.className = 'w-2 h-10 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300';
                } else {
                    stick.className = 'w-2 h-10 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9] transition-all duration-300';
                }
                
                container.appendChild(stick);
            }
        }

        function renderSimpleAdditionSticks(firstNum, secondNum, showFullSum) {
            const container = document.getElementById('sticks-container');
            if (!container) return;
            container.innerHTML = ''; // Очистка контейнера
            
            // Если showFullSum = false, показываем только первое число. Если true — оба.
            const totalToShow = showFullSum ? (firstNum + secondNum) : firstNum;

            for (let i = 0; i < totalToShow; i++) {
                const stick = document.createElement('div');
                if (i < firstNum) {
                    stick.className = 'w-2 h-10 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300';
                } else {
                    stick.className = 'w-2 h-10 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9] transition-all duration-300';
                }
                container.appendChild(stick);
            }
        }

        function renderNumbersTo20Subtraction(firstNum, secondNum) {
            const container = document.getElementById('sticks-container');
            if (!container) return;
            container.innerHTML = ''; // Очистка контейнера
            
            for (let i = 0; i < firstNum; i++) {
                const stick = document.createElement('div');
                
                // Зачеркиваем палочки с конца (вычитаемое)
                if (i >= firstNum - secondNum) {
                    stick.className = 'w-2 h-10 rounded-full bg-slate-500 opacity-80 relative transition-all duration-300';
                    const cross = document.createElement('div');
                    cross.className = 'absolute top-1/2 left-1/2 w-6 h-0.5 bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-45 shadow-[0_0_5px_red]';
                    stick.appendChild(cross);
                } else {
                    // Оставшиеся целые палочки
                    stick.className = 'w-2 h-10 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300';
                }
                
                container.appendChild(stick);
            }
        }

        function resetBatteries() {
            if (hintStepTimer1) { clearTimeout(hintStepTimer1); hintStepTimer1 = null; }
            if (hintStepTimer2) { clearTimeout(hintStepTimer2); hintStepTimer2 = null; }

            renderSticks(0, 0);

            if (typeof battery1Text !== 'undefined' && battery1Text) battery1Text.textContent = "0";
            if (typeof battery2Text !== 'undefined' && battery2Text) battery2Text.textContent = "0";
        }

        function showHint() {
            console.log('Лампочка нажата!');
            try {
                if (typeof playSound === 'function') playSound('click');
                if (typeof haptic === 'function') haptic('light');
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                }
            } catch (e) {}

            try {
                fillBatteries();
            } catch (e) {
                console.warn('Error filling hint:', e);
            }

            const hintContainer = document.getElementById('batteries-container') || 
                                  document.getElementById('hint-container') || 
                                  document.querySelector('.hint-block') ||
                                  document.querySelector('.hint-container') ||
                                  document.getElementById('batteries-visual');

            if (hintContainer) {
                const isCurrentlyHidden = hintContainer.classList.contains('hidden') || 
                                          hintContainer.style.display === 'none' || 
                                          getComputedStyle(hintContainer).display === 'none';

                if (isCurrentlyHidden) {
                    hintContainer.classList.remove('hidden');
                    hintContainer.style.display = 'flex';
                    hintContainer.style.visibility = 'visible';
                    hintContainer.style.opacity = '1';
                    document.body.classList.add('hint-open');
                } else {
                    hintContainer.classList.add('hidden');
                    hintContainer.style.display = 'none';
                    document.body.classList.remove('hint-open');
                }
            } else {
                console.error('Контейнер подсказки физически отсутствует в DOM!');
            }
        }

        function fillBatteries() {
            resetBatteries();

            const batteriesVisual = document.getElementById('batteries-visual');
            const hintTitle = document.getElementById('hint-title');

            const isWordProblem = currentRuleType === 'topic_6' || currentRuleType === 'word_problems' || (currentProblem && (currentProblem.type === 'word_add' || currentProblem.type === 'word_sub' || currentProblem.isWordProblem));
            const isQuantityProblem = currentRuleType === 'topic_5' || currentRuleType === 'quantities' || currentRuleType === 'length_units' || (currentProblem && currentProblem.unit);
            const isTensProblem = currentRuleType === 'tens' || currentRuleType === 'topic_9' || (currentProblem && currentProblem.a >= 10 && currentProblem.a % 10 === 0 && currentProblem.b >= 10 && currentProblem.b % 10 === 0);
            const isComparison = currentRuleType === 'topic_1' || currentRuleType === 'comparison' || (currentProblem && currentProblem.isComparison);
            const isUpTo10 = currentRuleType === 'topic_2' || currentRuleType === 'up_to_10';

            // Скрываем заголовок подсказки в карточках без визуальных рамок
            if (isTensProblem || isWordProblem || isQuantityProblem || isComparison || isUpTo10) {
                if (hintTitle) hintTitle.classList.add('hidden');
            } else {
                if (hintTitle) hintTitle.classList.remove('hidden');
            }

            // 1. Текстовые задачи
            if (isWordProblem) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');

                const a = currentProblem ? currentProblem.a : 0;
                const b = currentProblem ? currentProblem.b : 0;
                const operator = currentProblem ? (currentProblem.operator || (currentProblem.type === 'word_sub' ? '-' : '+')) : (currentProblem.type === 'word_sub' ? '-' : '+');
                const answer = currentProblem ? currentProblem.correctAnswer : 0;

                const isSub = operator === '-' || (currentProblem && currentProblem.type === 'word_sub');

                if (isSub) {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1.5 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Раз забрали, вычитаем:</div>
                            <div class="text-rose-400 font-black text-base sm:text-lg tracking-wide">${a} - ${b} = <span class="text-amber-300 font-black">${answer}</span></div>
                        </div>
                    `;
                } else {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1.5 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Раз положили ещё, складываем:</div>
                            <div class="text-sky-400 font-black text-base sm:text-lg tracking-wide">${a} + ${b} = <span class="text-emerald-400 font-black">${answer}</span></div>
                        </div>
                    `;
                }
                return;
            }

            // 2. Единицы измерения (Сантиметры и дм)
            if (isQuantityProblem) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');

                if (currentProblem && currentProblem.isComparison) {
                    const q = String(currentProblem.question || '');
                    const ans = currentProblem.correctAnswer;
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Сравниваем величины:</div>
                            <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${q}</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Нужен знак: ${ans}</div>
                        </div>
                    `;
                    return;
                }

                const { type, x, correctAnswer } = currentProblem || {};
                const qStr = String(currentProblem ? currentProblem.question : '');
                const ans = correctAnswer !== undefined ? correctAnswer : 0;

                const matches = qStr.match(/\d+/g) || [];
                const firstNum = (currentProblem && currentProblem.a !== undefined) ? currentProblem.a : (matches[0] ? parseInt(matches[0], 10) : 0);
                const secondNum = (currentProblem && currentProblem.b !== undefined) ? currentProblem.b : (matches[1] ? parseInt(matches[1], 10) : 0);
                const op = (currentProblem && currentProblem.operator) ? currentProblem.operator : (qStr.includes('-') ? '-' : '+');

                const hasDm = qStr.includes('дм');

                if (qStr.includes('+') || qStr.includes('-') || (firstNum > 0 && secondNum > 0)) {
                    if (hasDm) {
                        // Если в примере был дециметр (например, 1 дм - 2 см)
                        const dmMatch = qStr.match(/(\d+)\s*дм/);
                        const dmVal = dmMatch ? parseInt(dmMatch[1], 10) : 1;
                        const firstInCm = dmVal * 10;
                        const cmMatch = qStr.match(/(\d+)\s*см/);
                        const secCm = cmMatch ? parseInt(cmMatch[1], 10) : secondNum;

                        batteryHintFormula.innerHTML = `
                            <div class="flex flex-col items-center gap-1 font-sans text-center">
                                <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см. Считаем: ${firstInCm} ${op} ${secCm} = ${ans}.</div>
                                <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans} см</div>
                            </div>
                        `;
                    } else {
                        // Простые примеры только с сантиметрами (например, 10 см - 2 см)
                        batteryHintFormula.innerHTML = `
                            <div class="flex flex-col items-center gap-1 font-sans text-center">
                                <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Считаем числа: ${firstNum} ${op} ${secondNum} = ${ans}.</div>
                                <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans} см</div>
                            </div>
                        `;
                    }
                    return;
                }

                if (type === 'to_cm_simple') {
                    const dmVal = Math.floor(ans / 10) || 1;
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см</div>
                            <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${dmVal} дм = ${ans} см</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans}</div>
                        </div>
                    `;
                } else if (type === 'to_cm_mixed' || qStr.includes('дм') || qStr.includes('см')) {
                    const leftPart = qStr.split('=')[0] || qStr;
                    const isTypeB = leftPart.includes('см') && !leftPart.includes('дм');

                    if (isTypeB) {
                        const cmMatch = qStr.match(/(\d+)\s*см/);
                        const totalCm = cmMatch ? parseInt(cmMatch[1], 10) : (ans < 10 ? (10 + ans) : ans);
                        const dmVal = Math.floor(totalCm / 10) || 1;
                        const cmVal = totalCm % 10;

                        if (cmVal === 0) {
                            batteryHintFormula.innerHTML = `
                                <div class="flex flex-col items-center gap-1 font-sans text-center">
                                    <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см</div>
                                    <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${totalCm} см = ${dmVal} дм</div>
                                    <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans}</div>
                                </div>
                            `;
                        } else {
                            batteryHintFormula.innerHTML = `
                                <div class="flex flex-col items-center gap-1 font-sans text-center">
                                    <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см</div>
                                    <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${totalCm} см — это ${dmVal * 10} см (${dmVal} дм) и ${cmVal} см.</div>
                                    <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans}</div>
                                </div>
                            `;
                        }
                    } else {
                        const mixMatch = qStr.match(/(\d+)\s*дм\s*(\d+)\s*см/);
                        const dmVal = mixMatch ? parseInt(mixMatch[1], 10) : 1;
                        const cmVal = mixMatch ? parseInt(mixMatch[2], 10) : (x !== undefined ? x : (ans % 10));
                        const dmInCm = dmVal * 10;
                        const totalCm = dmInCm + cmVal;

                        batteryHintFormula.innerHTML = `
                            <div class="flex flex-col items-center gap-1 font-sans text-center">
                                <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см</div>
                                <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${dmVal} дм — это ${dmInCm} см, да еще ${cmVal} см.</div>
                                <div class="text-emerald-400 font-extrabold text-xs sm:text-sm">Значит, ${dmInCm} + ${cmVal} = ${totalCm} см.</div>
                                <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${totalCm}</div>
                            </div>
                        `;
                    }
                } else if (type === 'to_dm_simple') {
                    const totalCm = ans * 10;
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Переводим: 1 дм = 10 см</div>
                            <div class="text-sky-400 font-extrabold text-xs sm:text-sm">${totalCm} см = ${ans} дм</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans}</div>
                        </div>
                    `;
                } else {
                    const unit = currentProblem ? (currentProblem.unit || 'см') : 'см';
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Считаем числа: ${a} ${op} ${b} = ${ans} ${unit}</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Ответ: ${ans}</div>
                        </div>
                    `;
                }
                return;
            }

            // 2.5. Примеры с тремя операндами
            const qStr = String(currentProblem ? currentProblem.question : '');
            const numMatches = qStr.match(/\d+/g);
            const opMatches = qStr.match(/[+\-]/g);

            if (!isWordProblem && !isQuantityProblem && !(currentProblem && currentProblem.isComparison) && numMatches && numMatches.length === 3 && opMatches && opMatches.length === 2) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');
                hintTitle.classList.add('hidden');

                const n1 = parseInt(numMatches[0], 10);
                const n2 = parseInt(numMatches[1], 10);
                const n3 = parseInt(numMatches[2], 10);
                const op1 = opMatches[0];
                const op2 = opMatches[1];

                const step1Result = op1 === '+' ? (n1 + n2) : (n1 - n2);
                const finalResult = op2 === '+' ? (step1Result + n3) : (step1Result - n3);
                const ans = (currentProblem && currentProblem.correctAnswer !== undefined) ? currentProblem.correctAnswer : finalResult;

                const step1Text = op1 === '+' ? `${n1} + ${n2} = ${step1Result}` : `${n1} - ${n2} = ${step1Result}`;
                const step1Color = op1 === '+' ? 'text-sky-400' : 'text-orange-400';

                const step2Text = op2 === '+' ? `${step1Result} + ${n3} = ${ans}` : `${step1Result} - ${n3} = ${ans}`;
                const step2Color = op2 === '+' ? 'text-emerald-400' : 'text-rose-400';

                batteryHintFormula.innerHTML = `
                    <div class="flex flex-col items-center gap-1 font-sans text-center">
                        <div class="${step1Color} font-extrabold text-base sm:text-lg">${step1Text}</div>
                        <div class="${step2Color} font-extrabold text-base sm:text-lg">${step2Text}</div>
                        <div class="text-amber-300 font-black text-sm sm:text-base mt-0.5">Итог: ${n1} ${op1} ${n2} ${op2} ${n3} = ${ans}</div>
                    </div>
                `;
                return;
            }

            // 3. Извлекаем параметры математического примера
            let a = currentProblem ? currentProblem.a : undefined;
            let operator = currentProblem ? currentProblem.operator : undefined;
            let b = currentProblem ? currentProblem.b : undefined;
            const answer = currentProblem ? currentProblem.correctAnswer : 0;

            if (a === undefined || operator === undefined || b === undefined) {
                const q = String(currentProblem ? currentProblem.question : '');
                const isSub = q.includes('-');
                operator = isSub ? '-' : '+';
                const parts = q.split(operator).map(x => parseInt(x.trim(), 10));
                a = isNaN(parts[0]) ? 0 : parts[0];
                b = isNaN(parts[1]) ? 0 : parts[1];
            }

            // 4. Сравнение чисел (Запрещено менять визуализацию)
            if (isComparison) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');

                const qStr = String(currentProblem.question || '');
                let rawLeft = '', rawRight = '';

                if (qStr.includes('...')) {
                    const compParts = qStr.split('...');
                    rawLeft = compParts[0] || '';
                    rawRight = compParts[1] || '';
                } else if (qStr.includes('?')) {
                    const compParts = qStr.split('?');
                    rawLeft = compParts[0] || '';
                    rawRight = compParts[1] || '';
                } else if (currentProblem.a !== undefined && currentProblem.b !== undefined) {
                    rawLeft = String(currentProblem.a);
                    rawRight = String(currentProblem.b);
                } else {
                    rawLeft = qStr;
                    rawRight = '0';
                }

                function evalSide(str) {
                    if (typeof str === 'number') return isNaN(str) ? 0 : str;
                    if (!str) return 0;
                    const cleanStr = String(str).trim();
                    if (!isNaN(Number(cleanStr))) return Number(cleanStr);
                    const tokens = cleanStr.match(/(\d+|[+-])/g);
                    if (!tokens) return 0;
                    let res = 0;
                    let currentOp = '+';
                    for (let token of tokens) {
                        if (token === '+' || token === '-') {
                            currentOp = token;
                        } else {
                            const num = parseInt(token, 10);
                            if (!isNaN(num)) {
                                if (currentOp === '+') res += num;
                                else if (currentOp === '-') res -= num;
                            }
                        }
                    }
                    return res;
                }

                const valA = evalSide(rawLeft);
                const valB = evalSide(rawRight);
                const cmpSign = String(answer);

                batteryHintFormula.innerHTML = `
                    <div class="text-center font-sans font-extrabold text-base sm:text-lg">
                        Сравниваем <span class="text-sky-400">${valA}</span> и <span class="text-emerald-400">${valB}</span> &bull; Нужен знак <span class="text-amber-300 font-black">${cmpSign}</span>
                    </div>
                `;
                return;
            }

            // 5. Десятки (Круглые числа) - Запрещено менять визуализацию
            if (isTensProblem) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');

                const isAdd = operator === '+';
                const aTens = Math.floor(a / 10);
                const bTens = Math.floor(b / 10);

                if (isAdd) {
                    const sumTens = aTens + bTens;
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Считаем как единицы:</div>
                            <div class="text-sky-400 font-black text-sm sm:text-base">${aTens} + ${bTens} = ${sumTens}</div>
                            <div class="text-emerald-300 font-bold text-xs sm:text-sm">И возвращаем нолик!</div>
                            <div class="text-emerald-400 font-black text-base sm:text-lg mt-0.5">Итог: ${a} + ${b} = ${answer}</div>
                        </div>
                    `;
                } else {
                    const diffTens = aTens - bTens;
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Считаем как единицы:</div>
                            <div class="text-orange-400 font-black text-sm sm:text-base">${aTens} - ${bTens} = ${diffTens}</div>
                            <div class="text-sky-300 font-bold text-xs sm:text-sm">И возвращаем нолик!</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: ${a} - ${b} = ${answer}</div>
                        </div>
                    `;
                }
                return;
            }

            // 6. До 10 (Сложение/вычитание до 10) - Запрещено менять визуализацию
            if (isUpTo10 || (a <= 10 && b <= 10 && (a + b) <= 10 && operator === '+') || (a <= 10 && operator === '-' && (a - b) >= 0 && a !== 10)) {
                if (batteriesVisual) batteriesVisual.classList.add('hidden');

                if (operator === '-') {
                    batteryHintFormula.innerHTML = `
                        <div class="text-center font-sans font-extrabold text-base sm:text-lg">
                            Было <span class="text-emerald-400">${a}</span>. Отняли <span class="text-amber-400">${b}</span>. Осталось <span class="text-sky-400">${answer}</span>.
                        </div>
                    `;
                } else {
                    batteryHintFormula.innerHTML = `
                        <div class="text-center font-sans font-extrabold text-base sm:text-lg">
                            Пример: <span class="text-sky-400 font-bold">${a}</span> + <span class="text-emerald-400 font-bold">${b}</span> = <span class="text-indigo-400 font-bold">${answer}</span>
                        </div>
                    `;
                }
                return;
            }

            // --- ОБЛАСТЬ РАЗРЕШЕННЫХ ИЗМЕНЕНИЙ (СЧЕТНЫЕ ПАЛОЧКИ) ---

            // 7.1. Состав 10 (например, 10 - 3 = 7 или 3 + 7 = 10)
            if (currentRuleType === 'topic_3' || currentRuleType === 'target_10' || currentRuleType === 'composition10' || (operator === '-' && a === 10 && b <= 10) || (operator === '+' && (a + b) === 10)) {
                if (batteriesVisual) batteriesVisual.classList.remove('hidden');

                const xVal = operator === '-' ? b : a;
                const remainVal = Math.max(0, 10 - xVal);

                if (operator === '-') {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm mb-0.5">Состав числа 10: 10 - ${xVal} = ${remainVal}</div>
                            <div class="text-sky-400 font-extrabold text-xs sm:text-sm">Было 10 палочек. Зачеркиваем ${xVal} палочек.</div>
                            <div class="text-emerald-300 font-extrabold text-xs sm:text-sm">Остается ${remainVal} палочек!</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: 10 - ${xVal} = ${remainVal}</div>
                        </div>
                    `;

                    // ШАГ 0: 10 палочек
                    renderSticks(10, 0);

                    // ШАГ 1: Зачеркнуть xVal палочек
                    hintStepTimer1 = setTimeout(() => {
                        renderSticks(10, xVal);
                        if (window.Telegram?.WebApp?.HapticFeedback) {
                            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                        }
                    }, 800);
                } else {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm mb-0.5">Состав числа 10: ${xVal} + ${remainVal} = 10</div>
                            <div class="text-sky-400 font-extrabold text-xs sm:text-sm">Число 10 состоит из ${xVal} и ${remainVal}.</div>
                            <div class="text-emerald-300 font-extrabold text-xs sm:text-sm">Значит, ${xVal} + ${remainVal} = 10!</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: ${xVal} + ${remainVal} = 10</div>
                        </div>
                    `;

                    renderSticks(10, 0);
                }
                return;
            }

            // 7.2. Числа до 20 (например, 14 - 10, 14 - 4, 10 + 4)
            if (currentRuleType === 'topic_4' || currentRuleType === 'up_to_20_no_carry' || (a > 0 && b > 0 && a <= 20 && b <= 20 && (a + b) <= 20 && (a >= 10 || b >= 10) && (a % 10 === 0 || b % 10 === 0))) {
                if (batteriesVisual) batteriesVisual.classList.remove('hidden');

                const total = answer || (a + b);

                if (operator === '+') {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">К ${a} прибавляем ${b}.</div>
                            <div class="text-emerald-400 font-black text-base sm:text-lg mt-0.5">Итог: ${a} + ${b} = ${total}</div>
                        </div>
                    `;
                    // Сначала первое слагаемое (голубые палочки)
                    renderSimpleAdditionSticks(a, b, false);

                    // Показываем оба слагаемых через 800 мс
                    hintStepTimer1 = setTimeout(() => {
                        renderSimpleAdditionSticks(a, b, true);
                        if (window.Telegram?.WebApp?.HapticFeedback) {
                            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                        }
                    }, 800);
                } else {
                    batteryHintFormula.innerHTML = `
                        <div class="flex flex-col items-center gap-1 font-sans text-center">
                            <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Из ${a} забираем ${b}.</div>
                            <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: ${a} - ${b} = ${answer}</div>
                        </div>
                    `;
                    renderNumbersTo20Subtraction(a, b);
                }
                return;
            }

            // 7.3. Вычитание через десяток (sub_ten) - например, 13 - 7
            if (currentRuleType === 'sub_ten' || currentRuleType === 'topic_8' || (operator === '-' && a > 10 && b > (a - 10))) {
                if (batteriesVisual) batteriesVisual.classList.remove('hidden');

                const toTen = a > 10 ? (a - 10) : 1;
                const remain = b - toTen;

                batteryHintFormula.innerHTML = `
                    <div class="flex flex-col items-center gap-1 font-sans text-center">
                        <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Удобно вычитать по частям:</div>
                        <div class="text-sky-400 font-black text-sm sm:text-base">1) ${a} - ${toTen} = 10</div>
                        <div class="text-rose-400 font-black text-sm sm:text-base">2) 10 - ${remain} = ${answer}</div>
                        <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: ${answer}</div>
                    </div>
                `;

                    renderSticks('sticks-container', a, toTen);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                }, 800);

                // ШАГ 2 (отнимаем остаток): renderSticks(container, a, b)
                hintStepTimer2 = setTimeout(() => {
                    renderSticks('sticks-container', a, b);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                }, 1600);
                return;
            }

            // 7.4. Сложение через десяток (over_ten) - например, 8 + 6
            if (currentRuleType === 'over_ten' || currentRuleType === 'topic_7' || (operator === '+' && a < 10 && (a + b) > 10)) {
                if (batteriesVisual) batteriesVisual.classList.remove('hidden');

                const isSwapped = a < b;
                const first = isSwapped ? b : a;
                const second = isSwapped ? a : b;

                const toTen = 10 - first;
                const remain = second - toTen;

                const swapNotice = isSwapped ? `<div class="text-indigo-300 font-extrabold text-xs sm:text-sm mb-0.5">Удобнее менять местами: ${b} + ${a}</div>` : '';

                batteryHintFormula.innerHTML = `
                    <div class="flex flex-col items-center gap-1 font-sans text-center">
                        ${swapNotice}
                        <div class="text-indigo-300 font-extrabold text-xs sm:text-sm">Удобно складывать по частям:</div>
                        <div class="text-sky-400 font-black text-sm sm:text-base">1) ${first} + ${toTen} = 10</div>
                        <div class="text-emerald-400 font-black text-sm sm:text-base">2) 10 + ${remain} = ${answer}</div>
                        <div class="text-amber-300 font-black text-base sm:text-lg mt-0.5">Итог: ${answer}</div>
                    </div>
                `;

                // ШАГ 0: Показываем только первое слагаемое (first)
                renderAdditionSticks(first, second, 0);

                // ШАГ 1: Добиваем до десятка (10)
                hintStepTimer1 = setTimeout(() => {
                    renderAdditionSticks(first, second, 1);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                }, 800);

                // ШАГ 2: Итоговая сумма (first + second)
                hintStepTimer2 = setTimeout(() => {
                    renderAdditionSticks(first, second, 2);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                }, 1600);
                return;
            }
        }
        }

        // --- ОБРАБОТЧИКИ НАЖАТИЙ (Numpad) ---
        document.querySelectorAll('.numpad-btn').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (isInputLocked) return;
                    const num = btn.textContent;

                    // Валидация нуля
                    if (currentInput === "0") {
                        if (num === "0") {
                            // Если текущее значение ответа равен "0", нажатие на кнопку "0" должно игнорироваться.
                            return;
                        } else {
                            // Если нажата другая цифра, она должна заменять единственный "0".
                            currentInput = num;
                        }
                    } else {
                        // Ограничение длины: Поле ответа должно вмещать максимум 4 символа.
                        if (currentInput.length >= 4) {
                            return;
                        }
                        currentInput += num;
                    }

                    playSound('click');
                    haptic('light');
                    answerDisplay.textContent = currentInput;

                    // Делаем фокус на вводе красивым
                    answerDisplay.className = "bg-[#1E174D]/90 border-2 border-indigo-400/80 rounded-2xl px-5 py-2 text-indigo-200 min-w-[90px] text-center shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-200";

                    updateCheckButtonState();
                });
            }
        });

        // Стереть последний символ
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if (isInputLocked) return;
                playSound('click');
                if (currentInput.length > 0) {
                    currentInput = currentInput.slice(0, -1);
                    if (currentInput === "") {
                        if (answerDisplay) {
                            answerDisplay.textContent = "?";
                            answerDisplay.className = "bg-[#0B0822]/80 border-2 border-indigo-500/40 rounded-2xl px-5 py-2 text-indigo-300 min-w-[90px] text-center shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-200";
                        }
                    } else {
                        if (answerDisplay) answerDisplay.textContent = currentInput;
                    }
                    updateCheckButtonState();
                }
            });
        }

        if (btnHint) {
            btnHint.addEventListener('click', () => {
                if (isInputLocked) return;
                showHint();
            });
        }

        if (btnCheck) {
            btnCheck.addEventListener('click', () => {
                if (isInputLocked || currentInput === "") return;
                isInputLocked = true;
                btnCheck.disabled = true;
                btnCheck.classList.add('opacity-50', 'pointer-events-none');
                const userAnswer = parseInt(currentInput);
                const expectedAnswer = parseInt(currentProblem.correctAnswer);
                if (userAnswer === expectedAnswer) {
                    haptic('success');
                    triggerExpressiveCorrectAnimation();
                    answerDisplay.className = "bg-[#093020]/90 border-2 border-emerald-400 rounded-2xl px-5 py-2 text-emerald-300 min-w-[90px] text-center shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-200";
                    confetti.explode();
                    coins += 1;
                    streak += 1;
                    localStorage.setItem('coins', coins);
                    localStorage.setItem('streak', streak);
                    totalSolved += 1;
                    localStorage.setItem('totalSolved', totalSolved);
                    checkUnlocks();
                    if (currentRuleType) {
                        topicProgress[currentRuleType] = (topicProgress[currentRuleType] || 0) + 1;
                        localStorage.setItem('sokrat_topic_progress', JSON.stringify(topicProgress));
                        updateTopicStars();
                    }
                    if (!dailyGoalCompleted) {
                        dailySolved = Math.min(dailySolved + 1, DAILY_GOAL);
                        localStorage.setItem(todayKey, dailySolved);
                        if (dailySolved >= DAILY_GOAL) {
                            dailyGoalCompleted = true;
                            coins += 50;
                            localStorage.setItem('coins', coins);
                            setTimeout(() => {
                                playSound('triumph');
                                confetti.explode();
                                confetti.explode();
                                const triumphModal = document.getElementById('triumph-modal');
                                if (triumphModal) {
                                    triumphModal.classList.remove('hidden');
                                    triumphModal.style.display = 'flex';
                                }
                            }, 500);
                        }
                    }
                    updateCoinsAndStreak();
                    badgeCoinsList.forEach(badge => {
                        badge.parentElement.classList.add('scale-110', 'bg-amber-400/20');
                        setTimeout(() => badge.parentElement.classList.remove('scale-110', 'bg-amber-400/20'), 300);
                    });
                    badgeGoalList.forEach(badge => {
                        badge.parentElement.classList.add('scale-110', 'bg-violet-400/20');
                        setTimeout(() => badge.parentElement.classList.remove('scale-110', 'bg-violet-400/20'), 300);
                    });
                    setTimeout(loadProblem, 1200);
                } else {
                    playSound('incorrect');
                    haptic('error');
                    setRobikState('error');
                    setCharEmojiState('error');
                    setSpeechBubble(getRandomPhrase(SAD_PHRASES));
                    answerDisplay.className = "bg-[#451025]/90 border-2 border-rose-400 rounded-2xl px-5 py-2 text-rose-300 min-w-[90px] text-center shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all duration-200";
                    gameCard.classList.add('shake-animation');
                    setTimeout(() => gameCard.classList.remove('shake-animation'), 400);
                    streak = 0;
                    updateCoinsAndStreak();
                    localStorage.setItem('streak', streak);
                    setTimeout(() => {
                        currentInput = "";
                        answerDisplay.textContent = "?";
                        answerDisplay.className = "bg-[#0B0822]/80 border-2 border-indigo-500/40 rounded-2xl px-5 py-2 text-indigo-300 min-w-[90px] text-center shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-200";
                        setRobikState('idle');
                        setCharEmojiState('');
                        isInputLocked = false;
                        updateCheckButtonState();
                    }, 1000);
                }
            });

            // --- ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ИГРЫ И КЛИКОВ ПО ТЕМАМ ---
            function startTopic(topicKey) {
                console.log('Starting topic:', topicKey);
                const screenTopics = document.getElementById('screen-topics');
                const screenGame = document.getElementById('screen-game');
                const screenCollection = document.getElementById('screen-collection');

                if (screenTopics) {
                    screenTopics.style.setProperty('display', 'none', 'important');
                    screenTopics.classList.add('hidden');
                }
                if (screenCollection) {
                    screenCollection.style.setProperty('display', 'none', 'important');
                    screenCollection.classList.add('hidden');
                }
                if (screenGame) {
                    screenGame.style.setProperty('display', 'flex', 'important');
                    screenGame.style.visibility = 'visible';
                    screenGame.style.opacity = '1';
                    screenGame.classList.remove('hidden');
                    screenGame.classList.add('active');
                }

                playSound('click');
                if (typeof haptic === 'function') haptic('light');
                isInputLocked = false;

                const aliasMap = {
                    'composition10': 'target_10',
                    'with_carry': 'over_ten',
                    'subtraction': 'sub_ten',
                    'target_10': 'target_10',
                    'over_ten': 'over_ten',
                    'sub_ten': 'sub_ten',
                    'tens': 'tens',
                    'word_problems': 'word_problems',
                    'quantities': 'quantities'
                };
                currentRuleType = aliasMap[topicKey] || topicKey;

                loadProblem();
                showScreen('screen-game');
            }

            window.startTopic = startTopic;
            window.selectTopic = startTopic;
            window.startGame = startTopic;
            window.switchToGame = startTopic;
            window.generateQuestion = startTopic;

            function initTopicClicks() {
                document.querySelectorAll('.topic-card, [data-topic]').forEach(card => {
                    card.onclick = function () {
                        const topic = this.dataset.topic || this.getAttribute('data-topic') || 'composition10';
                        const sTopics = document.getElementById('screen-topics');
                        const sGame = document.getElementById('screen-game');
                        if (sTopics) sTopics.style.display = 'none';
                        if (sGame) sGame.style.display = 'flex';
                        if (typeof startTopic === 'function') startTopic(topic);
                        else if (typeof generateQuestion === 'function') generateQuestion(topic);
                    };
                });
            }
            if (document) document.addEventListener('DOMContentLoaded', initTopicClicks);
            initTopicClicks();

            const elementsWithListeners = [
                { el: btnTarget10, handler: () => startTopic('target_10') },
                { el: btnOverTen, handler: () => startTopic('over_ten') },
                { el: btnSubTen, handler: () => startTopic('sub_ten') },
                { el: btnTens, handler: () => startTopic('tens') },
                { el: btnWordProblems, handler: () => startTopic('word_problems') },
                { el: btnQuantities, handler: () => startTopic('quantities') },
                {
                    el: btnBackToHub, handler: () => {
                        playSound('click');
                        showScreen('screen-topics');
                    }
                },
                {
                    el: document.getElementById('triumph-claim-btn'), handler: () => {
                        playSound('click');
                        haptic('light');
                        const triumphModal = document.getElementById('triumph-modal');
                        if (triumphModal) {
                            triumphModal.classList.add('hidden');
                            triumphModal.style.display = 'none';
                        }
                        updateCoinsAndStreak();
                        showScreen('screen-topics');
                    }
                }
            ];

            elementsWithListeners.forEach(({ el, handler }) => {
                if (el) el.addEventListener('click', handler);
            });

            // Запуск первого примера при загрузке
            loadProblem();
            showScreen('screen-topics');

            // Инициализация Telegram Web App
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }

            console.log('Sokrat App Initialized Successfully');

            window.startTopic = startTopic;
            window.showScreen = showScreen;
            window.loadProblem = loadProblem;
            if (typeof selectTopic === 'function') window.selectTopic = selectTopic;
            if (typeof checkAnswer === 'function') window.checkAnswer = checkAnswer;
            if (typeof openCollection === 'function') window.openCollection = openCollection;
        })();
    </script>
</body>
