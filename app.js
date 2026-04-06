/* ── StudyAI — app.js ──────────────────────────────── */

/* ── CONSTANTS ── */
const LS_NOTES   = 'studyai_notes_v3';
const LS_ACTIVE  = 'studyai_active_v3';
const LS_TAGS    = 'studyai_tags_v3';

const FONTS = [
  { value: 'outfit',        label: 'Outfit (Default)' },
  { value: 'lora',          label: 'Lora (Serif)' },
  { value: 'nunito',        label: 'Nunito (Bulat)' },
  { value: 'poppins',       label: 'Poppins (Modern)' },
  { value: 'merriweather',  label: 'Merriweather (Editorial)' },
  { value: 'mono',          label: 'Mono (Kode)' },
];

const DEFAULT_TAGS = ['Jaringan', 'Web', 'Matematika', 'Bahasa', 'IPA', 'TKJ', 'Umum'];

const DEFAULT_NOTES = [
  {
    id: '1', title: 'OSI Layer — Jaringan Komputer', tag: 'Jaringan',
    starred: true, updatedAt: Date.now() - 7200000, font: 'outfit',
    blocks: [
      { type: 'heading', content: 'Apa itu OSI Model?' },
      { type: 'text', content: 'Model OSI (Open Systems Interconnection) adalah kerangka 7 lapisan untuk komunikasi antar perangkat jaringan secara terstandarisasi.' },
      { type: 'table', rows: [
        ['Layer','Nama','Protokol','Fungsi'],
        ['7','Application','HTTP, DNS, FTP','Antarmuka pengguna'],
        ['6','Presentation','SSL, JPEG','Enkripsi & format'],
        ['5','Session','NetBIOS','Kelola sesi'],
        ['4','Transport','TCP, UDP','Segmentasi data'],
        ['3','Network','IP, ICMP','Routing paket'],
        ['2','Data Link','Ethernet, MAC','Framing & error'],
        ['1','Physical','Kabel, WiFi','Sinyal & bit'],
      ]},
      { type: 'callout', variant: 'tip', content: "Mnemonik: 'Anak Pintar Selalu Tekun Nikmati Dua Pelajaran' (Application → Physical)" },
      { type: 'flashcard', front: 'Perbedaan TCP vs UDP?', back: 'TCP: connection-oriented, andal, lebih lambat. UDP: connectionless, cepat, cocok untuk streaming/game.' },
    ]
  },
  {
    id: '2', title: 'HTML & CSS — Web Dasar', tag: 'Web',
    starred: false, updatedAt: Date.now() - 86400000, font: 'outfit',
    blocks: [
      { type: 'heading', content: 'Struktur Dokumen HTML' },
      { type: 'text', content: 'HTML adalah bahasa markup standar untuk membangun halaman web.' },
      { type: 'code', lang: 'html', content: '<!DOCTYPE html>\n<html lang="id">\n  <head>\n    <meta charset="UTF-8">\n    <title>Halaman Web</title>\n  </head>\n  <body>\n    <h1>Halo Dunia!</h1>\n  </body>\n</html>' },
      { type: 'callout', variant: 'info', content: 'DOCTYPE wajib di baris pertama agar browser render dalam mode standar.' },
    ]
  }
];

/* ── STATE ── */
const S = {
  notes:    JSON.parse(localStorage.getItem(LS_NOTES)  || 'null') || DEFAULT_NOTES,
  tags:     JSON.parse(localStorage.getItem(LS_TAGS)   || 'null') || DEFAULT_TAGS,
  activeId: localStorage.getItem(LS_ACTIVE) || '1',
  search:   '',
  addBlockOpen: false,
  chat: { messages: [{ role: 'ai', text: 'Halo! Saya siap bantu belajar. Tanya apapun atau upload gambar catatan untuk diekstrak.' }], loading: false, input: '' },
  recording: { active: false, transcript: '', finalText: '' },
  waveform: [3,5,8,12,9,6,14,10,7,11,8,5],
};

