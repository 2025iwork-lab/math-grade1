import { MathEngine } from './src/engine/MathEngine.js';
const engine = new MathEngine();
for (const type of ['target_10', 'over_ten', 'sub_ten', 'tens', 'word_problems', 'quantities']) {
  for (let i = 0; i < 50; i++) {
    const prob = engine.generateProblem(type);
    if (prob.question.includes(',')) {
      console.log(`Type: ${type}, Question: ${prob.question}`);
    }
  }
}
