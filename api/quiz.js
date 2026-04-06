// api/quiz.js
const { askAI } = require('./_lib/aiClient');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { noteTitle, noteContent, count = 5 } = req.body || {};
  if (!noteContent) return res.status(400).json({ error: 'noteContent required' });

  const prompt = `Kamu adalah guru SMK Indonesia yang membuat soal kuis dari materi pelajaran.

Judul materi: "${noteTitle || 'Materi Belajar'}"
Isi materi:
${noteContent}

Buat tepat ${count} soal pilihan ganda dalam Bahasa Indonesia yang RELEVAN dengan materi di atas.
Setiap soal punya 4 opsi (A, B, C, D).

Balas HANYA dengan JSON array berikut, tanpa komentar, tanpa markdown fence:
[
  {
    "q": "Pertanyaan soal?",
    "opts": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
    "ans": 0,
    "exp": "Penjelasan singkat mengapa jawaban ini benar."
  }
]

ans adalah index dari opts yang benar (0=A, 1=B, 2=C, 3=D).`;

  try {
    const raw = await askAI(prompt);
    // Strip potential markdown fences
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    res.json({ questions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
