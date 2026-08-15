/**
 * Математический движок для генерации примеров (1 класс, "Школа России").
 */
export class MathEngine {
  /**
   * Генерирует математический пример на основе переданного типа правила и уровня сложности.
   * @param {string} type - Тип правила ('topic_1' ... 'topic_9' или псевдонимы)
   * @param {number} level - Уровень сложности (1 - базовый, 2 - средний, 3 - усложненный)
   * @returns {Object} Объект с примером
   */
  generateProblem(type, level = 1) {
    switch (type) {
      case 'topic_1':
      case 'comparison':
        return this._generateComparison(level);
      case 'topic_2':
      case 'up_to_10':
        return this._generateUpTo10(level);
      case 'topic_3':
      case 'target_10':
      case 'composition10':
        return this._generateTarget10(level);
      case 'topic_4':
      case 'up_to_20_no_carry':
        return this._generateUpTo20NoCarry(level);
      case 'topic_5':
      case 'quantities':
      case 'length_units':
        return this._generateLengthUnits(level);
      case 'topic_6':
      case 'word_problems':
        return this._generateWordProblems(level);
      case 'topic_7':
      case 'over_ten':
      case 'with_carry':
        return this._generateOverTen(level);
      case 'topic_8':
      case 'sub_ten':
      case 'subtraction':
        return this._generateSubTen(level);
      case 'topic_9':
      case 'tens':
        return this._generateTens(level);
      default:
        return this._generateUpTo10(level);
    }
  }

  _getDeclension(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[
      (number % 100 > 4 && number % 100 < 20)
        ? 2
        : cases[Math.min(number % 10, 5)]
    ];
  }

  /**
   * topic_1: Сравнение чисел и выражений (1 класс: Ур. 1 до 10, Ур. 2 до 20, Ур. 3 выражения до 20)
   */
  _generateComparison(level = 1) {
    if (level === 1) {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const correctAnswer = a > b ? '>' : (a < b ? '<' : '=');
      return { a, operator: '...', b, question: `${a} ... ${b}`, correctAnswer, isComparison: true };
    } else if (level === 2) {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const correctAnswer = a > b ? '>' : (a < b ? '<' : '=');
      return { a, operator: '...', b, question: `${a} ... ${b}`, correctAnswer, isComparison: true };
    } else {
      const a1 = Math.floor(Math.random() * 9) + 1;
      const a2 = Math.floor(Math.random() * 9) + 1;
      const valA = a1 + a2;
      const valB = Math.floor(Math.random() * 18) + 2;
      const correctAnswer = valA > valB ? '>' : (valA < valB ? '<' : '=');
      return { question: `${a1} + ${a2} ... ${valB}`, correctAnswer, isComparison: true };
    }
  }

  /**
   * topic_2: Сложение и вычитание в пределах 10
   */
  _generateUpTo10(level = 1) {
    if (level === 1) {
      const isAdd = Math.random() < 0.5;
      const operator = isAdd ? '+' : '-';
      let a, b, correctAnswer;
      if (isAdd) {
        a = Math.floor(Math.random() * 6);
        b = Math.floor(Math.random() * (5 - a + 1));
        correctAnswer = a + b;
      } else {
        a = Math.floor(Math.random() * 6);
        b = Math.floor(Math.random() * (a + 1));
        correctAnswer = a - b;
      }
      return { a, operator, b, question: `${a} ${operator} ${b}`, correctAnswer };
    } else if (level === 2) {
      const isAdd = Math.random() < 0.5;
      const operator = isAdd ? '+' : '-';
      let a, b, correctAnswer;
      if (isAdd) {
        a = Math.floor(Math.random() * 11);
        b = Math.floor(Math.random() * (10 - a + 1));
        correctAnswer = a + b;
      } else {
        a = Math.floor(Math.random() * 11);
        b = Math.floor(Math.random() * (a + 1));
        correctAnswer = a - b;
      }
      return { a, operator, b, question: `${a} ${operator} ${b}`, correctAnswer };
    } else {
      const isAdd = Math.random() < 0.5;
      if (isAdd) {
        const a = Math.floor(Math.random() * 4) + 1;
        const b = Math.floor(Math.random() * 4) + 1;
        const c = Math.floor(Math.random() * (10 - a - b)) + 1;
        return { question: `${a} + ${b} + ${c}`, correctAnswer: a + b + c };
      } else {
        const a = Math.floor(Math.random() * 5) + 6;
        const b = Math.floor(Math.random() * (a - 3)) + 1;
        const c = Math.floor(Math.random() * (a - b - 1)) + 1;
        return { question: `${a} - ${b} - ${c}`, correctAnswer: a - b - c };
      }
    }
  }