/* ── HELPERS ── */
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function save()  {
  localStorage.setItem(LS_NOTES,  JSON.stringify(S.notes));
  localStorage.setItem(LS_ACTIVE, S.activeId);
  localStorage.setItem(LS_TAGS,   JSON.stringify(S.tags));
}
function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'baru saja';
  if (d < 3600) return `${Math.floor(d/60)} mnt lalu`;
  if (d < 86400) return `${Math.floor(d/3600)} jam lalu`;
  return `${Math.floor(d/86400)} hr lalu`;
}
function activeNote() { return S.notes.find(n => n.id === S.activeId) || S.notes[0]; }
function noteToText(note) {
  if (!note) return '';
  return note.blocks.map(b => {
    if (b.type === 'heading')   return `## ${b.content}`;
    if (b.type === 'text')      return b.content;
    if (b.type === 'code')      return '```\n' + b.content + '\n```';
    if (b.type === 'table')     return (b.rows||[]).map(r => r.join(' | ')).join('\n');
    if (b.type === 'callout')   return `[${b.variant}] ${b.content}`;
    if (b.type === 'flashcard') return `Q: ${b.front}\nA: ${b.back}`;
    if (b.type === 'ai-extract') return b.content;
    return '';
  }).filter(Boolean).join('\n\n');
}
function escHtml(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── RENDER SIDEBAR ── */
function renderSidebar() {
  const filtered = S.notes.filter(n => n.title.toLowerCase().includes(S.search.toLowerCase()));
  const list = document.getElementById('note-list');
  if (!list) return;
  list.innerHTML = filtered.map(n => `
    <div class="note-item ${n.id === S.activeId ? 'active' : ''}" data-id="${n.id}">
      <div class="note-item-top">
        <span class="note-tag">${escHtml(n.tag)}</span>
        ${n.starred ? '<span class="note-star">★</span>' : ''}
        <button class="note-delete" data-del="${n.id}" title="Hapus">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
      <div class="note-title">${escHtml(n.title)}</div>
      <div class="note-time">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${timeAgo(n.updatedAt)}
      </div>
    </div>
  `).join('');

  // stats
  const starred = S.notes.filter(n => n.starred).length;
  document.getElementById('sidebar-stats').innerHTML = `
    <div class="stat-box neutral"><div class="stat-num">${S.notes.length}</div><div class="stat-lbl">Catatan</div></div>
    <div class="stat-box violet"><div class="stat-num">${starred}</div><div class="stat-lbl">Favorit</div></div>
    <div class="stat-box amber"><div class="stat-num">${S.tags.length}</div><div class="stat-lbl">Tag</div></div>
  `;
}

/* ── RENDER BLOCK ── */
function renderBlock(block, idx) {
  const controls = `
    <div class="block-controls">
      <button class="block-ctrl-btn up" data-move="${idx}" data-dir="-1" title="Naik">↑</button>
      <button class="block-ctrl-btn down" data-move="${idx}" data-dir="1" title="Turun">↓</button>
      <button class="block-ctrl-btn" data-del-block="${idx}" title="Hapus">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;

  if (block.type === 'heading') return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="block-heading" contenteditable="true"
        data-placeholder="Heading..." data-block="${idx}" data-field="content"
        spellcheck="false">${escHtml(block.content)}</div>
    </div>`;

  if (block.type === 'text') return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="block-text" contenteditable="true"
        data-placeholder="Tulis sesuatu..." data-block="${idx}" data-field="content"
        spellcheck="false">${escHtml(block.content)}</div>
    </div>`;

  if (block.type === 'code') return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <pre class="block-code" contenteditable="true"
        data-block="${idx}" data-field="content"
        spellcheck="false">${escHtml(block.content)}</pre>
    </div>`;

  if (block.type === 'table') {
    const rows = block.rows || [['Header 1','Header 2'],['Baris 1','Nilai 1']];
    const head = rows[0] || [];
    const body = rows.slice(1);
    return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="block-table-wrap">
        <table class="block-table" data-block="${idx}">
          <thead><tr>${head.map((h,ci) => `<th contenteditable="true" data-block="${idx}" data-row="0" data-col="${ci}">${escHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${body.map((row,ri) => `<tr>${row.map((cell,ci) => `<td contenteditable="true" data-block="${idx}" data-row="${ri+1}" data-col="${ci}">${escHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  if (block.type === 'callout') {
    const icons = { tip:'💡', info:'ℹ️', warning:'⚠️' };
    const labels = { tip:'Tips', info:'Info', warning:'Perhatian' };
    return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="block-callout ${block.variant||'info'}">
        <span class="callout-icon">${icons[block.variant]||'📌'}</span>
        <div>
          <div class="callout-lbl">${labels[block.variant]||'Catatan'}</div>
          <div class="callout-text" contenteditable="true"
            data-block="${idx}" data-field="content">${escHtml(block.content)}</div>
        </div>
      </div>
    </div>`;
  }

  if (block.type === 'flashcard') return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="flashcard-wrap" data-fc="${idx}">
        <div class="flashcard-inner">
          <div class="flashcard-face front">
            <div class="fc-label">❓ Pertanyaan</div>
            <div class="fc-text">${escHtml(block.front)}</div>
            <div class="fc-hint">Klik untuk lihat jawaban →</div>
          </div>
          <div class="flashcard-face back">
            <div class="fc-label">✅ Jawaban</div>
            <div class="fc-text">${escHtml(block.back)}</div>
            <div class="fc-hint">← Klik untuk kembali</div>
          </div>
        </div>
      </div>
    </div>`;

  if (block.type === 'ai-extract') return `
    <div class="block-wrap" data-block-idx="${idx}">
      ${controls}
      <div class="block-ai-extract">
        <div class="ai-extract-label">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l2 2"/></svg>
          Diekstrak dari Gambar
        </div>
        <div class="ai-extract-text">${escHtml(block.content)}</div>
      </div>
    </div>`;

  return '';
}

/* ── ADD BLOCK MENU ── */
const TABLE_TEMPLATES = [
  { label: '2 Kolom (Label | Nilai)', rows: [['Label','Nilai'],['Item 1','Data 1'],['Item 2','Data 2']] },
  { label: '3 Kolom Umum', rows: [['No','Nama','Keterangan'],['1','',''],['2','','']] },
  { label: 'Perbandingan A vs B', rows: [['Aspek','A','B'],['Kecepatan','',''],['Keamanan','','']] },
  { label: 'Jadwal Pelajaran', rows: [['Hari','Pelajaran','Jam'],['Senin','',''],['Selasa','']] },
  { label: 'OSI Layer Style', rows: [['Layer','Nama','Protokol','Fungsi'],['7','Application','HTTP',''],['6','Presentation','SSL','']] },
  { label: 'Tabel Nilai Siswa', rows: [['Nama','Nilai','Keterangan'],['','',''],['','','']] },
];

function renderAddBlockMenu() {
  return `
    <div class="add-block-menu" id="add-block-menu">
      <button class="add-block-item" data-add="heading"><span>📌</span>Heading</button>
      <button class="add-block-item" data-add="text"><span>📝</span>Teks</button>
      <button class="add-block-item" data-add="code"><span>💻</span>Kode</button>
      <button class="add-block-item" data-add="callout-tip"><span>💡</span>Tips</button>
      <button class="add-block-item" data-add="callout-info"><span>ℹ️</span>Info</button>
      <button class="add-block-item" data-add="callout-warning"><span>⚠️</span>Peringatan</button>
      <button class="add-block-item" data-add="flashcard"><span>🃏</span>Flashcard</button>
      <button class="add-block-item" data-add="table-picker"><span>📊</span>Tabel...</button>
    </div>
    <div id="table-tpl-wrap" class="hidden" style="margin-top:8px;">
      <p style="font-size:11px;color:#64748b;margin-bottom:6px;">Pilih template tabel:</p>
      <div class="table-templates">
        ${TABLE_TEMPLATES.map((t,i) => `<button class="tpl-btn" data-tpl="${i}">${t.label}</button>`).join('')}
      </div>
    </div>`;
}

/* ── RENDER EDITOR ── */
function renderEditor() {
  const note = activeNote();
  const inner = document.getElementById('editor-inner');
  if (!inner) return;
  if (!note) { inner.innerHTML = '<p style="color:#475569;text-align:center;margin-top:60px;">Pilih atau buat catatan baru</p>'; return; }

  inner.className = `font-${note.font||'outfit'}`;
  inner.innerHTML = `
    <div class="note-header">
      <div class="note-meta">
        <span class="tag-badge" id="tag-badge-btn" title="Ubah tag">${escHtml(note.tag)}</span>
        <span class="note-ts">${timeAgo(note.updatedAt)}</span>
        <button class="save-btn" id="save-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Simpan
        </button>
      </div>
      <textarea id="note-title-input" class="note-title-input" rows="1"
        placeholder="Judul catatan...">${escHtml(note.title)}</textarea>
      <div class="font-toolbar">
        <label>Font:</label>
        <select class="font-select" id="font-select">
          ${FONTS.map(f => `<option value="${f.value}" ${note.font===f.value?'selected':''}>${f.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="blocks-container" id="blocks-container">
      ${note.blocks.map((b,i) => renderBlock(b,i)).join('')}
    </div>

    <div class="add-block-wrap">
      <button id="add-block-btn" class="add-block-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Tambah Blok
      </button>
      <div id="add-block-panel" class="${S.addBlockOpen ? '' : 'hidden'}">
        ${renderAddBlockMenu()}
      </div>
    </div>

    <div style="margin-top:18px;">
      <button id="btn-upload-img" class="add-block-btn" style="border-style:dashed;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
        Upload gambar / tulisan tangan → OCR ke teks
      </button>
    </div>
  `;
  bindEditorEvents();
}

/* ── BIND EDITOR EVENTS ── */
function bindEditorEvents() {
  const note = activeNote();
  if (!note) return;

  /* title */
  const titleEl = document.getElementById('note-title-input');
  if (titleEl) {
    autoResizeTextarea(titleEl);
    titleEl.addEventListener('input', () => {
      autoResizeTextarea(titleEl);
      note.title = titleEl.value;
      note.updatedAt = Date.now();
      save();
      renderSidebar();
    });
  }

  /* font */
  const fontSel = document.getElementById('font-select');
  if (fontSel) fontSel.addEventListener('change', () => {
    note.font = fontSel.value;
    document.getElementById('editor-inner').className = `font-${note.font}`;
    save();
  });

  /* save btn */
  document.getElementById('save-btn')?.addEventListener('click', () => {
    save();
    showSavedBadge();
  });

  /* tag badge */
  document.getElementById('tag-badge-btn')?.addEventListener('click', () => openTagModal());

  /* contenteditable blocks */
  document.querySelectorAll('[data-block][data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = parseInt(el.dataset.block);
      const field = el.dataset.field;
      const b = note.blocks[idx];
      if (b) { b[field] = el.textContent || el.innerText || ''; note.updatedAt = Date.now(); save(); }
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && el.classList.contains('block-heading')) {
        e.preventDefault();
        addBlock('text');
      }
    });
  });

  /* table cells */
  document.querySelectorAll('[data-row][data-col]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = parseInt(el.dataset.block);
      const row = parseInt(el.dataset.row);
      const col = parseInt(el.dataset.col);
      const b = note.blocks[idx];
      if (b && b.rows) { b.rows[row][col] = el.textContent || ''; note.updatedAt = Date.now(); save(); }
    });
  });

  /* flashcard flip */
  document.querySelectorAll('.flashcard-wrap').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('flipped'));
  });

  /* block delete */
  document.querySelectorAll('[data-del-block]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.delBlock);
      note.blocks.splice(idx, 1);
      note.updatedAt = Date.now();
      save();
      renderEditor();
    });
  });

  /* block move */
  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.move);
      const dir = parseInt(btn.dataset.dir);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= note.blocks.length) return;
      [note.blocks[idx], note.blocks[newIdx]] = [note.blocks[newIdx], note.blocks[idx]];
      note.updatedAt = Date.now();
      save();
      renderEditor();
    });
  });

  /* add block toggle */
  document.getElementById('add-block-btn')?.addEventListener('click', () => {
    S.addBlockOpen = !S.addBlockOpen;
    document.getElementById('add-block-panel')?.classList.toggle('hidden', !S.addBlockOpen);
  });

  /* add block items */
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add;
      if (type === 'table-picker') {
        document.getElementById('table-tpl-wrap')?.classList.toggle('hidden');
        return;
      }
      addBlock(type);
      S.addBlockOpen = false;
      document.getElementById('add-block-panel')?.classList.add('hidden');
    });
  });

  /* table templates */
  document.querySelectorAll('[data-tpl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = TABLE_TEMPLATES[parseInt(btn.dataset.tpl)];
      const note = activeNote();
      note.blocks.push({ type: 'table', rows: JSON.parse(JSON.stringify(tpl.rows)) });
      note.updatedAt = Date.now();
      save();
      S.addBlockOpen = false;
      renderEditor();
    });
  });

  /* upload img */
  document.getElementById('btn-upload-img')?.addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* ── ADD BLOCK ── */
