# StudyAI 📚

Catatan cerdas dengan AI — siap deploy ke Vercel.

## 🚀 Deploy ke Vercel

### 1. Clone & Push ke GitHub
```bash
git init
git add .
git commit -m "init studyai"
# buat repo di github lalu:
git remote add origin https://github.com/username/studyai.git
git push -u origin main
```

### 2. Import di Vercel
- Buka [vercel.com](https://vercel.com) → New Project → Import dari GitHub
- Pilih repo ini

### 3. Set Environment Variables
Di Vercel Dashboard → Settings → Environment Variables, tambahkan:

| Key | Value |
|-----|-------|
| `GEMINI_KEY_1` | `AIza...` |
| `GEMINI_KEY_2` | `AIza...` |
| `GEMINI_KEY_3` | `AIza...` |
| `GEMINI_KEY_4` | `AIza...` |
| `GEMINI_KEY_5` | `AIza...` |
| `GROQ_KEY` | `gsk_...` |

### 4. Deploy → Done! 🎉

---

## 💻 Dev Lokal

```bash
npm i -g vercel
cp .env.example .env  # isi API keys
vercel dev            # buka http://localhost:3000
```

---

## 🤖 AI Fallback Chain
1. Gemini 2.5 Flash (5 key round-robin)
2. Gemini 2.5 Flash Lite
3. Gemma 3 27B
4. Groq (llama-3.3-70b-versatile)

## ✨ Fitur
- 📝 Editor catatan dengan berbagai jenis blok (teks, heading, kode, tabel, callout, flashcard)
- 📊 6 template tabel siap pakai
- 🎨 6 pilihan font (Outfit, Lora, Nunito, Poppins, Merriweather, Mono)
- 🏷️ Custom tag catatan
- 🎙️ Voice-to-text (Web Speech API, bahasa Indonesia)
- 🔍 OCR gambar/tulisan tangan → teks
- 🧠 Kuis AI dinamis dari catatan aktif
- 💬 AI Chat asisten belajar
- 📱 Responsive mobile + desktop
