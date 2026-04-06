// api/chat.js
const { askAI } = require('./_lib/aiClient');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, noteContext } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const ctx = noteContext
      ? `\nKonteks catatan aktif:\n${noteContext}\n`
      : '';
    const prompt = `Kamu adalah asisten belajar cerdas untuk pelajar SMK Indonesia. Jawab dalam Bahasa Indonesia, ringkas, jelas, dan mudah dipahami.${ctx}\nPertanyaan: ${message}`;

    const text = await askAI(prompt);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
