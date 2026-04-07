// api/ocr.js
const { askAI } = require('./_lib/aiClient');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { base64, mimeType } = req.body || {};
  if (!base64 || !mimeType) return res.status(400).json({ error: 'base64 and mimeType required' });

  const prompt = `Analisis gambar ini dengan cermat. Ikuti salah satu format di bawah sesuai isi gambar:

== JIKA ada BANGUN GEOMETRI (segitiga, persegi, persegi panjang, lingkaran, trapesium, jajar genjang, belah ketupat, dll) dengan ukuran yang tertera (panjang, lebar, alas, tinggi, jari-jari, sisi, dll): ==
Balas PERSIS dengan format ini:

[GEOMETRI]
Bangun: <nama bangun>
Ukuran:
- <nama ukuran>: <nilai> <satuan>
(ulangi untuk semua ukuran)

Rumus:
- Luas: <rumus dengan simbol>
- Keliling: <rumus dengan simbol>

Perhitungan:
- Luas = <substitusi nilai> = <hasil> <satuan²>
- Keliling = <substitusi nilai> = <hasil> <satuan>

Kesimpulan:
Luas = <hasil> <satuan²>, Keliling = <hasil> <satuan>

== JIKA ada SOAL MATEMATIKA / FISIKA / KIMIA dengan angka dan pertanyaan: ==
Balas PERSIS dengan format ini:

[SOAL]
Diketahui:
- <data 1>
- <data 2>
Ditanya: <pertanyaan>
Penyelesaian:
<langkah 1>
<langkah 2>
Jawaban: <hasil akhir>

== JIKA HANYA berisi TEKS BIASA atau TULISAN TANGAN: ==
Ekstrak semua teks secara lengkap dan akurat. Jika ada tabel, gunakan | sebagai pemisah kolom.

Jangan tambahkan penjelasan di luar format yang diminta.`;

  try {
    const text = await askAI(prompt, { base64, mimeType });
    const trimmed = text.trimStart();
    const type = trimmed.startsWith('[GEOMETRI]') ? 'geometry'
               : trimmed.startsWith('[SOAL]')     ? 'math'
               : 'text';
    res.json({ text, type });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