function addBlock(type) {
  const note = activeNote();
  if (!note) return;
  let block;
  if (type === 'heading')           block = { type: 'heading', content: '' };
  else if (type === 'text')         block = { type: 'text', content: '' };
  else if (type === 'code')         block = { type: 'code', lang: 'text', content: '' };
  else if (type === 'flashcard')    block = { type: 'flashcard', front: 'Pertanyaan?', back: 'Jawaban.' };
  else if (type.startsWith('callout-')) {
    const variant = type.replace('callout-', '');
    block = { type: 'callout', variant, content: '' };
  } else block = { type: 'text', content: '' };
  note.blocks.push(block);
  note.updatedAt = Date.now();
  save();
  renderEditor();
  // focus last block
  setTimeout(() => {
    const all = document.querySelectorAll('#blocks-container [contenteditable]');
    if (all.length) { const last = all[all.length-1]; last.focus(); placeCaretAtEnd(last); }
  }, 50);
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/* ── SHOW SAVED BADGE ── */
function showSavedBadge() {
  const el = document.getElementById('saved-badge');
  if (!el) return;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1600);
}

/* ── NEW NOTE ── */
function newNote() {
  const n = {
    id: uid(), title: 'Catatan Baru', tag: S.tags[0] || 'Umum',
    starred: false, updatedAt: Date.now(), font: 'outfit',
    blocks: [{ type: 'heading', content: 'Judul' }, { type: 'text', content: '' }]
  };
  S.notes.unshift(n);
  S.activeId = n.id;
  S.addBlockOpen = false;
  save();
  renderSidebar();
  renderEditor();
  closeSidebar();
}

