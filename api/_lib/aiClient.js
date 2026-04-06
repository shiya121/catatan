// api/_lib/aiClient.js
// Round-robin Gemini keys + Groq fallback

const GEMINI_KEYS = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
  process.env.GEMINI_KEY_5,
].filter(Boolean);

// Model fallback chain (best → cheapest)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemma-3-27b-it',
];

// In-memory round-robin counter (per cold start instance)
let _keyIdx = 0;

async function callGemini(prompt, model, image) {
  if (!GEMINI_KEYS.length) return null;

  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    const key = GEMINI_KEYS[(_keyIdx + attempt) % GEMINI_KEYS.length];
    try {
      const parts = [];
      if (image) {
        parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
      }
      parts.push({ text: prompt });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
          }),
        }
      );

      // 429 = rate limit, 503 = overloaded → try next key
      if (res.status === 429 || res.status === 503) {
        console.warn(`Key ${attempt + 1} rate-limited on ${model}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Advance key index for next request (round-robin)
        _keyIdx = (_keyIdx + attempt + 1) % GEMINI_KEYS.length;
        return text;
      }
    } catch (e) {
      console.error(`Gemini key ${attempt + 1} error:`, e.message);
    }
  }
  return null;
}

async function callGroq(prompt) {
  if (!process.env.GROQ_KEY) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('Groq error:', e.message);
    return null;
  }
}

/**
 * Main entry: try Gemini models in order, fallback to Groq
 * @param {string} prompt
 * @param {object|null} image - { base64, mimeType }
 */
async function askAI(prompt, image = null) {
  for (const model of GEMINI_MODELS) {
    const result = await callGemini(prompt, model, image);
    if (result) return result;
  }
  const groq = await callGroq(prompt);
  if (groq) return groq;
  throw new Error('Semua AI provider gagal. Coba lagi nanti.');
}

module.exports = { askAI };
