/* ── StudyAI — app.js ──────────────────────────────── */

/* ── CONSTANTS ── */
const LS_NOTES    = 'studyai_notes_v3';
const LS_ACTIVE   = 'studyai_active_v3';
const LS_TAGS     = 'studyai_tags_v3';
const LS_SETTINGS = 'studyai_settings_v1';

const DEFAULT_SETTINGS = {
  accentColor:  '#7c3aed',
  accentHover:  '#6d28d9',
  bgColor:      '#020617',
  surfaceColor: '#0f172a',
  fontSize:     100,
  ttsLang:      'id-ID',
};

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
      { type: 'code', lang: 'html', content: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Judul</title>\n  </head>\n  <body>\n    <h1>Halo Dunia!</h1>\n  </body>\n</html>' },
      { type: 'callout', variant: 'info', content: 'DOCTYPE wajib di baris pertama agar browser render dalam mode standar.' },
    ]
  }
];

/* ── STATE ── */
const S = {
  notes:      JSON.parse(localStorage.getItem(LS_NOTES)  || 'null') || DEFAULT_NOTES,
  tags:       JSON.parse(localStorage.getItem(LS_TAGS)   || 'null') || DEFAULT_TAGS,
  activeId:   localStorage.getItem(LS_ACTIVE) || '1',
  settings:   JSON.parse(localStorage.getItem(LS_SETTINGS) || 'null') || { ...DEFAULT_SETTINGS },
  search:     '',
  addBlockOpen: false,
  chat:       { messages: [{ role: 'ai', text: 'Halo! Saya siap bantu belajar. Tanya apapun atau upload gambar catatan untuk diekstrak.' }], loading: false, input: '' },
  recording:  { active: false, transcript: '', finalText: '' },
  waveform:   [3,5,8,12,9,6,14,10,7,11,8,5],
  serverOnline: true,
  ttsPlaying: false,
  ttsUtterance: null,
};

/* ── HELPERS ── */
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function save()  {
  localStorage.setItem(LS_NOTES,    JSON.stringify(S.notes));
  localStorage.setItem(LS_ACTIVE,   S.activeId);
  localStorage.setItem(LS_TAGS,     JSON.stringify(S.tags));
  localStorage.setItem(LS_SETTINGS, JSON.stringify(S.settings));
}
function timeAgo(ts) { 
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'baru saja';
  if (d < 3600) return `${Math.floor(d/60)} mnt lalu`;
  if (d < 86400) return `${Math.floor(d/3600)} jam lalu`;
  return `${Math.floor(d/86400)} hr lalu`;
}
function activeNote() { return S.notes.find(n => n.id === S.activeId) || S.notes[0];  }
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── THEME ── */
function applyTheme(settings) {
  const r = document.documentElement.style;
  r.setProperty('--accent',       settings.accentColor  || '#7c3aed');
  r.setProperty('--accent-hover', settings.accentHover  || '#6d28d9');
  r.setProperty('--bg-main',      settings.bgColor      || '#020617');
  r.setProperty('--bg-surface',   settings.surfaceColor || '#0f172a');
  const fs = (settings.fontSize || 100);
  document.documentElement.style.fontSize = fs + '%';
}

/* ── SERVER HEALTH ── */
async function checkServerHealth() {
  const dot = document.getElementById('server-dot');
  const lbl = document.getElementById('server-lbl');
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    S.serverOnline = res.ok;
  } catch {
    S.serverOnline = false;
  }
  if (dot) dot.className = 'server-dot ' + (S.serverOnline ? 'online' : 'offline');
  if (lbl) lbl.textContent = S.serverOnline ? 'Server OK' : 'Offline';
}