/* ── DELETE NOTE ── */
function deleteNote(id) {
  if (!confirm('Hapus catatan ini?')) return;
  S.notes = S.notes.filter(n => n.id !== id);
  if (S.activeId === id) S.activeId = S.notes[0]?.id || '';
  save();
  renderSidebar();
  renderEditor();
}

/* ── SIDEBAR OPEN/CLOSE ── */
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.remove('hidden'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.add('hidden'); }

/* ── CHAT ── */
function renderChatMessages(containerId = 'chat-messages') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = S.chat.messages.map(m => `
    <div class="chat-msg ${m.role}">
      <div class="chat-bubble ${m.role}">${escHtml(m.text)}</div>
    </div>`).join('');
  if (S.chat.loading) {
    el.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble ai"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  }
  el.scrollTop = el.scrollHeight;
}

async function sendChat(msgText) {
  const text = msgText || S.chat.input.trim();
  if (!text || S.chat.loading) return;
  S.chat.input = '';
  S.chat.messages.push({ role: 'user', text });
  S.chat.loading = true;
  renderChatMessages('chat-messages');
  renderChatMessages('mobile-chat-messages');
  const inp1 = document.getElementById('chat-input');
  const inp2 = document.getElementById('mobile-chat-input');
  if (inp1) inp1.value = '';
  if (inp2) inp2.value = '';

  try {
    const note = activeNote();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, noteContext: noteToText(note).slice(0, 2000) })
    });
    const data = await res.json();
    S.chat.messages.push({ role: 'ai', text: data.text || 'Tidak bisa menjawab saat ini.' });
  } catch {
    S.chat.messages.push({ role: 'ai', text: '❌ Gagal terhubung ke AI. Coba lagi.' });
  }
  S.chat.loading = false;
  renderChatMessages('chat-messages');
  renderChatMessages('mobile-chat-messages');
}

