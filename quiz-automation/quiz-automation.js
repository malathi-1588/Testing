// quiz-automation.js
import 'dotenv/config';
import { chromium } from 'playwright';
import { getAnswerIndex } from './openai-client.js';

(async () => {
  // Launch browser (set headless: true to hide)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to quiz...");
  await page.goto('https://ai-quizzes-rho.vercel.app/ai-quiz-sample.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-btn', { timeout: 10000 });
  await page.click('#start-btn');
  console.log("Quiz started.");

  const log = [];

  for (let q = 1; q <= 26; q++) {
    await page.waitForSelector('#question', { timeout: 10000 });
    const question = (await page.textContent('#question'))?.trim() || '';

    // Grab option buttons and their text
    const optionButtons = await page.$$('#options button');
    const options = [];
    for (const btn of optionButtons) {
      const txt = (await btn.textContent())?.trim() || '';
      options.push(txt);
    }

    console.log(`\n--- Question ${q} ---`);
    console.log("Q:", question);
    console.log("Options:", options);

    let chosenIndex = await getAnswerIndex(question, options);
    if (chosenIndex === null || chosenIndex < 0 || chosenIndex >= options.length) {
      chosenIndex = Math.floor(Math.random() * options.length);
      console.log(`Using fallback random answer: ${chosenIndex}`);
    } else {
      console.log(`OpenAI suggests: [${chosenIndex}] ${options[chosenIndex]}`);
    }

    // Click the chosen answer
    if (optionButtons[chosenIndex]) {
      await optionButtons[chosenIndex].click();
    } else {
      console.warn("Chosen index invalid, clicking first option.");
      await optionButtons[0].click();
      chosenIndex = 0;
    }

    // Small pause
    await page.waitForTimeout(400);

    // Next question
    await page.waitForSelector('#next-btn', { timeout: 5000 });
    await page.click('#next-btn');

    log.push({
      question,
      options,
      chosenIndex,
      chosenAnswer: options[chosenIndex] || '',
    });

    // pacing
    await page.waitForTimeout(300);
  }

  // Final score
  await page.waitForSelector('#score', { timeout: 10000 });
  const scoreText = (await page.textContent('#score'))?.trim();
  console.log("\n=== FINAL ===");
  console.log("Score:", scoreText);

  // Detailed log
  console.log("\n=== QUIZ LOG ===");
  log.forEach((entry, i) => {
    console.log(`\nQ${i + 1}: ${entry.question}`);
    entry.options.forEach((opt, idx) => {
      const mark = idx === entry.chosenIndex ? '>>' : '  ';
      console.log(`${mark} [${idx}] ${opt}`);
    });
    console.log(`Chosen: [${entry.chosenIndex}] ${entry.chosenAnswer}`);
  });

  await browser.close();
})();