/* ── MIND MAP SVG ── */
function renderMindMapSVG(data) {
  const branches = data.branches || [];
  const W = 560, H = Math.max(260, branches.length * 70 + 60);
  const cx = W / 2, cy = H / 2;
  const R_center = 42, R_branch = 30, R_leaf = 22;

  let paths = '', nodes = '';

  branches.forEach((branch, bi) => {
    const angle = (2 * Math.PI / branches.length) * bi - Math.PI / 2;
    const bx = cx + Math.cos(angle) * 150;
    const by = cy + Math.sin(angle) * 100;

    paths += `<path d="M${cx},${cy} L${bx},${by}" stroke="rgba(124,58,237,.3)" stroke-width="2"/>`;
    const bl = escHtml(branch.label || '');
    const blWrap = bl.length > 12 ? bl.slice(0,12)+'…' : bl;
    nodes += `<g transform="translate(${bx},${by})"><rect x="-${R_branch}" y="-${R_branch/1.5}" width="${R_branch*2}" height="${R_branch*1.5}" rx="6" fill="rgba(124,58,237,.15)" stroke="rgba(124,58,237,.4)"/><text y="4" text-anchor="middle" font-size="11" fill="#c4b5fd">${blWrap}</text></g>`;

    const children = branch.children || [];
    children.forEach((leaf, li) => {
      const leafAngle = angle + ((li - (children.length - 1) / 2) * 0.45);
      const lx = bx + Math.cos(leafAngle) * 110;
      const ly = by + Math.sin(leafAngle) * 65;
      paths += `<path d="M${bx},${by} L${lx},${ly}" stroke="rgba(99,102,241,.2)" stroke-width="1.5"/>`;
      const ll = escHtml(leaf || '');
      const llWrap = ll.length > 10 ? ll.slice(0,10)+'…' : ll;
      nodes += `<g transform="translate(${lx},${ly})"><rect x="-${R_leaf}" y="-${R_leaf/1.5}" width="${R_leaf*2}" height="${R_leaf*1.5}" rx="4" fill="rgba(15,23,42,.6)" stroke="rgba(99,102,241,.3)"/><text y="4" text-anchor="middle" font-size="9" fill="#94a3b8">${llWrap}</text></g>`;
    });
  });

  const centerLabel = escHtml(data.center || '');
  nodes += `<g transform="translate(${cx},${cy})"><circle r="${R_center}" fill="rgba(124,58,237,.15)" stroke="rgba(124,58,237,.5)"/><text y="5" text-anchor="middle" font-size="13" font-weight="700" fill="#e9d5ff">${centerLabel.length>14?centerLabel.slice(0,14)+'…':centerLabel}</text></g>`;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${paths}${nodes}</svg>`;
}

/* ── TTS ── */
let ttsAudio = null;
function speakNote() {
  const note = activeNote();
  if (!note) return;
  const text = noteToText(note);
  if (!text.trim()) return;

  if (S.ttsPlaying) { stopSpeaking(); return; }
  _speakViaBackend(text).catch(() => _speakViaBrowser(text));
}

async function _speakViaBackend(text) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 4000), lang: S.settings.ttsLang || 'id-ID' })
  });
  if (!res.ok) throw new Error('TTS backend failed');
  const data = await res.json();
  if (!data.audio) throw new Error('No audio data');

  const binary = atob(data.audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
  const url  = URL.createObjectURL(blob);
  ttsAudio   = new Audio(url);
  S.ttsPlaying = true;
  updateTTSBtn();
  ttsAudio.play();
  ttsAudio.onended = () => { S.ttsPlaying = false; updateTTSBtn(); URL.revokeObjectURL(url); };
}
 
function _speakViaBrowser(text) {
  if (!window.speechSynthesis) { alert('Browser tidak mendukung TTS.'); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = S.settings.ttsLang || 'id-ID';
  utt.rate = 0.95;
  S.ttsUtterance = utt;
  S.ttsPlaying = true;
  updateTTSBtn();
  utt.onend = () => { S.ttsPlaying = false; updateTTSBtn(); };
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  S.ttsPlaying = false;
  updateTTSBtn();
}

function updateTTSBtn() {
  const btn = document.getElementById('btn-tts');
  if (!btn) return;
  btn.classList.toggle('active', S.ttsPlaying);
  btn.title = S.ttsPlaying ? 'Hentikan pembacaan' : 'Baca catatan';
  btn.querySelector('.tts-lbl').textContent = S.ttsPlaying ? 'Hentikan' : 'Baca';
}

/* ── APPLY AI TO NOTE ── */
function applyAIToNote(msgIdx) {
  const msg = S.chat.messages[msgIdx];
  if (!msg || msg.role !== 'ai') return;
  const note = activeNote();
  if (!note) return;
  const text = msg.text.replace(/^(rangkuman|ringkasan|summary)[:\s]*/i, '').trim();
  note.blocks.push({ type: 'text', content: text });
  note.updatedAt = Date.now();
  save();
  renderEditor();
  const toast = document.createElement('div');
  toast.className = 'apply-toast';
  toast.textContent = '✅ Ditambahkan ke catatan';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}
window.applyAIToNote = applyAIToNote;

/* ── OPEN MIND MAP ── */
async function openMindMap() {
  const note = activeNote();
  if (!note) return;
  const content = noteToText(note);
  if (!content.trim()) { alert('Catatan masih kosong.'); return; }

  showModal(`
    <div class="modal-box">
      <div class="modal-header"><div class="modal-icon">🗺️</div><div><div class="modal-title">Peta Konsep</div><div class="modal-sub">Membuat dari catatan aktif... ✕</div></div><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body"><div class="quiz-loading"><div class="spinner"></div><p>AI sedang membuat peta konsep...</p></div></div>
    </div>
  `);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Buat peta konsep (mind map) dari catatan berikut dalam format JSON. Hanya balas JSON, tanpa teks lain, tanpa markdown fence.\nFormat: {"center":"TopikUtama","branches":[{"label":"Cabang1","children":["Daun1","Daun2"]},{"label":"Cabang2","children":["Daun3"]}]}\nMaksimal 6 cabang, masing-masing 3 daun. Bahasa Indonesia.\n\nCatatan:\n${content.slice(0, 2000)}`,
        noteContext: ''
      })
    });
    const data = await res.json();
    let raw = (data.text || '').trim();
    raw = raw.replace(/```json|```/g, '').trim();
    const mapData = JSON.parse(raw);

    showModal(`
      <div class="modal-box">
        <div class="modal-header"><div class="modal-icon">🗺️</div><div><div class="modal-title">Peta Konsep</div><div class="modal-sub">${escHtml(mapData.center)}</div></div><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="modal-body">
          ${renderMindMapSVG(mapData)}
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn-outline" onclick="closeModal()">Tutup</button>
            <button class="btn-purple" onclick="insertMindMapBlock(${JSON.stringify(mapData).replace(/"/g, '&quot;')})">Tambahkan ke Catatan</button>
          </div>
        </div>
      </div>
    `);

    window.insertMindMapBlock = function(mapDataJson) {
      const note = activeNote();
      if (!note) return;
      note.blocks.push({ type: 'mindmap', title: mapDataJson.center, mapData: mapDataJson });
      note.updatedAt = Date.now();
      save();
      renderEditor();
      closeModal();
    };
  } catch (e) {
    showModal(`
      <div class="modal-box">
        <div class="modal-header"><div class="modal-icon" style="background:#ef4444">⚠️</div><div><div class="modal-title">Gagal</div><div class="modal-sub">Gagal membuat peta konsep: ${e.message} ✕</div></div></div>
        <div class="modal-body"><button class="btn-outline" onclick="closeModal()">Tutup</button></div>
      </div>
    `);
  }
}
window.openMindMap = openMindMap;