/* ── OCR ── */
async function handleImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const note = activeNote();
  if (!note) return;

  // show loading block
  note.blocks.push({ type: 'text', content: '⏳ Mengekstrak teks dari gambar...' });
  const loadingIdx = note.blocks.length - 1;
  note.updatedAt = Date.now();
  renderEditor();

  S.chat.messages.push({ role: 'user', text: `📎 Mengunggah: ${file.name}` });
  renderChatMessages('chat-messages');
  renderChatMessages('mobile-chat-messages');

  try {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType: file.type })
    });
    const data = await res.json();
    note.blocks[loadingIdx] = { type: 'ai-extract', content: data.text || '(tidak ada teks)' };
    S.chat.messages.push({ role: 'ai', text: '✅ Teks berhasil diekstrak dan ditambahkan ke catatan.' });
  } catch {
    note.blocks.splice(loadingIdx, 1);
    S.chat.messages.push({ role: 'ai', text: '❌ Gagal mengekstrak teks dari gambar.' });
  }
  note.updatedAt = Date.now();
  save();
  renderEditor();
  renderChatMessages('chat-messages');
  renderChatMessages('mobile-chat-messages');
  document.getElementById('file-input').value = '';
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ── QUIZ MODAL ── */
let quizState = { questions: [], idx: 0, sel: null, submitted: false, score: 0, done: false };