  /**
   * topic_3: Состав числа 10
   */
  _generateTarget10(level = 1) {
    if (level === 1) {
      const b = Math.floor(Math.random() * 5) + 1;
      return { a: 10, operator: '-', b, question: `10 - ${b}`, correctAnswer: 10 - b };
    } else if (level === 2) {
      const b = Math.floor(Math.random() * 9) + 1;
      return { a: 10, operator: '-', b, question: `10 - ${b}`, correctAnswer: 10 - b };
    } else {
      const b = Math.floor(Math.random() * 9) + 1;
      const a = 10 - b;
      return { question: `${a} + ? = 10`, correctAnswer: b };
    }
  }

  /**
   * topic_4: Числа до 20 без перехода
   */
  _generateUpTo20NoCarry(level = 1) {
    const x = Math.floor(Math.random() * 9) + 1;
    if (level === 1) {
      return { a: 10, operator: '+', b: x, question: `10 + ${x}`, correctAnswer: 10 + x };
    } else if (level === 2) {
      const isMinusTen = Math.random() < 0.5;
      if (isMinusTen) {
        return { a: 10 + x, operator: '-', b: 10, question: `${10 + x} - 10`, correctAnswer: x };
      } else {
        return { a: 10 + x, operator: '-', b: x, question: `${10 + x} - ${x}`, correctAnswer: 10 };
      }
    } else {
      const isAdd = Math.random() < 0.5;
      if (isAdd) {
        const unitA = Math.floor(Math.random() * 5) + 1;
        const unitB = Math.floor(Math.random() * (9 - unitA)) + 1;
        const a = 10 + unitA;
        return { a, operator: '+', b: unitB, question: `${a} + ${unitB}`, correctAnswer: a + unitB };
      } else {
        const unitA = Math.floor(Math.random() * 7) + 2;
        const unitB = Math.floor(Math.random() * (unitA - 1)) + 1;
        const a = 10 + unitA;
        return { a, operator: '-', b: unitB, question: `${a} - ${unitB}`, correctAnswer: a - unitB };
      }
    }
  }

  /**
   * topic_5: Сантиметры и дм (1 класс — без миллиметров)
   */
  _generateLengthUnits(level = 1) {
    if (level === 1) {
      const dm = Math.floor(Math.random() * 2) + 1;
      const isCmToDm = Math.random() < 0.5;
      if (isCmToDm) {
        return { question: `${dm * 10} см = ? дм`, correctAnswer: dm, unit: 'дм', type: 'to_dm_simple' };
      } else {
        return { question: `${dm} дм = ? см`, correctAnswer: dm * 10, unit: 'см', type: 'to_cm_simple' };
      }
    } else if (level === 2) {
      const cmPart = Math.floor(Math.random() * 9) + 1;
      const totalCm = 10 + cmPart;
      const isExpand = Math.random() < 0.5;
      if (isExpand) {
        return { question: `1 дм ${cmPart} см = ? см`, correctAnswer: totalCm, unit: 'см', x: cmPart, type: 'to_cm_mixed' };
      } else {
        return { question: `${totalCm} см = 1 дм ? см`, correctAnswer: cmPart, unit: 'см', x: cmPart, type: 'to_cm_mixed' };
      }
    } else {
      const taskType = Math.floor(Math.random() * 2);
      if (taskType === 0) {
        const options = [
          { labelA: '1 дм', labelB: '10 см', ans: '=' },
          { labelA: '1 дм', labelB: '8 см', ans: '>' },
          { labelA: '12 см', labelB: '1 дм 5 см', ans: '<' },
          { labelA: '1 дм 4 см', labelB: '14 см', ans: '=' },
          { labelA: '18 см', labelB: '1 дм 6 см', ans: '>' },
          { labelA: '2 дм', labelB: '19 см', ans: '>' }
        ];
        const item = options[Math.floor(Math.random() * options.length)];
        return { question: `${item.labelA} ... ${item.labelB}`, correctAnswer: item.ans, isComparison: true };
      } else {
        const isAdd = Math.random() < 0.5;
        if (isAdd) {
          const a = Math.floor(Math.random() * 8) + 1;
          const b = Math.floor(Math.random() * 8) + 1;
          return { question: `${a} см + ${b} см = ? см`, correctAnswer: a + b, unit: 'см' };
        } else {
          const a = Math.floor(Math.random() * 10) + 6;
          const b = Math.floor(Math.random() * 5) + 1;
          return { question: `${a} см - ${b} см = ? см`, correctAnswer: a - b, unit: 'см' };
        }
      }
    }
  }

