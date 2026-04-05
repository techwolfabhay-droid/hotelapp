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

  $('statBookings').textContent = filtered.length;
  $('statRooms').textContent    = filtered.reduce((a, b) => a + Number(b.rooms), 0);
  $('statNights').textContent   = filtered.reduce((a, b) => a + nights(b.checkIn, b.checkOut), 0);

  const noData = filtered.length === 0;
  $('downloadReportBtn').disabled = noData;
  $('downloadReportBtn').style.opacity = noData ? '0.4' : '1';
  $('reportHint').style.display = noData ? 'block' : 'none';

  const preview = $('reportPreview');
  if (filtered.length > 0) {
    preview.innerHTML = `<h3>Preview (${filtered.length} records):</h3>` +
      filtered.map((b, i) => buildCard(b, i + 1)).join('');
  } else {
    preview.innerHTML = '';
  }
}

// ── Build HTML Report String ───────────────────────────────
function buildReportHTML() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  const hotelName   = currentUser?.hotelName || 'Hotel';
  const label       = recFMonth
    ? `Month: ${recFMonth}`
    : recFDate
    ? `Date: ${fmtDate(recFDate)}`
    : 'All Bookings';
  const totalRooms  = filtered.reduce((a, b) => a + Number(b.rooms), 0);
  const totalNights = filtered.reduce((a, b) => a + nights(b.checkIn, b.checkOut), 0);
  const generated   = new Date().toLocaleString('en-IN');

  const rows = filtered.map((b, i) => {
    const n = nights(b.checkIn, b.checkOut);
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(b.name)}</td>
      <td>${escHtml(b.contact)}</td>
      <td>${b.rooms}</td>
      <td>${fmtDate(b.checkIn)}</td>
      <td>${fmtDate(b.checkOut)}</td>
      <td>${n}</td>
      <td>${escHtml(b.notes || '—')}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:Arial,sans-serif;color:#111;max-width:900px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#0f0f2a,#1a0d35);color:#f0c040;padding:24px 20px;border-radius:8px 8px 0 0;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🏨</div>
      <div style="font-size:20px;font-weight:700;font-family:Georgia,serif;letter-spacing:1px;">${escHtml(hotelName)}</div>
      <div style="font-size:13px;color:#c0a030;margin-top:4px;">Booking Report — ${escHtml(label)}</div>
      <div style="font-size:11px;color:#807050;margin-top:6px;">Generated: ${generated}</div>
    </div>

    <div style="display:flex;gap:0;background:#f5f5f5;border:1px solid #ddd;border-top:none;">
      <div style="flex:1;text-align:center;padding:14px 10px;border-right:1px solid #ddd;">
        <div style="font-size:26px;font-weight:700;color:#0f0f2a;font-family:Georgia,serif;">${filtered.length}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Bookings</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 10px;border-right:1px solid #ddd;">
        <div style="font-size:26px;font-weight:700;color:#1a5fa0;font-family:Georgia,serif;">${totalRooms}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Rooms</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 10px;">
        <div style="font-size:26px;font-weight:700;color:#6a1a8a;font-family:Georgia,serif;">${totalNights}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Nights</div>
      </div>
    </div>

    <div style="overflow-x:auto;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px;">
        <thead>
          <tr style="background:#0f0f2a;color:#f0c040;">
            <th style="padding:10px 8px;text-align:left;font-weight:700;">#</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Guest Name</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Contact</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Rooms</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Check-In</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Check-Out</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Nights</th>
            <th style="padding:10px 8px;text-align:left;font-weight:700;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((b, i) => {
            const n = nights(b.checkIn, b.checkOut);
            return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'};border-bottom:1px solid #eee;">
              <td style="padding:9px 8px;color:#888;">${i+1}</td>
              <td style="padding:9px 8px;font-weight:600;">${escHtml(b.name)}</td>
              <td style="padding:9px 8px;">${escHtml(b.contact)}</td>
              <td style="padding:9px 8px;text-align:center;">${b.rooms}</td>
              <td style="padding:9px 8px;">${fmtDate(b.checkIn)}</td>
              <td style="padding:9px 8px;">${fmtDate(b.checkOut)}</td>
              <td style="padding:9px 8px;text-align:center;">${n}</td>
              <td style="padding:9px 8px;color:#666;font-size:12px;">${escHtml(b.notes || '—')}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f0f0f0;font-weight:700;border-top:2px solid #ddd;">
            <td colspan="3" style="padding:10px 8px;color:#555;">TOTAL</td>
            <td style="padding:10px 8px;text-align:center;">${totalRooms}</td>
            <td colspan="2"></td>
            <td style="padding:10px 8px;text-align:center;">${totalNights}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="text-align:center;padding:12px;color:#aaa;font-size:11px;margin-top:8px;">
      Hotel Management System · ${escHtml(hotelName)}
    </div>
  </div>`;
}

// ── Show Report Fullscreen ─────────────────────────────────
function showReportScreen() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (filtered.length === 0) return flash('Koi record nahi mila!', false);

  const hotelName = currentUser?.hotelName || 'Hotel';
  const label = recFMonth
    ? `Month: ${recFMonth}`
    : recFDate
    ? `Date: ${fmtDate(recFDate)}`
    : 'All Bookings';

  $('reportOverlayTitle').textContent = `${hotelName} — ${label}`;
  $('reportOverlayBody').innerHTML    = buildReportHTML();
  $('reportOverlay').style.display    = 'block';
  document.body.style.overflow        = 'hidden';
}

function closeReportScreen() {
  $('reportOverlay').style.display = 'none';
  document.body.style.overflow     = '';
}

// ── Print Report ───────────────────────────────────────────
function printReport() {
  window.print();
}

// ── Share Report (APK + Browser compatible) ────────────────
function shareReport() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (filtered.length === 0) return flash('Koi record nahi mila!', false);

  const hotelName   = currentUser?.hotelName || 'Hotel';
  const label       = recFMonth
    ? `Month: ${recFMonth}`
    : recFDate
    ? `Date: ${fmtDate(recFDate)}`
    : 'Sabhi Bookings';
  const totalRooms  = filtered.reduce((a, b) => a + Number(b.rooms), 0);
  const totalNights = filtered.reduce((a, b) => a + nights(b.checkIn, b.checkOut), 0);

  // Plain-text report for WhatsApp / share
  const lines = [
    `🏨 *${hotelName} — Booking Report*`,
    `📋 Filter: ${label}`,
    `📅 Generated: ${new Date().toLocaleString('en-IN')}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ...filtered.map((b, i) => {
      const n = nights(b.checkIn, b.checkOut);
      return [
        ``,
        `*${i+1}. ${b.name}*`,
        `📞 ${b.contact}`,
        `📅 ${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}`,
        `🛏 ${b.rooms} Room(s) · 🌙 ${n} Night(s)`,
        b.notes ? `📝 ${b.notes}` : null
      ].filter(Boolean).join('\n');
    }),
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 *Summary*`,
    `Total Bookings: ${filtered.length}`,
    `Total Rooms: ${totalRooms}`,
    `Total Nights: ${totalNights}`,
  ].join('\n');

  // Try Web Share API first (Android Chrome, modern browsers)
  if (navigator.share) {
    navigator.share({
      title: `${hotelName} Booking Report`,
      text:  lines,
    }).catch(() => {
      // User cancelled — no error needed
    });
    return;
  }

  // Fallback: WhatsApp direct link (works in APK WebView too)
  const encoded = encodeURIComponent(lines);
  const waUrl   = `https://wa.me/?text=${encoded}`;

  // Try opening WhatsApp
  const win = window.open(waUrl, '_blank');
  if (!win) {
    // Last resort: copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines).then(() => {
        flash('📋 Report clipboard mein copy ho gayi! Paste karo jahan chahiye.', true);
      });
    } else {
      // Very old WebView fallback
      const ta = document.createElement('textarea');
      ta.value = lines;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try {
        document.execCommand('copy');
        flash('📋 Report copy ho gayi!', true);
      } catch {
        flash('❌ Share nahi ho saka. Screenshot lo!', false);
      }
      document.body.removeChild(ta);
    }
  }
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