async function openQuiz() {
  const note = activeNote();
  if (!note) return;
  const content = noteToText(note);
  if (!content.trim()) { alert('Catatan masih kosong, tambahkan konten dulu.'); return; }

  // show loading modal
  showModal(`
    <div class="modal-header">
      <div class="modal-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <div><div class="modal-title">Membuat Kuis</div><div class="modal-sub">${escHtml(note.title)}</div></div>
      <button class="modal-close" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="quiz-loading">
        <div class="spinner"></div>
        <p style="font-size:13px;color:#64748b">AI sedang membuat soal dari catatan ini...</p>
      </div>
    </div>`);

  try {
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteTitle: note.title, noteContent: content.slice(0, 3000), count: 5 })
    });
    const data = await res.json();
    if (!data.questions?.length) throw new Error('Gagal parse soal');
    quizState = { questions: data.questions, idx: 0, sel: null, submitted: false, score: 0, done: false };
    renderQuiz();
  } catch (e) {
    showModal(`<div class="modal-header"><div class="modal-icon">⚠️</div><div><div class="modal-title">Gagal</div></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body"><p style="color:#f87171;font-size:13px">Gagal generate soal: ${e.message}</p><br><button class="btn-purple" onclick="closeModal()">Tutup</button></div>`);
  }
}

function renderQuiz() {
  const { questions, idx, sel, submitted, score, done } = quizState;
  const note = activeNote();
  if (done) {
    const pct = Math.round(score / questions.length * 100);
    showModal(`
      <div class="modal-header">
        <div class="modal-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <div><div class="modal-title">Hasil Kuis</div><div class="modal-sub">${escHtml(note?.title||'')}</div></div>
        <button class="modal-close" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="quiz-result">
          <div class="quiz-result-emoji">${score >= questions.length*0.7 ? '🎉' : '📚'}</div>
          <div class="quiz-result-title">${score >= questions.length*0.7 ? 'Mantap!' : 'Terus Semangat!'}</div>
          <div class="quiz-result-sub">Benar ${score} dari ${questions.length} soal</div>
          <div class="quiz-score-ring">${pct}%</div>
          <div class="quiz-result-btns">
            <button class="btn-outline" onclick="closeModal()">Tutup</button>
            <button class="btn-purple" onclick="quizRetry()">Ulangi</button>
          </div>
        </div>
      </div>`);
    if (score >= questions.length * 0.7) showConfetti();
    return;
  }

  const q = questions[idx];
  const letters = ['A','B','C','D'];
  showModal(`
    <div class="modal-header">
      <div class="modal-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
      <div class="flex-1"><div class="modal-title">Latihan Kuis</div><div class="modal-sub">${escHtml(note?.title||'')}</div></div>
      <button class="modal-close" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="quiz-progress-wrap">
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(idx/questions.length)*100}%"></div></div>
        <span class="quiz-counter">${idx+1}/${questions.length}</span>
      </div>
      <div class="quiz-q">${escHtml(q.q)}</div>
      <div class="quiz-opts">
        ${q.opts.map((opt,i) => {
          let cls = '';
          if (submitted && i === q.ans) cls = 'correct';
          else if (submitted && i === sel) cls = 'wrong';
          else if (i === sel) cls = 'selected';
          const icon = submitted && i === q.ans ? '✓' : submitted && i === sel ? '✗' : letters[i];
          return `<button class="quiz-opt ${cls}" onclick="quizSelect(${i})" ${submitted?'disabled':''}><span class="opt-letter">${icon}</span><span class="opt-text">${escHtml(opt)}</span></button>`;
        }).join('')}
      </div>
      ${submitted ? `<div class="quiz-exp"><b>Penjelasan:</b> ${escHtml(q.exp)}</div>` : ''}
      <div class="quiz-actions">
        <button class="quiz-btn-confirm" onclick="${submitted ? 'quizNext()' : 'quizConfirm()'}" ${!submitted && sel===null ? 'disabled' : ''}>
          ${submitted ? (idx+1 >= questions.length ? '<span>Lihat Hasil</span>' : '<span>Selanjutnya</span> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>') : '<span>Konfirmasi Jawaban</span>'}
        </button>
      </div>
    </div>`);
}

window.quizSelect = function(i) {
  if (quizState.submitted) return;
  quizState.sel = i;
  renderQuiz();
};
window.quizConfirm = function() {
  if (quizState.sel === null) return;
  quizState.submitted = true;
  if (quizState.sel === quizState.questions[quizState.idx].ans) quizState.score++;
  renderQuiz();
};
window.quizNext = function() {
  quizState.idx++;
  quizState.sel = null;
  quizState.submitted = false;
  if (quizState.idx >= quizState.questions.length) quizState.done = true;
  renderQuiz();
};
window.quizRetry = function() {
  quizState = { ...quizState, idx: 0, sel: null, submitted: false, score: 0, done: false };
  renderQuiz();
};

