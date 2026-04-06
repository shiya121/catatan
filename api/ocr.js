// api/ocr.js
const { askAI } = require('./_lib/aiClient');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { base64, mimeType } = req.body || {};
  if (!base64 || !mimeType) return res.status(400).json({ error: 'base64 and mimeType required' });

  const prompt = `Ekstrak semua teks dari gambar ini secara lengkap dan akurat.
Jika ada rumus matematika, tulis dalam LaTeX ($ untuk inline, $$ untuk block).
Jika ada tabel, format sebagai teks terstruktur dengan | pemisah.
Jika tulisan tangan, transkripsi seakurat mungkin.
Balas HANYA dengan teks yang diekstrak, tanpa penjelasan tambahan.`;

  try {
    const text = await askAI(prompt, { base64, mimeType });
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
