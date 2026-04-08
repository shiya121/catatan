// api/ocr.js
const { askAI } = require('./_lib/aiClient');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { base64, mimeType } = req.body || {};
  if (!base64 || !mimeType) return res.status(400).json({ error: 'base64 and mimeType required' });

  const prompt = `Anda adalah asisten OCR yang akurat. Ekstrak dan susun isi gambar sesuai aturan di bawah. JANGAN menambah atau mengurangi informasi.

== JIKA berisi SOAL MATEMATIKA/FISIKA/KIMIA: ==
Balas PERSIS dengan format berikut (gunakan Enter di setiap baris):
**[SOAL]**
<teks soal lengkap>

**Diketahui:**
- <data 1>
- <data 2>

**Ditanya:**
- <pertanyaan>

**Penyelesaian:**
1. <langkah 1>
2. <langkah 2>

**Jawaban:**
<jawaban akhir>

== JIKA berisi BANGUN GEOMETRI dengan ukuran: ==
Balas PERSIS dengan format berikut:
**[GEOMETRI]**
- Bangun: <jenis>
- Ukuran:
  - <ukuran 1>
  - <ukuran 2>
- Rumus: <rumus>
- Perhitungan:
  Luas = <proses> = <hasil>
  Keliling = <proses> = <hasil>
- Kesimpulan: Luas = <hasil>, Keliling = <hasil>

== JIKA HANYA TEKS/TABEL/TULISAN TANGAN: ==
Balas PERSIS dengan format berikut:
**[TEKS]**
<ekstrak teks lengkap. Jaga baris asli gambar. Gunakan | untuk pemisah kolom tabel.>

ATURAN PENTING:
1. Gunakan **tag tebal** di awal ([SOAL], [GEOMETRI], atau [TEKS]).
2. WAJIB gunakan Enter/baris baru antar poin. Jangan gabungkan jadi satu paragraf.
3. Hanya tampilkan apa yang terlihat di gambar. Jika ada data yang tidak jelas, tulis [tidak terbaca].`;

  try {
    const text = await askAI(prompt, { base64, mimeType });
    const trimmed = text.trimStart();
    const type = trimmed.includes('[GEOMETRI]') ? 'geometry'
              : trimmed.includes('[SOAL]')     ? 'math'
              : 'text';
    res.json({ text, type });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}