/* ── TAG MODAL ── */
function openTagModal() {
  const note = activeNote();
  renderTagModal(note);
}
function renderTagModal(note) {
  showModal(`
    <div class="modal-header">
      <div class="modal-icon">🏷️</div>
      <div><div class="modal-title">Kelola Tag</div><div class="modal-sub">Tag aktif: ${escHtml(note.tag)}</div></div>
      <button class="modal-close" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="tag-input-row">
        <input class="tag-input" id="new-tag-input" placeholder="Buat tag baru..." maxlength="20"/>
        <button class="btn-purple" onclick="addCustomTag()">Tambah</button>
      </div>
      <p style="font-size:11px;color:#475569;margin-bottom:8px;">Pilih tag untuk catatan ini:</p>
      <div class="tag-list-edit" id="tag-list-edit">
        ${S.tags.map(t => `
          <div class="tag-chip ${t===note.tag?'active':''}" onclick="selectTag('${escHtml(t)}')">
            ${escHtml(t)}
            <button class="tag-chip-del" onclick="removeTag(event,'${escHtml(t)}')" title="Hapus tag">×</button>
          </div>`).join('')}
      </div>
      <button class="btn-outline" style="width:100%;margin-top:4px;" onclick="closeModal()">Selesai</button>
    </div>`);
  document.getElementById('new-tag-input')?.addEventListener('keydown', e => { if (e.key==='Enter') addCustomTag(); });
}

window.addCustomTag = function() {
  const inp = document.getElementById('new-tag-input');
  const val = inp?.value.trim();
  if (!val || S.tags.includes(val)) return;
  S.tags.push(val);
  save();
  const note = activeNote();
  renderTagModal(note);
};
window.selectTag = function(tag) {
  const note = activeNote();
  note.tag = tag;
  note.updatedAt = Date.now();
  save();
  renderSidebar();
  renderEditor();
  closeModal();
};
window.removeTag = function(e, tag) {
  e.stopPropagation();
  if (S.tags.length <= 1) return;
  S.tags = S.tags.filter(t => t !== tag);
  // update notes using this tag
  S.notes.forEach(n => { if (n.tag === tag) n.tag = S.tags[0]; });
  save();
  const note = activeNote();
  renderTagModal(note);
};

/* ── MODAL SYSTEM ── */
let _modalOpen = false;
function showModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal-box">${html}</div></div>`;
  _modalOpen = true;
  // Close on backdrop click
  document.getElementById('modal-backdrop')?.addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
}
window.closeModal = function() {
  document.getElementById('modal-root').innerHTML = '';
  _modalOpen = false;
};

