// openai-client.js
import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY not set in .env");
  process.exit(1);
}

/**
 * Query OpenAI GPT to get the 0-based index of the best answer.
 * Retries on transient failure with exponential backoff.
 * @param {string} question
 * @param {string[]} options
 * @param {number} maxRetries
 * @returns {Promise<number|null>} index or null if failed
 */
export async function getAnswerIndex(question, options, maxRetries = 3) {
  const prompt = `You are taking a multiple-choice quiz.
Question: ${question}
Options:
${options.map((o, i) => `${i}: ${o}`).join('\n')}
Return **only** the 0-based index of the correct answer. If unsure, guess.`;

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{
            role: "user",
            content: prompt
          }],
          temperature: 0.2,
          max_tokens: 30
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("Empty reply from OpenAI");

      // Try to extract first integer like 0,1,2...
      const intMatch = reply.match(/(\d+)/);
      if (intMatch) {
        const idx = parseInt(intMatch[1], 10);
        if (!isNaN(idx)) return idx;
      }

      // Fallback: letter A/B/C/D -> index
      const letterMatch = reply.match(/\b([A-D])\b/i);
      if (letterMatch) {
        const letter = letterMatch[1].toUpperCase();
        return letter.charCodeAt(0) - 'A'.charCodeAt(0);
      }

      // Could not parse; throw to trigger retry/fallback
      throw new Error(`Unparseable reply: "${reply}"`);
    } catch (err) {
      attempt += 1;
      const isLast = attempt > maxRetries;
      console.warn(`OpenAI attempt ${attempt} failed: ${err.message}${isLast ? '' : ', retrying...'}`);
      if (isLast) break;
      // exponential backoff with jitter
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 5000);
      await new Promise(r => setTimeout(r, backoff + Math.random() * 200));
    }
  }

  // Give up
  return null;
}