  /**
   * topic_6: Текстовые задачи 1 класса
   */
  _generateWordProblems(level = 1) {
    const isAdd = Math.random() < 0.5;
    const maxVal = level === 1 ? 10 : (level === 2 ? 15 : 20);
    if (isAdd) {
      const a = Math.floor(Math.random() * Math.min(10, maxVal - 1)) + 1;
      const b = Math.floor(Math.random() * (maxVal - a)) + 1;
      const correctAnswer = a + b;
      const templates = [
        `У Робика было ${a} ${this._getDeclension(a, ['яблоко', 'яблока', 'яблок'])}. Он нашел еще ${b} ${this._getDeclension(b, ['яблоко', 'яблока', 'яблок'])}. Сколько всего яблок стало?`,
        `В коробке ${this._getDeclension(a, ['лежал', 'лежало', 'лежало'])} ${a} ${this._getDeclension(a, ['синий', 'синих', 'синих'])} ${this._getDeclension(a, ['карандаш', 'карандаша', 'карандашей'])} и ${b} ${this._getDeclension(b, ['красный', 'красных', 'красных'])} ${this._getDeclension(b, ['карандаш', 'карандаша', 'карандашей'])}. Сколько всего карандашей стало?`,
        `На ветке сидело ${a} ${this._getDeclension(a, ['птичка', 'птички', 'птичек'])}. Прилетело еще ${b} ${this._getDeclension(b, ['птичка', 'птички', 'птичек'])}. Сколько птичек стало на ветке?`
      ];
      const text = templates[Math.floor(Math.random() * templates.length)];
      return { a, operator: '+', b, question: text, correctAnswer, formula: `${a} + ${b} = ${correctAnswer}`, type: 'word_add' };
    } else {
      const a = Math.floor(Math.random() * (maxVal - 1)) + 2;
      const b = Math.floor(Math.random() * (a - 1)) + 1;
      const correctAnswer = a - b;
      const templates = [
        `${this._getDeclension(a, ['Была', 'Было', 'Было'])} ${a} ${this._getDeclension(a, ['конфета', 'конфеты', 'конфет'])}. Робик съел ${b} ${this._getDeclension(b, ['конфету', 'конфеты', 'конфет'])}. Сколько конфет осталось?`,
        `${this._getDeclension(a, ['На полке стояла', 'На полке стояло', 'На полке стояло'])} ${a} ${this._getDeclension(a, ['книга', 'книги', 'книг'])}. Робик взял ${b} ${this._getDeclension(b, ['книгу', 'книги', 'книг'])}. Сколько книг осталось?`,
        `В саду росло ${a} ${this._getDeclension(a, ['цветок', 'цветка', 'цветов'])}. Срезали ${b} ${this._getDeclension(b, ['цветок', 'цветка', 'цветов'])}. Сколько цветов осталось?`
      ];
      const text = templates[Math.floor(Math.random() * templates.length)];
      return { a, operator: '-', b, question: text, correctAnswer, formula: `${a} - ${b} = ${correctAnswer}`, type: 'word_sub' };
    }
  }

  /**
   * topic_7: Сложение с переходом через десяток (1 класс: в пределах 18)
   */
  _generateOverTen(level = 1) {
    const operator = '+';
    let a, b;
    const maxSum = level === 1 ? 13 : (level === 2 ? 15 : 18);
    const minSum = level === 1 ? 11 : (level === 2 ? 11 : 13);
    do {
      a = Math.floor(Math.random() * 8) + 2;
      b = Math.floor(Math.random() * 8) + 2;
    } while (a + b < minSum || a + b > maxSum);
    const correctAnswer = a + b;
    const toTen = 10 - a;
    const remain = b - toTen;
    return { a, operator, b, question: `${a} ${operator} ${b}`, correctAnswer, splitHelp: { toTen, remain } };
  }

  /**
   * topic_8: Вычитание с переходом через десяток
   */
  _generateSubTen(level = 1) {
    const operator = '-';
    let a, b;
    const maxA = level === 1 ? 13 : (level === 2 ? 15 : 18);
    do {
      a = Math.floor(Math.random() * (maxA - 10)) + 11;
      b = Math.floor(Math.random() * 8) + 2;
    } while (a <= b || (a - b) >= 10);
    const correctAnswer = a - b;
    const toTen = a - 10;
    const remain = b - toTen;
    return { a, operator, b, question: `${a} ${operator} ${b}`, correctAnswer, splitHelp: { toTen, remain } };
  }

  /**
   * topic_9: Счёт круглыми десятками (10, 20... 100)
   */
  _generateTens(level = 1) {
    const isAdd = Math.random() < 0.5;
    const operator = isAdd ? '+' : '-';
    const maxTens = level === 1 ? 5 : (level === 2 ? 8 : 10);
    let a, b, correctAnswer;
    if (isAdd) {
      const aTens = Math.floor(Math.random() * (maxTens - 1)) + 1;
      const bTens = Math.floor(Math.random() * (maxTens - aTens)) + 1;
      a = aTens * 10; b = bTens * 10; correctAnswer = a + b;
    } else {
      const aTens = Math.floor(Math.random() * (maxTens - 1)) + 2;
      const bTens = Math.floor(Math.random() * (aTens - 1)) + 1;
      a = aTens * 10; b = bTens * 10; correctAnswer = a - b;
    }
    return { a, operator, b, question: `${a} ${operator} ${b}`, correctAnswer };
  }
}