/* ── SETTINGS MODAL ── */
function openSettings() {
  const s = S.settings;
  showModal(`
    <div class="modal-box">
      <div class="modal-header"><div class="modal-icon">⚙️</div><div><div class="modal-title">Pengaturan</div><div class="modal-sub">Kustomisasi tampilan secara langsung ✕</div></div><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body settings-body">
        <div class="setting-row"><span class="setting-label">Warna Aksen</span><div class="setting-color-row"><input type="color" id="set-accent" class="color-picker" value="${s.accentColor}"><div class="color-presets">${['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777'].map(c => `<div class="color-preset" data-color="${c}" style="background:${c}"></div>`).join('')}</div></div></div>
        <div class="setting-row"><span class="setting-label">Warna Background</span><div class="setting-color-row"><input type="color" id="set-bg" class="color-picker" value="${s.bgColor}"><div class="color-presets">${['#020617','#030712','#0f172a','#111827','#1a1a2e','#0d0d0d'].map(c => `<div class="color-preset" data-bg="${c}" style="background:${c}"></div>`).join('')}</div></div></div>
        <div class="setting-row"><span class="setting-label">Ukuran Teks — <span id="set-fs-lbl">${s.fontSize}%</span></span><input type="range" id="set-fontsize" class="setting-range" min="80" max="130" value="${s.fontSize}"></div>
        <div class="setting-row"><span class="setting-label">Bahasa TTS</span><select id="set-tts-lang" class="tbl-select" style="width:100%">${[['id-ID','Indonesia'],['en-US','English (US)'],['en-GB','English (UK)'],['ja-JP','日本語'],['ar-SA','عربي']].map(([v,l]) => `<option value="${v}" ${s.ttsLang===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="server-status-row"><span class="setting-label">Status Server</span><div style="margin-left:auto;display:flex;align-items:center;gap:8px"><span id="server-dot" class="server-dot ${S.serverOnline?'online':'offline'}"></span><span id="server-lbl">${S.serverOnline?'Server OK':'Offline — mode fallback aktif'}</span></div></div>
        <div style="display:flex;gap:8px;margin-top:4px"><button class="btn-outline" onclick="resetTheme()">Reset Default</button><button class="btn-purple" onclick="saveSettings()">Simpan & Tutup</button></div>
      </div>
    </div>
  `);

  document.getElementById('set-accent')?.addEventListener('input', e => {
    S.settings.accentColor = e.target.value;
    S.settings.accentHover = e.target.value;
    applyTheme(S.settings);
  });
  document.getElementById('set-bg')?.addEventListener('input', e => {
    S.settings.bgColor = e.target.value;
    applyTheme(S.settings);
  });
  document.getElementById('set-fontsize')?.addEventListener('input', e => {
    S.settings.fontSize = parseInt(e.target.value);
    document.getElementById('set-fs-lbl').textContent = e.target.value + '%';
    applyTheme(S.settings);
  });
  document.getElementById('set-tts-lang')?.addEventListener('change', e => {
    S.settings.ttsLang = e.target.value;
  });
  document.querySelectorAll('.color-preset[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.settings.accentColor = btn.dataset.color;
      S.settings.accentHover = btn.dataset.color;
      document.getElementById('set-accent').value = btn.dataset.color;
      applyTheme(S.settings);
    });
  });
  document.querySelectorAll('.color-preset[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.settings.bgColor = btn.dataset.bg;
      document.getElementById('set-bg').value = btn.dataset.bg;
      applyTheme(S.settings);
    });
  });
}
window.openSettings = openSettings;
window.saveSettings = function() { save(); closeModal(); };
window.resetTheme = function() {
  S.settings = { ...DEFAULT_SETTINGS };
  save(); applyTheme(S.settings); openSettings();
};

/* ── RENDER SIDEBAR ── */
function renderSidebar() {
  const q = S.search.toLowerCase().trim();
  const filtered = S.notes.filter(n => {
    if (!q) return true;
    if (n.title.toLowerCase().includes(q)) return true;
    if (n.tag.toLowerCase().includes(q)) return true;
    return n.blocks.some(b => {
      const texts = [b.content, b.front, b.back].filter(Boolean);
      if (texts.some(t => t.toLowerCase().includes(q))) return true;
      if (b.rows) return b.rows.some(row => row.some(c => String(c||'').toLowerCase().includes(q)));
      return false;
    });
  });
  const list = document.getElementById('note-list');
  if (!list) return;

  if (q && filtered.length === 0) {
    list.innerHTML = `<div class="search-empty"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg><p>Tidak ditemukan</p><small>Coba kata kunci lain</small></div>`;
  } else {
    list.innerHTML = filtered.map(n => {
      let matchHint = '';
      if (q) {
        if (!n.title.toLowerCase().includes(q) && n.tag.toLowerCase().includes(q)) {
          matchHint = `<span class="match-hint">tag: ${escHtml(n.tag)}</span>`;
        } else if (!n.title.toLowerCase().includes(q)) {
          const matchBlock = n.blocks.find(b => {
            const texts = [b.content, b.front, b.back].filter(Boolean);
            return texts.some(t => t.toLowerCase().includes(q)) || (b.rows && b.rows.some(row => row.some(c => String(c||'').toLowerCase().includes(q))));
          });
          if (matchBlock) {
            const snippet = (matchBlock.content || matchBlock.front || '').slice(0, 40);
            matchHint = `<span class="match-hint">...${escHtml(snippet)}...</span>`;
          }
        }
      }
      return `
        <div class="note-item ${n.id===S.activeId?'active':''}" data-id="${n.id}">
          <div class="note-item-top"><span class="note-tag">${escHtml(n.tag)}</span>${n.starred ? '<span class="note-star">★</span>' : ''}</div>
          <div class="note-title">${escHtml(n.title)}</div>
          ${matchHint}
          <div class="note-time"><span>🕒 ${timeAgo(n.updatedAt)}</span><button class="note-delete" data-del="${n.id}" title="Hapus">✕</button></div>
        </div>`;
    }).join('');
  }

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
      <button class="block-ctrl-btn up" data-move="${idx}" data-dir="-1">↑</button>
      <button class="block-ctrl-btn down" data-move="${idx}" data-dir="1">↓</button>
      <button class="block-ctrl-btn del" data-del-block="${idx}">✕</button>
    </div>`;

  if (block.type === 'heading') return `
    <div class="block-wrap"><div class="block-heading" data-block="${idx}" data-field="content" contenteditable="true" data-placeholder="Judul...">${escHtml(block.content)}</div>${controls}</div>`;

  if (block.type === 'text') return `
    <div class="block-wrap"><div class="block-text" data-block="${idx}" data-field="content" contenteditable="true" data-placeholder="Mulai menulis...">${escHtml(block.content)}</div>${controls}</div>`;

  if (block.type === 'code') return `
    <div class="block-wrap"><div class="block-code" data-block="${idx}" data-field="content" contenteditable="true">${escHtml(block.content)}</div>${controls}</div>`;

  if (block.type === 'table') {
    const rows = block.rows || [['Header 1','Header 2'],['Baris 1','Nilai 1']];
    const head = rows[0] || [];
    const body = rows.slice(1);
    return `
      <div class="block-wrap">
        <div class="block-table-wrap"><table class="block-table">
          <thead><tr>${head.map((h,ci) => `<th data-block="${idx}" data-field="rows" data-row="0" data-col="${ci}" contenteditable="true">${escHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${body.map((row,ri) => `<tr>${row.map((cell,ci) => `<td data-block="${idx}" data-field="rows" data-row="${ri+1}" data-col="${ci}" contenteditable="true">${escHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>${controls}
      </div>`;
  }

  if (block.type === 'callout') {
    const icons  = { tip:'💡', info:'ℹ️', warning:'⚠️' };
    const labels = { tip:'Tips', info:'Info', warning:'Perhatian' };
    return `
      <div class="block-wrap">
        <div class="block-callout ${block.variant||'tip'}"><span class="callout-icon">${icons[block.variant]||'📌'}</span><div><div class="callout-lbl">${labels[block.variant]||'Catatan'}</div><div class="callout-text" data-block="${idx}" data-field="content" contenteditable="true" data-placeholder="Tulis catatan...">${escHtml(block.content)}</div></div></div>${controls}
      </div>`;
  }

  if (block.type === 'flashcard') return `
    <div class="block-wrap">
      <div class="flashcard-wrap"><div class="flashcard-inner"><div class="flashcard-face front"><div class="fc-label">Pertanyaan</div><div class="fc-text">${escHtml(block.front)}</div><div class="fc-hint">Klik untuk lihat jawaban →</div></div><div class="flashcard-face back"><div class="fc-label">Jawaban</div><div class="fc-text">${escHtml(block.back)}</div><div class="fc-hint">← Klik untuk kembali</div></div></div></div>${controls}
    </div>`;

  if (block.type === 'ai-extract') return `
    <div class="block-wrap">
      <div class="block-ai-extract">
        <div class="ai-extract-label"><span>🤖</span> Diekstrak dari Gambar <button class="ai-extract-edit-btn" data-extract-copy="${idx}">Salin ke blok</button></div>
        <div class="ai-extract-text" data-block="${idx}" data-field="content" contenteditable="true">${escHtml(block.content)}</div>
      </div>${controls}
    </div>`;

  if (block.type === 'mindmap') {
    const mapData = block.mapData || { center: block.title || 'Topik', branches: [] };
    return `
      <div class="block-wrap">
        <div class="block-mindmap"><div class="mindmap-label"><span>🗺️</span> Peta Konsep — ${escHtml(mapData.center)}</div><div class="mindmap-canvas-wrap"><div class="mindmap-preview">${renderMindMapSVG(mapData)}</div></div></div>${controls}
      </div>`;
  }

  if (block.type === 'problem-solver') {
    const isGeometry = block.subtype === 'geometry';
    const icon = isGeometry ? '📐' : '🧮';
    const label = isGeometry ? 'Penyelesaian Geometri' : 'Penyelesaian Soal';
    const lines = (block.content || '').split('\n');
    const formatted = lines.map(l => {
      if (l.startsWith('Bangun:') || l.startsWith('Ditanya:') || l.startsWith('Jawaban:') || l.startsWith('Kesimpulan:')) return `<div class="solver-section">${escHtml(l)}</div>`;
      if (l.startsWith('Ukuran:') || l.startsWith('Rumus:') || l.startsWith('Perhitungan:') || l.startsWith('Diketahui:') || l.startsWith('Penyelesaian:')) return `<div class="solver-key">${escHtml(l)}</div>`;
      if (l.trim().startsWith('-')) return `<div class="solver-item">${escHtml(l)}</div>`;
      return l.trim() ? `<div class="solver-line">${escHtml(l)}</div>` : '<div class="solver-gap"></div>';
    }).join('');
    return `
      <div class="block-wrap">
        <div class="block-problem-solver"><div class="solver-label">${icon} ${label}</div><div class="solver-body">${formatted}</div></div>${controls}
      </div>`;
  }

  return '';
}

/* ── ADD BLOCK MENU ── */
const TABLE_TEMPLATES = [
  { label: 'Kosong',            cols: 2, rows: 3, headers: [] },
  { label: 'Label — Nilai',     cols: 2, rows: 4, headers: ['Label','Nilai'] },
  { label: '3 Kolom Umum',      cols: 3, rows: 4, headers: ['No','Nama','Keterangan'] },
  { label: 'Perbandingan A/B',  cols: 3, rows: 4, headers: ['Aspek','A','B'] },
  { label: 'Jadwal Pelajaran',  cols: 3, rows: 6, headers: ['Hari','Pelajaran','Jam'] },
  { label: 'OSI Layer',         cols: 4, rows: 8, headers: ['Layer','Nama','Protokol','Fungsi'] },
  { label: 'Nilai Siswa',       cols: 3, rows: 6, headers: ['Nama','Nilai','Keterangan'] },
];

function buildTableRows(cols, rows, headers) {
  const head = Array.from({length: cols}, (_,i) => headers[i] || `Kolom ${i+1}`);
  const body = Array.from({length: rows - 1}, () => Array(cols).fill(''));
  return [head, ...body];
}

function renderAddBlockMenu() {
  return `
    <div class="add-block-divider"><button class="add-block-toggle" id="add-block-btn">➕ Tambah blok</button></div>
    <div id="add-block-panel" class="${S.addBlockOpen?'':'hidden'}">
      <div class="add-block-strip">
        <button class="strip-item" data-add="heading"><span class="strip-icon">H</span><span class="strip-lbl">Judul</span></button>
        <button class="strip-item" data-add="text"><span class="strip-icon">T</span><span class="strip-lbl">Teks</span></button>
        <button class="strip-item" data-add="code"><span class="strip-icon">&lt;/&gt;</span><span class="strip-lbl">Kode</span></button>
        <button class="strip-item" data-add="callout-tip"><span class="strip-icon strip-icon-tip">●</span><span class="strip-lbl">Tips</span></button>
        <button class="strip-item" data-add="callout-info"><span class="strip-icon strip-icon-info">●</span><span class="strip-lbl">Info</span></button>
        <button class="strip-item" data-add="callout-warning"><span class="strip-icon strip-icon-warn">●</span><span class="strip-lbl">Warn</span></button>
        <button class="strip-item" data-add="flashcard"><span class="strip-icon">Q/A</span><span class="strip-lbl">Flash</span></button>
        <button class="strip-item" data-add="table-picker"><span class="strip-icon">▦</span><span class="strip-lbl">Tabel</span></button>
        <button class="strip-item" data-add="mindmap-ai"><span class="strip-icon">🗺️</span><span class="strip-lbl">Peta</span></button>
      </div>
      <div id="table-tpl-wrap" class="hidden">
        <div class="table-builder">
          <div class="table-builder-row">
            <div class="tbl-field"><span class="tbl-label">Tipe</span><select id="tbl-tpl-sel" class="tbl-select">${TABLE_TEMPLATES.map((t,i) => `<option value="${i}">${t.label}</option>`).join('')}</select></div>
            <div class="tbl-field"><span class="tbl-label">Kolom</span><div class="tbl-stepper"><button class="step-btn" data-step="cols" data-dir="-1">−</button><input type="number" id="tbl-cols" class="step-val" value="2" min="1" max="10"><button class="step-btn" data-step="cols" data-dir="1">+</button></div></div>
            <div class="tbl-field"><span class="tbl-label">Baris</span><div class="tbl-stepper"><button class="step-btn" data-step="rows" data-dir="-1">−</button><input type="number" id="tbl-rows" class="step-val" value="3" min="2" max="30"><button class="step-btn" data-step="rows" data-dir="1">+</button></div></div>
            <button id="tbl-create-btn" class="tbl-create-btn">Buat Tabel</button>
          </div>
          <div id="tbl-preview" class="tbl-preview"></div>
        </div>
      </div>
    </div>`;
}

/* ── RENDER EDITOR ── */
function renderEditor() {
  const note = activeNote();
  const inner = document.getElementById('editor-inner');
  if (!inner) return;
  if (!note) { inner.innerHTML = '<div style="padding:40px;text-align:center;color:#475569"><h3>Pilih atau buat catatan baru</h3></div>'; return; }

  inner.className = `font-${note.font||'outfit'}`;
  inner.innerHTML = `
    <div class="note-header">
      <div class="note-meta">
        <button id="tag-badge-btn" class="tag-badge">${escHtml(note.tag)}</button>
        <span class="note-ts">🕒 ${timeAgo(note.updatedAt)}</span>
        <button id="save-btn" class="save-btn">💾 Simpan</button>
      </div>
      <textarea id="note-title-input" class="note-title-input" placeholder="Judul Catatan..." rows="1">${escHtml(note.title)}</textarea>
    </div>
    <div class="font-toolbar">
      <label>Font:</label>
      <select id="font-select" class="font-select">${FONTS.map(f => `<option value="${f.value}" ${note.font===f.value?'selected':''}>${f.label}</option>`).join('')}</select>
      <button id="btn-tts" class="tts-btn"><span class="tts-lbl">Baca</span> 🎧</button>
    </div>
    <div id="blocks-container" class="blocks-container">${note.blocks.map((b,i) => renderBlock(b,i)).join('')}</div>
    <div class="add-block-wrap">${renderAddBlockMenu()}</div>
    <div class="upload-strip">
      <button id="btn-upload-img" class="upload-strip-btn">📷 Scan Gambar / Tulisan Tangan</button>
      <button id="btn-upload-math" class="upload-strip-btn math">📐 Scan Soal Matematika / Geometri</button>
    </div>
    <input type="file" id="file-input" class="hidden" accept="image/*">
  `;
  bindEditorEvents();
}

/* ── BIND EDITOR EVENTS ── */
function bindEditorEvents() {
  const note = activeNote();
  if (!note) return;

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

  const fontSel = document.getElementById('font-select'); 
  if (fontSel) fontSel.addEventListener('change', () => {
    note.font = fontSel.value;
    document.getElementById('editor-inner').className = `font-${note.font}`;
    save();
  });

  document.getElementById('save-btn')?.addEventListener('click', () => { save(); showSavedBadge(); });
  document.getElementById('tag-badge-btn')?.addEventListener('click', () => openTagModal());

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

  document.querySelectorAll('[data-row] [data-col]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = parseInt(el.dataset.block);
      const row = parseInt(el.dataset.row);
      const col = parseInt(el.dataset.col);
      const b = note.blocks[idx];
      if (b && b.rows) { b.rows[row][col] = el.textContent || ''; note.updatedAt = Date.now(); save(); }
    });
  });

  document.querySelectorAll('.flashcard-wrap').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('flipped'));
  });

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

  document.getElementById('add-block-btn')?.addEventListener('click', () => {
    S.addBlockOpen = !S.addBlockOpen; 
    document.getElementById('add-block-panel')?.classList.toggle('hidden', !S.addBlockOpen);
  });

  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add;
      if (type === 'table-picker') {
        document.getElementById('table-tpl-wrap')?.classList.toggle('hidden');
        return;
      }
      if (type === 'mindmap-ai') {
        S.addBlockOpen = false;
        document.getElementById('add-block-panel')?.classList.add('hidden');
        openMindMap();
        return;
      }
      addBlock(type);
      S.addBlockOpen = false;
      document.getElementById('add-block-panel')?.classList.add('hidden');
    });
  });

  const tplSel  = document.getElementById('tbl-tpl-sel');
  const colsInp = document.getElementById('tbl-cols');
  const rowsInp = document.getElementById('tbl-rows');

  function syncPreview() {
    const cols = Math.max(1, Math.min(10, parseInt(colsInp?.value)||2));
    const rows = Math.max(2, Math.min(30, parseInt(rowsInp?.value)||3));
    const tpl  = TABLE_TEMPLATES[parseInt(tplSel?.value)||0];
    const head = Array.from({length: cols}, (_,i) => tpl.headers[i] || `Kolom ${i+1}`);
    const prev = document.getElementById('tbl-preview');
    if (!prev) return;
    prev.innerHTML = `
      <table class="tbl-prev-table"><thead><tr>${head.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>${Array.from({length: rows-1}, () => `<tr>${Array(cols).fill('<td></td>').join('')}</tr>`).join('')}</tbody></table>
      <div class="tbl-prev-info">${cols} kolom × ${rows} baris (termasuk header)</div>
    `;
  }

  tplSel?.addEventListener('change', () => {
    const tpl = TABLE_TEMPLATES[parseInt(tplSel.value)||0];
    if (colsInp) colsInp.value = tpl.cols;
    if (rowsInp) rowsInp.value = tpl.rows;
    syncPreview();
  });
  colsInp?.addEventListener('input', syncPreview);
  rowsInp?.addEventListener('input', syncPreview);

  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.step;
      const inp = document.getElementById(`tbl-${target}`);
      if (!inp) return;
      const dir  = parseInt(btn.dataset.dir);
      const min  = target === 'cols' ? 1 : 2;
      const max  = target === 'cols' ? 10 : 30;
      inp.value  = Math.max(min, Math.min(max, (parseInt(inp.value)||2) + dir));
      syncPreview();
    });
  });

  document.getElementById('tbl-create-btn')?.addEventListener('click', () => {
    const note = activeNote();
    if (!note) return;
    const cols = Math.max(1, Math.min(10, parseInt(colsInp?.value)||2));
    const rows = Math.max(2, Math.min(30, parseInt(rowsInp?.value)||3));
    const tpl  = TABLE_TEMPLATES[parseInt(tplSel?.value)||0];
    note.blocks.push({ type: 'table', rows: buildTableRows(cols, rows, tpl.headers) });
    note.updatedAt = Date.now();
    save();
    S.addBlockOpen = false;
    renderEditor();
  });

  syncPreview();

  document.getElementById('btn-upload-img')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('btn-upload-math')?.addEventListener('click', () => document.getElementById('file-input').click());

  document.querySelectorAll('[data-extract-copy]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.extractCopy);
      const b = note.blocks[idx];
      if (!b) return;
      note.blocks.push({ type: 'text', content: b.content });
      note.updatedAt = Date.now();
      save();
      renderEditor();
    });
  });

  document.getElementById('btn-tts')?.addEventListener('click', speakNote);
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
  el.innerHTML = S.chat.messages.map((m, i) => {
    const isApplicable = m.role === 'ai' && i > 0 && (m.text.length > 60) && !m.text.startsWith('❌') && !m.text.startsWith('✅');
    return `
      <div class="chat-msg ${m.role}">
        <div class="chat-bubble ${m.role}">${escHtml(m.text)}</div>
        ${isApplicable ? `<button class="chat-apply-btn" onclick="applyAIToNote(${i})">✨ Apply ke catatan</button>` : ''}
      </div>
    `;
  }).join('');
  if (S.chat.loading) {
    el.innerHTML += `<div class="chat-msg"><div class="chat-bubble ai"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
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

  note.blocks.push({ type: 'text', content: '⏳ Menganalisis gambar...' });
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
    const rawText = data.text || '(tidak ada konten)';
    const ocrType = data.type || 'text';

    if (ocrType === 'geometry' || ocrType === 'math') {
      const cleanText = rawText.replace(/^\[(GEOMETRI|SOAL)\]\s*/i, '').trim();
      note.blocks[loadingIdx] = { type: 'problem-solver', subtype: ocrType, content: cleanText };
      S.chat.messages.push({ role: 'ai', text: `✅ ${ocrType === 'geometry' ? '📐 Bangun geometri terdeteksi!' : '🧮 Soal matematika terdeteksi!'} Penyelesaian sudah ditambahkan ke catatan.` });
    } else {
      note.blocks[loadingIdx] = { type: 'ai-extract', content: rawText };
      S.chat.messages.push({ role: 'ai', text: '✅ Teks berhasil diekstrak dan ditambahkan ke catatan.' });
    }
  } catch {
    note.blocks.splice(loadingIdx, 1);
    S.chat.messages.push({ role: 'ai', text: '❌ Gagal menganalisis gambar.' });
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

  showModal(`
    <div class="modal-box"><div class="modal-header"><div class="modal-icon">📝</div><div><div class="modal-title">Membuat Kuis ${escHtml(note.title)}</div></div></div><div class="modal-body"><div class="quiz-loading"><div class="spinner"></div><p>AI sedang membuat soal dari catatan ini...</p></div></div></div>
  `);

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
    showModal(`<div class="modal-box"><div class="modal-header"><div class="modal-icon" style="background:#ef4444">⚠️</div><div><div class="modal-title">Gagal</div><div class="modal-sub">Gagal generate soal: ${e.message} ✕</div></div></div><div class="modal-body"><button class="btn-outline" onclick="closeModal()">Tutup</button></div></div>`);
  }
}

function renderQuiz() {
  const { questions, idx, sel, submitted, score, done } = quizState;
  const note = activeNote();
  if (done) {
    const pct = Math.round(score / questions.length * 100);
    showModal(`
      <div class="modal-box"><div class="modal-header"><div class="modal-icon">🎯</div><div><div class="modal-title">Hasil Kuis ${escHtml(note?.title||'')}</div></div></div>
      <div class="modal-body"><div class="quiz-result"><div class="quiz-result-emoji">${score >= questions.length*0.7 ? '🎉' : '📚'}</div><div class="quiz-result-title">${score >= questions.length*0.7 ? 'Mantap!' : 'Terus Semangat!'}</div><div class="quiz-result-sub">Benar ${score} dari ${questions.length} soal</div><div class="quiz-score-ring">${pct}%</div><div class="quiz-result-btns"><button class="btn-outline" onclick="closeModal()">Tutup</button><button class="btn-purple" onclick="quizRetry()">Ulangi</button></div></div></div></div>
    `);
    if (score >= questions.length * 0.7) showConfetti();
    return;
  }

  const q = questions[idx];
  const letters = ['A','B','C','D'];
  showModal(`
    <div class="modal-box"><div class="modal-header"><div class="modal-icon">📝</div><div><div class="modal-title">Latihan Kuis ${escHtml(note?.title||'')}</div><div class="modal-sub">${idx+1}/${questions.length}</div></div></div>
    <div class="modal-body">
      <div class="quiz-progress-wrap"><div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${((idx+1)/questions.length)*100}%"></div></div><div class="quiz-counter">${idx+1}/${questions.length}</div></div>
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
        ${submitted ? (idx+1 >= questions.length ? `<button class="quiz-btn-confirm" onclick="quizNext()">Lihat Hasil</button>` : `<button class="quiz-btn-confirm" onclick="quizNext()">Selanjutnya</button>`) : `<button class="quiz-btn-confirm" onclick="quizConfirm()" ${sel===null?'disabled':''}>Konfirmasi Jawaban</button>`}
      </div>
    </div></div>
  `);
}

window.quizSelect = function(i) { if (quizState.submitted) return; quizState.sel = i; renderQuiz(); };
window.quizConfirm = function() { if (quizState.sel === null) return; quizState.submitted = true; if (quizState.sel === quizState.questions[quizState.idx].ans) quizState.score++; renderQuiz(); };
window.quizNext = function() { quizState.idx++; quizState.sel = null; quizState.submitted = false; if (quizState.idx >= quizState.questions.length) quizState.done = true; renderQuiz(); };
window.quizRetry = function() { quizState = { ...quizState, idx: 0, sel: null, submitted: false, score: 0, done: false }; renderQuiz(); };

/* ── TAG MODAL ── */
function openTagModal() {
  const note = activeNote();
  renderTagModal(note);
}
function renderTagModal(note) {
  showModal(`
    <div class="modal-box"><div class="modal-header"><div class="modal-icon">🏷️</div><div><div class="modal-title">Kelola Tag</div><div class="modal-sub">Tag aktif: ${escHtml(note.tag)}</div></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="tag-input-row"><input type="text" id="new-tag-input" class="tag-input" placeholder="Tambah tag baru..."><button class="btn-purple" onclick="addCustomTag()">+</button></div>
      <div class="tag-list-edit">
        ${S.tags.map(t => `<button class="tag-chip ${note.tag===t?'active':''}" onclick="selectTag('${escHtml(t)}')">${escHtml(t)}<span class="tag-chip-del" onclick="removeTag(event,'${escHtml(t)}')">×</span></button>`).join('')}
      </div>
      <button class="btn-outline" style="width:100%" onclick="closeModal()">Selesai</button>
    </div></div>
  `);
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
  S.notes.forEach(n => { if (n.tag === tag) n.tag = S.tags[0]; });
  save();
  const note = activeNote();
  renderTagModal(note);
};

/* ── MODAL SYSTEM ── */
let _modalOpen = false;
function showModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div id="modal-backdrop" class="modal-backdrop">${html}</div>`;
  _modalOpen = true;
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
function stopWave() { clearInterval(waveInterval); }

/* ── MOBILE CHAT SHEET ── */
function openMobileChat() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="mobile-sheet-backdrop" onclick="closeMobileChat()"></div>
    <div class="mobile-sheet"><div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="chat-header"><div class="chat-avatar">🤖</div><div><div class="chat-title">AI Asisten</div><div class="chat-status"><span class="status-dot"></span><span>Online</span></div></div></div>
      <div id="mobile-chat-messages" class="chat-messages"></div>
      <div class="chat-quick"><button class="quick-btn" data-q="Rangkum catatan ini">Rangkum</button><button class="quick-btn" data-q="Buat soal latihan">Soal latihan</button><button class="quick-btn" data-q="Jelaskan lebih detail">Jelaskan</button></div>
      <div class="chat-input-wrap">
        <button class="icon-btn-sm" onclick="document.getElementById('file-input').click()">📷</button>
        <div class="chat-input-box"><input type="text" id="mobile-chat-input" placeholder="Ketik pesan..."><button onclick="sendChat(document.getElementById('mobile-chat-input').value)">➤</button></div>
      </div>
    </div>
  `;
  renderChatMessages('mobile-chat-messages');
  setTimeout(() => document.getElementById('mobile-chat-input')?.focus(), 100);
}
window.closeMobileChat = function() { document.getElementById('modal-root').innerHTML = ''; };

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(S.settings);
  checkServerHealth();
  initSpeech();
  renderSidebar();
  renderEditor();
  renderChatMessages('chat-messages');

  document.getElementById('search-input')?.addEventListener('input', e => { S.search = e.target.value; renderSidebar(); });
  document.getElementById('btn-new-note')?.addEventListener('click', newNote);
  document.getElementById('btn-settings')?.addEventListener('click', openSettings);
  document.getElementById('btn-menu')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

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

  document.getElementById('btn-mic')?.addEventListener('click', () => S.recording.active ? stopRecording() : startRecording());
  document.getElementById('btn-quiz-header')?.addEventListener('click', openQuiz);
  document.getElementById('btn-send')?.addEventListener('click', () => sendChat(document.getElementById('chat-input').value));
  document.getElementById('chat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(e.target.value); });
  document.querySelectorAll('.quick-btn[data-q]').forEach(btn => btn.addEventListener('click', () => sendChat(btn.dataset.q)));
  document.getElementById('btn-ocr-chat')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input')?.addEventListener('change', e => { const file = e.target.files?.[0]; if (file) handleImage(file); });
  document.getElementById('nav-catatan')?.addEventListener('click', openSidebar);
  document.getElementById('nav-kuis')?.addEventListener('click', openQuiz);
  document.getElementById('nav-scan')?.addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('nav-chat')?.addEventListener('click', openMobileChat);

  /* ── KEYBOARD SHORTCUTS ── */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); showSavedBadge(); }
    if (e.key === 'Escape' && _modalOpen) closeModal();
    
    // ✅ FOCUS MODE: Ctrl + Shift + F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      document.getElementById('app').classList.toggle('app-focus');
    }
    
    // 🖨️ PRINT / PDF: Ctrl + Shift + P
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.print();
    }
  });
});