/* ── CONFETTI ── */
function showConfetti() {
  const colors = ['#8b5cf6','#22c55e','#f59e0b','#ec4899','#06b6d4'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    Object.assign(el.style, {
      left: Math.random()*100 + '%',
      top: '-20px',
      width: (Math.random()*8+4) + 'px',
      height: (Math.random()*12+6) + 'px',
      background: colors[Math.floor(Math.random()*colors.length)],
      animationDuration: (Math.random()*1.5+2) + 's',
      animationDelay: Math.random() + 's',
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

/* ── SPEECH RECOGNITION ── */
let recognition = null;
let finalTranscript = '';
let waveInterval = null;

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.lang = 'id-ID';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = e => {
    let interim = '';
    finalTranscript = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += t + ' ';
      else interim += t;
    }
  };

  recognition.onend = () => {
    if (!S.recording.active) {
      // insert text to note
      if (finalTranscript.trim()) {
        const note = activeNote();
        if (note) {
          note.blocks.push({ type: 'text', content: finalTranscript.trim() });
          note.updatedAt = Date.now();
          save();
          renderEditor();
        }
      }
      finalTranscript = '';
      stopWave();
    } else {
      // restart if still recording
      try { recognition.start(); } catch {}
    }
  };
}

function startRecording() {
  if (!recognition) { alert('Browser tidak mendukung Speech Recognition. Gunakan Chrome.'); return; }
  finalTranscript = '';
  S.recording.active = true;
  try { recognition.start(); } catch {}
  const micBtn = document.getElementById('btn-mic');
  const inner  = document.getElementById('dictation-inner');
  const hint   = document.getElementById('dictation-hint');
  const wave   = document.getElementById('waveform-wrap');
  micBtn?.classList.add('recording');
  inner?.classList.add('recording');
  hint?.classList.add('hidden');
  wave?.classList.remove('hidden');
  startWave();
}
function stopRecording() {
  S.recording.active = false;
  try { recognition.stop(); } catch {}
  const micBtn = document.getElementById('btn-mic');
  const inner  = document.getElementById('dictation-inner');
  const hint   = document.getElementById('dictation-hint');
  const wave   = document.getElementById('waveform-wrap');
  micBtn?.classList.remove('recording');
  inner?.classList.remove('recording');
  hint?.classList.remove('hidden');
  wave?.classList.add('hidden');
}

function startWave() {
  const wf = document.getElementById('waveform');
  if (!wf) return;
  wf.innerHTML = Array.from({length:14}).map(() => '<div class="wave-bar"></div>').join('');
  waveInterval = setInterval(() => {
    wf.querySelectorAll('.wave-bar').forEach(b => {
      b.style.height = (Math.floor(Math.random()*14)+3)*2 + 'px';
    });
  }, 120);
}
function stopWave() {
  clearInterval(waveInterval);
}

/* ── MOBILE CHAT SHEET ── */
function openMobileChat() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="mobile-sheet-backdrop" onclick="closeMobileChat()"></div>
    <div class="mobile-sheet">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="chat-header">
        <div class="chat-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div><p class="chat-title">AI Asisten</p><div class="chat-status"><div class="status-dot"></div><span>Online</span></div></div>
        <button class="modal-close" onclick="closeMobileChat()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div id="mobile-chat-messages" class="chat-messages" style="flex:1;min-height:200px;"></div>
      <div class="chat-quick">
        <button class="quick-btn" onclick="sendChat('Rangkum catatan ini')">Rangkum</button>
        <button class="quick-btn" onclick="sendChat('Buat soal latihan')">Soal latihan</button>
        <button class="quick-btn" onclick="sendChat('Jelaskan lebih lanjut')">Jelaskan</button>
      </div>
      <div class="chat-input-wrap">
        <button class="icon-btn-sm" onclick="document.getElementById('file-input').click()" title="Upload gambar OCR">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
        <div class="chat-input-box">
          <input id="mobile-chat-input" type="text" placeholder="Tanya sesuatu..." autocomplete="off"
            onkeydown="if(event.key==='Enter')sendChat(this.value)"/>
          <button onclick="sendChat(document.getElementById('mobile-chat-input').value)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  renderChatMessages('mobile-chat-messages');
  setTimeout(() => document.getElementById('mobile-chat-input')?.focus(), 100);
}
window.closeMobileChat = function() {
  document.getElementById('modal-root').innerHTML = '';
};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initSpeech();
  renderSidebar();
  renderEditor();
  renderChatMessages('chat-messages');

  /* Search */
  document.getElementById('search-input')?.addEventListener('input', e => {
    S.search = e.target.value;
    renderSidebar();
  });

  /* New note */
  document.getElementById('btn-new-note')?.addEventListener('click', newNote);

  /* Sidebar toggle (mobile) */
  document.getElementById('btn-menu')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  /* Note list clicks (delegation) */
  document.getElementById('note-list')?.addEventListener('click', e => {
    const item = e.target.closest('.note-item');
    const del  = e.target.closest('.note-delete');
    if (del) { deleteNote(del.dataset.del); return; }
    if (item) {
      S.activeId = item.dataset.id;
      S.addBlockOpen = false;
      localStorage.setItem(LS_ACTIVE, S.activeId);
      renderSidebar();
      renderEditor();
      closeSidebar();
    }
  });

  /* Mic button */
  document.getElementById('btn-mic')?.addEventListener('click', () => {
    S.recording.active ? stopRecording() : startRecording();
  });

  /* Quiz header button */
  document.getElementById('btn-quiz-header')?.addEventListener('click', openQuiz);

  /* Chat desktop */
  document.getElementById('btn-send')?.addEventListener('click', () => {
    sendChat(document.getElementById('chat-input').value);
  });
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat(e.target.value);
  });
  document.querySelectorAll('.quick-btn[data-q]').forEach(btn => {
    btn.addEventListener('click', () => sendChat(btn.dataset.q));
  });
  document.getElementById('btn-ocr-chat')?.addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  /* File input */
  document.getElementById('file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  });

  /* Mobile nav */
  document.getElementById('nav-catatan')?.addEventListener('click', openSidebar);
  document.getElementById('nav-kuis')?.addEventListener('click', openQuiz);
  document.getElementById('nav-scan')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('nav-chat')?.addEventListener('click', openMobileChat);

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); showSavedBadge(); }
    if (e.key === 'Escape' && _modalOpen) closeModal();
  });
});
