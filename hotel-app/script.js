/* ═══════════════════════════════════════════════════════════
   HOTEL MANAGER — script.js
   localStorage powered | APK / WebView Ready
   No frameworks, no dependencies
═══════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────
let currentUser  = null;
let authMode     = 'login';
let roomCount    = 1;
let currentTab   = 'new';

// Report/Records shared filter state
let recSearch    = '';
let recFDate     = '';
let recFMonth    = '';

// ── localStorage Helpers ───────────────────────────────────
function getUsers()    { try { return JSON.parse(localStorage.getItem('hms_users')    || '[]'); } catch { return []; } }
function saveUsers(u)  { localStorage.setItem('hms_users',    JSON.stringify(u)); }
function getBookings() { try { return JSON.parse(localStorage.getItem('hms_bookings') || '[]'); } catch { return []; } }
function saveBookings(b){ localStorage.setItem('hms_bookings', JSON.stringify(b)); }

// ── Utility ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function nights(ci, co) {
  const d = (new Date(co) - new Date(ci)) / 86400000;
  return (!isNaN(d) && d > 0) ? Math.round(d) : 0;
}

function flash(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + (ok ? 'success' : 'error');
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── Auth Mode ──────────────────────────────────────────────
function switchAuthMode(mode) {
  authMode = mode;
  $('loginToggle').classList.toggle('active',    mode === 'login');
  $('registerToggle').classList.toggle('active', mode === 'register');
  $('hotelNameWrap').classList.toggle('hidden',  mode === 'login');
  $('authSubmit').textContent = mode === 'login' ? 'Login →' : 'Create Account →';
  $('authError').classList.add('hidden');
}

function togglePw() {
  const inp = $('authPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── Auth Submit ────────────────────────────────────────────
function handleAuth() {
  const username  = $('authUsername').value.trim();
  const password  = $('authPassword').value;
  const hotelName = $('hotelName') ? $('hotelName').value.trim() : '';
  const errBox    = $('authError');

  const showErr = (msg) => {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  };

  if (authMode === 'register') {
    if (!hotelName || !username || !password) return showErr('Sab fields bharein!');
    if (password.length < 4) return showErr('Password kam se kam 4 characters ka hona chahiye!');
    const users = getUsers();
    if (users.find(u => u.username === username)) return showErr('Username pehle se exist karta hai!');
    const nu = { username, password, hotelName };
    saveUsers([...users, nu]);
    loginUser(nu);
  } else {
    if (!username || !password) return showErr('Username aur password dono bharein!');
    const user = getUsers().find(u => u.username === username && u.password === password);
    if (!user) return showErr('Username ya password galat hai!');
    loginUser(user);
  }
}

function loginUser(user) {
  currentUser = user;
  $('headerHotelName').textContent = user.hotelName || 'Hotel';
  $('authScreen').classList.remove('active');
  $('appScreen').classList.add('active');
  switchTab('new');
  renderRecords();
  updateReportStats();
}

function logout() {
  currentUser = null;
  $('appScreen').classList.remove('active');
  $('authScreen').classList.add('active');
  $('authUsername').value = '';
  $('authPassword').value = '';
  $('authError').classList.add('hidden');
}

// ── Tab Switching ──────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  ['new', 'records', 'report'].forEach(t => {
    $('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === tab);
    $('nav'  + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === tab);
  });
  if (tab === 'records') renderRecords();
  if (tab === 'report')  { syncFiltersToReport(); updateReportStats(); }
}

// ── Room Counter ───────────────────────────────────────────
function changeRooms(d) {
  roomCount = Math.max(1, roomCount + d);
  $('roomCount').textContent = roomCount;
}

// ── Nights Calculation ─────────────────────────────────────
function calcNights() {
  const ci = $('checkIn').value;
  const co = $('checkOut').value;
  const badge = $('nightsBadge');
  if (ci && co) {
    const n = nights(ci, co);
    if (n > 0) {
      badge.textContent = `🌙 ${n} Night(s) · ${roomCount} Room(s)`;
      badge.classList.remove('hidden');
      return;
    }
  }
  badge.classList.add('hidden');
}

// ── Save Booking ───────────────────────────────────────────
function saveBooking() {
  const name    = $('guestName').value.trim();
  const contact = $('guestContact').value.trim();
  const ci      = $('checkIn').value;
  const co      = $('checkOut').value;
  const notes   = $('guestNotes').value.trim();

  if (!name || !contact || !ci || !co)
    return flash('❌ Name, contact aur dates zaroor bharein!', false);
  if (ci >= co)
    return flash('❌ Checkout date check-in se baad honi chahiye!', false);

  const booking = {
    id:        Date.now(),
    name, contact,
    rooms:     roomCount,
    checkIn:   ci,
    checkOut:  co,
    notes,
    createdAt: new Date().toISOString(),
    hotelUser: currentUser.username
  };

  const all = getBookings();
  saveBookings([...all, booking]);

  // Reset form
  $('guestName').value    = '';
  $('guestContact').value = '';
  $('checkIn').value      = '';
  $('checkOut').value     = '';
  $('guestNotes').value   = '';
  roomCount = 1;
  $('roomCount').textContent = '1';
  $('nightsBadge').classList.add('hidden');

  flash('✅ Booking save ho gayi!');
}

// ── My Bookings ────────────────────────────────────────────
function myBookings() {
  return getBookings().filter(b => b.hotelUser === currentUser?.username);
}

// ── Filter Logic ───────────────────────────────────────────
function getFiltered(search, fDate, fMonth) {
  const q = (search || '').toLowerCase();
  return myBookings().filter(b => {
    const ms = !q ||
      b.name.toLowerCase().includes(q) ||
      b.contact.includes(q) ||
      b.checkIn.includes(q) ||
      b.checkOut.includes(q);
    const md = !fDate  || (b.checkIn <= fDate && b.checkOut >= fDate) || b.checkIn === fDate || b.checkOut === fDate;
    const mm = !fMonth || b.checkIn.startsWith(fMonth) || b.checkOut.startsWith(fMonth);
    return ms && md && mm;
  });
}

// ── Records Tab ────────────────────────────────────────────
function filterByDate() {
  recFDate  = $('filterDate').value;
  recFMonth = '';
  $('filterMonth').value = '';
  renderRecords();
}

function filterByMonth() {
  recFMonth = $('filterMonth').value;
  recFDate  = '';
  $('filterDate').value = '';
  renderRecords();
}

function clearFilters() {
  recSearch = recFDate = recFMonth = '';
  $('searchInput').value  = '';
  $('filterDate').value   = '';
  $('filterMonth').value  = '';
  renderRecords();
}

function renderRecords() {
  recSearch = $('searchInput')?.value || recSearch;
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  const total    = myBookings().length;
  const list     = $('recordsList');
  const countEl  = $('recordsCount');
  const clearBtn = $('clearFilterBtn');
  const expBtn   = $('exportBtn');

  countEl.textContent = `${filtered.length} / ${total} bookings`;
  clearBtn.classList.toggle('hidden', !recSearch && !recFDate && !recFMonth);
  expBtn.classList.toggle('hidden', filtered.length === 0);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">${total === 0 ? 'Abhi koi booking nahi hai' : 'Koi booking nahi mili'}</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map((b, i) => buildCard(b, i + 1)).join('');
}

function buildCard(b, idx) {
  const n = nights(b.checkIn, b.checkOut);
  return `
  <div class="booking-card" id="card_${b.id}" onclick="toggleCard(${b.id})">
    <div class="card-header">
      <div class="card-num">${idx}</div>
      <div class="card-main">
        <div class="card-name">${escHtml(b.name)}</div>
        <div class="card-sub">${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)} · ${n}N · ${b.rooms} room${b.rooms > 1 ? 's' : ''}</div>
      </div>
      <div class="card-arrow">▼</div>
    </div>
    <div class="card-body">
      <div class="card-details">
        <div class="detail-item"><div class="detail-label">📞 Contact</div><div class="detail-val">${escHtml(b.contact)}</div></div>
        <div class="detail-item"><div class="detail-label">🛏 Rooms</div><div class="detail-val">${b.rooms}</div></div>
        <div class="detail-item"><div class="detail-label">📅 Check-In</div><div class="detail-val">${fmtDate(b.checkIn)}</div></div>
        <div class="detail-item"><div class="detail-label">📅 Check-Out</div><div class="detail-val">${fmtDate(b.checkOut)}</div></div>
        <div class="detail-item"><div class="detail-label">🌙 Nights</div><div class="detail-val">${n}</div></div>
        <div class="detail-item"><div class="detail-label">📆 Booked On</div><div class="detail-val">${fmtDate(b.createdAt?.slice(0,10))}</div></div>
      </div>
      ${b.notes ? `<div class="card-notes"><div class="detail-label">📝 Notes</div><div class="detail-val">${escHtml(b.notes)}</div></div>` : ''}
      <button class="card-delete" onclick="event.stopPropagation(); deleteBooking(${b.id})">🗑 Delete Booking</button>
    </div>
  </div>`;
}

function toggleCard(id) {
  const card = $('card_' + id);
  if (card) card.classList.toggle('open');
}

function deleteBooking(id) {
  if (!confirm('Ye booking delete karna chahte ho?')) return;
  const updated = getBookings().filter(b => b.id !== id);
  saveBookings(updated);
  flash('🗑 Booking delete ho gayi');
  renderRecords();
  updateReportStats();
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Report Tab ─────────────────────────────────────────────
function syncReportFilter(type) {
  if (type === 'date') {
    recFDate  = $('reportDate').value;
    recFMonth = '';
    $('reportMonth').value = '';
  } else {
    recFMonth = $('reportMonth').value;
    recFDate  = '';
    $('reportDate').value = '';
  }
  // Also sync records tab filters
  $('filterDate').value  = recFDate;
  $('filterMonth').value = recFMonth;
  updateReportStats();
}

function syncFiltersToReport() {
  $('reportDate').value  = recFDate;
  $('reportMonth').value = recFMonth;
}

function clearReportFilter() {
  recFDate = recFMonth = '';
  $('reportDate').value  = '';
  $('reportMonth').value = '';
  $('filterDate').value  = '';
  $('filterMonth').value = '';
  updateReportStats();
}

function updateReportStats() {
  const filtered = getFiltered('', recFDate, recFMonth);
  const total    = myBookings().length;

  $('statBookings').textContent = filtered.length;
  $('statRooms').textContent    = filtered.reduce((a, b) => a + Number(b.rooms), 0);
  $('statNights').textContent   = filtered.reduce((a, b) => a + nights(b.checkIn, b.checkOut), 0);

  const noData = filtered.length === 0;
  $('downloadReportBtn').disabled = noData;
  $('downloadReportBtn').style.opacity = noData ? '0.4' : '1';
  $('reportHint').style.display = noData ? 'block' : 'none';

  // Preview
  const preview = $('reportPreview');
  if (filtered.length > 0) {
    preview.innerHTML = `<h3>Preview (${filtered.length} records):</h3>` +
      filtered.map((b, i) => buildCard(b, i + 1)).join('');
  } else {
    preview.innerHTML = '';
  }
}

// ── Export / Download SVG ──────────────────────────────────
function exportReport() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (filtered.length === 0) return flash('Koi record nahi mila!', false);

  const label = recFMonth
    ? `Month: ${recFMonth}`
    : recFDate
    ? `Date: ${fmtDate(recFDate)}`
    : 'All Bookings';

  const cols = ['#','Guest Name','Contact','Rooms','Check-In','Check-Out','Nights','Notes'];
  const colW = [28, 110, 90, 48, 80, 80, 48, 130];
  const W    = colW.reduce((a, b) => a + b, 0);
  const RH = 22, HH = 80, TH = 30;
  const H  = HH + TH + filtered.length * RH + 50;

  let hds = '', trs = '';
  cols.forEach((c, j) => {
    const x = colW.slice(0, j).reduce((a, b) => a + b, 0) + 6;
    hds += `<text x="${x}" y="${HH + 20}" font-family="monospace" font-size="10" font-weight="bold" fill="#f0c040">${c}</text>`;
  });

  filtered.forEach((b, i) => {
    const y   = HH + TH + i * RH;
    const row = [i+1, b.name, b.contact, b.rooms, fmtDate(b.checkIn), fmtDate(b.checkOut), nights(b.checkIn, b.checkOut), b.notes || '-'];
    trs += `<rect x="0" y="${y}" width="${W}" height="${RH}" fill="${i % 2 === 0 ? '#1a1a2e' : '#16213e'}"/>`;
    row.forEach((cell, j) => {
      const x   = colW.slice(0, j).reduce((a, b) => a + b, 0) + 6;
      const max = Math.floor(colW[j] / 5.8);
      const txt = String(cell).substring(0, max);
      trs += `<text x="${x}" y="${y + 15}" font-family="monospace" font-size="9.5" fill="#dde">${txt}</text>`;
    });
    trs += `<line x1="0" y1="${y + RH}" x2="${W}" y2="${y + RH}" stroke="#2a2a4a" stroke-width="0.4"/>`;
  });

  const hotelName = currentUser?.hotelName || 'Hotel';
  const totalRooms  = filtered.reduce((a, b) => a + Number(b.rooms), 0);
  const totalNights = filtered.reduce((a, b) => a + nights(b.checkIn, b.checkOut), 0);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#0f0f23"/>
<defs>
  <linearGradient id="hg" x1="0" y1="0" x2="${W}" y2="0">
    <stop offset="0%" stop-color="#12124a"/>
    <stop offset="100%" stop-color="#1a0d35"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${HH}" fill="url(#hg)"/>
<text x="${W/2}" y="22" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#f0c040" font-weight="bold">🏨 ${hotelName} — Booking Report</text>
<text x="${W/2}" y="40" text-anchor="middle" font-family="monospace" font-size="11" fill="#a0a0c0">${label}</text>
<text x="${W/2}" y="56" text-anchor="middle" font-family="monospace" font-size="9" fill="#606080">Generated: ${new Date().toLocaleString('en-IN')} | Bookings: ${filtered.length} | Rooms: ${totalRooms} | Nights: ${totalNights}</text>
<rect x="0" y="${HH}" width="${W}" height="${TH}" fill="#0a0a1f"/>
${hds}
<line x1="0" y1="${HH + TH}" x2="${W}" y2="${HH + TH}" stroke="#f0c040" stroke-width="1.5"/>
${trs}
<rect x="0" y="${HH + TH + filtered.length * RH}" width="${W}" height="50" fill="#0a0a1a"/>
<line x1="0" y1="${HH + TH + filtered.length * RH}" x2="${W}" y2="${HH + TH + filtered.length * RH}" stroke="#2a2a4a" stroke-width="1"/>
<text x="${W/2}" y="${HH + TH + filtered.length * RH + 22}" text-anchor="middle" font-family="monospace" font-size="9" fill="#505070">Total Records: ${filtered.length} | Total Rooms: ${totalRooms} | Total Nights: ${totalNights}</text>
<text x="${W/2}" y="${HH + TH + filtered.length * RH + 38}" text-anchor="middle" font-family="monospace" font-size="8" fill="#404060">Hotel Management System | ${hotelName}</text>
</svg>`;

  const fname = `booking-report-${recFMonth || recFDate || 'all'}-${Date.now()}.svg`;
  const blob  = new Blob([svg], { type: 'image/svg+xml' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
  flash('✅ Report download ho rahi hai!');
}

// ── Enter key on auth ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  $('authPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuth();
  });
  $('authUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') $('authPassword')?.focus();
  });
});
