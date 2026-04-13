/* ═══════════════════════════════════════════════════════════
   HOTEL MANAGER — script.js
   localStorage powered | APK / WebView Ready
   Pure JS PDF — No external libraries! 100% Offline!
═══════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────
let currentUser = null;
let authMode    = 'login';
let roomCount   = 1;
let currentTab  = 'new';

let recSearch = '';
let recFDate  = '';
let recFMonth = '';

// ── localStorage Helpers ───────────────────────────────────
function getUsers()     { try { return JSON.parse(localStorage.getItem('hms_users')    || '[]'); } catch { return []; } }
function saveUsers(u)   { localStorage.setItem('hms_users',    JSON.stringify(u)); }
function getBookings()  { try { return JSON.parse(localStorage.getItem('hms_bookings') || '[]'); } catch { return []; } }
function saveBookings(b){ localStorage.setItem('hms_bookings', JSON.stringify(b)); }

// ── SESSION PERSISTENCE ────────────────────────────────────
function saveSession(user) {
  try {
    if (user) localStorage.setItem('hms_session', JSON.stringify(user));
    else      localStorage.removeItem('hms_session');
  } catch(e) {}
}

function getSavedSession() {
  try {
    const raw = localStorage.getItem('hms_session');
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return getUsers().find(u => u.username === saved.username && u.password === saved.password) || null;
  } catch { return null; }
}

// ── Utility ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

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
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── Auth Mode ──────────────────────────────────────────────
function switchAuthMode(mode) {
  authMode = mode;
  $('loginToggle').classList.toggle('active',    mode === 'login');
  $('registerToggle').classList.toggle('active', mode === 'register');
  $('hotelNameWrap').classList.toggle('hidden',  mode === 'login');
  $('authSubmit').textContent = mode === 'login' ? 'Login ->' : 'Create Account ->';
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
  const showErr   = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); };

  if (authMode === 'register') {
    if (!hotelName || !username || !password) return showErr('Sab fields bharein!');
    if (password.length < 4) return showErr('At least 4 character or number');
    const users = getUsers();
    if (users.find(u => u.username === username)) return showErr('Username already exist');
    const nu = { username, password, hotelName };
    saveUsers([...users, nu]);
    loginUser(nu);
  } else {
    if (!username || !password) return showErr('Fill username and password');
    const user = getUsers().find(u => u.username === username && u.password === password);
    if (!user) return showErr('Username or password is wrong');
    loginUser(user);
  }
}

function loginUser(user) {
  currentUser = user;
  saveSession(user);
  $('headerHotelName').textContent = user.hotelName || 'Hotel';
  $('authScreen').classList.remove('active');
  $('appScreen').classList.add('active');
  switchTab('new');
  renderRecords();
  updateReportStats();
}

function logout() {
  currentUser = null;
  saveSession(null);
  $('appScreen').classList.remove('active');
  $('authScreen').classList.add('active');
  $('authUsername').value = $('authPassword').value = '';
  $('authError').classList.add('hidden');
}

// ── Tab Switching ──────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  ['new','records','report'].forEach(t => {
    $('tab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.toggle('active', t===tab);
    $('nav'+t.charAt(0).toUpperCase()+t.slice(1)).classList.toggle('active', t===tab);
  });
  if (tab==='records') renderRecords();
  if (tab==='report')  { syncFiltersToReport(); updateReportStats(); }
}

// ── Room Counter ───────────────────────────────────────────
function changeRooms(d) {
  roomCount = Math.max(1, roomCount + d);
  $('roomCount').textContent = roomCount;
}

// ── Nights Calculation ─────────────────────────────────────
function calcNights() {
  const ci = $('checkIn').value, co = $('checkOut').value;
  const badge = $('nightsBadge');
  if (ci && co) {
    const n = nights(ci, co);
    if (n > 0) { badge.textContent = `${n} Night(s) - ${roomCount} Room(s)`; badge.classList.remove('hidden'); return; }
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

  if (!name||!contact||!ci||!co) return flash('Name, contact and date are mandatory', false);
  if (ci>=co) return flash('Checkout date check-in se baad honi chahiye!', false);

  saveBookings([...getBookings(), {
    id: Date.now(), name, contact, rooms: roomCount,
    checkIn: ci, checkOut: co, notes,
    createdAt: new Date().toISOString(),
    hotelUser: currentUser.username
  }]);

  $('guestName').value = $('guestContact').value = $('checkIn').value = $('checkOut').value = $('guestNotes').value = '';
  roomCount = 1; $('roomCount').textContent = '1';
  $('nightsBadge').classList.add('hidden');
  flash('Booking save ho gayi!');
}

// ── My Bookings ────────────────────────────────────────────
function myBookings() {
  return getBookings().filter(b => b.hotelUser === currentUser?.username);
}

// ── Filter Logic ───────────────────────────────────────────
function getFiltered(search, fDate, fMonth) {
  const q = (search||'').toLowerCase();
  return myBookings().filter(b => {
    const ms = !q || b.name.toLowerCase().includes(q) || b.contact.includes(q) || b.checkIn.includes(q) || b.checkOut.includes(q);
    const md = !fDate || b.checkIn === fDate;
    const mm = !fMonth || b.checkIn.startsWith(fMonth) || b.checkOut.startsWith(fMonth);
    return ms && md && mm;
  });
}

// ── Records Tab ────────────────────────────────────────────
function filterByDate()  { recFDate=$('filterDate').value; recFMonth=''; $('filterMonth').value=''; renderRecords(); }
function filterByMonth() { recFMonth=$('filterMonth').value; recFDate=''; $('filterDate').value=''; renderRecords(); }
function clearFilters()  { recSearch=recFDate=recFMonth=''; $('searchInput').value=$('filterDate').value=$('filterMonth').value=''; renderRecords(); }

function renderRecords() {
  recSearch = $('searchInput')?.value || recSearch;
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  const total    = myBookings().length;
  $('recordsCount').textContent = `${filtered.length} / ${total} bookings`;
  $('clearFilterBtn').classList.toggle('hidden', !recSearch&&!recFDate&&!recFMonth);
  $('exportBtn').classList.toggle('hidden', filtered.length===0);
  const list = $('recordsList');
  if (filtered.length===0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">${total===0?'currently no booking':'No booking found'}</div></div>`;
    return;
  }
  list.innerHTML = filtered.map((b,i)=>buildCard(b,i+1)).join('');
}

function buildCard(b, idx) {
  const n = nights(b.checkIn, b.checkOut);
  return `<div class="booking-card" id="card_${b.id}" onclick="toggleCard(${b.id})">
    <div class="card-header">
      <div class="card-num">${idx}</div>
      <div class="card-main">
        <div class="card-name">${escHtml(b.name)}</div>
        <div class="card-sub">${fmtDate(b.checkIn)} -> ${fmtDate(b.checkOut)} · ${n}N · ${b.rooms} room${b.rooms>1?'s':''}</div>
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
      ${b.notes?`<div class="card-notes"><div class="detail-label">📝 Notes</div><div class="detail-val">${escHtml(b.notes)}</div></div>`:''}
      <button class="card-delete" onclick="event.stopPropagation();deleteBooking(${b.id})">🗑 Delete Booking</button>
    </div>
  </div>`;
}

function toggleCard(id) { const c=$('card_'+id); if(c) c.classList.toggle('open'); }

function deleteBooking(id) {
  if (!confirm('want to delete booking?')) return;
  saveBookings(getBookings().filter(b=>b.id!==id));
  flash('Booking deleted');
  renderRecords(); updateReportStats();
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Report Tab ─────────────────────────────────────────────
function syncReportFilter(type) {
  if (type==='date') { recFDate=$('reportDate').value; recFMonth=''; $('reportMonth').value=''; }
  else               { recFMonth=$('reportMonth').value; recFDate=''; $('reportDate').value=''; }
  $('filterDate').value=recFDate; $('filterMonth').value=recFMonth;
  updateReportStats();
}
function syncFiltersToReport() { $('reportDate').value=recFDate; $('reportMonth').value=recFMonth; }
function clearReportFilter()   { recFDate=recFMonth=''; $('reportDate').value=$('reportMonth').value=$('filterDate').value=$('filterMonth').value=''; updateReportStats(); }

function updateReportStats() {
  const filtered = getFiltered('', recFDate, recFMonth);
  $('statBookings').textContent = filtered.length;
  $('statRooms').textContent    = filtered.reduce((a,b)=>a+Number(b.rooms),0);
  $('statNights').textContent   = filtered.reduce((a,b)=>a+nights(b.checkIn,b.checkOut),0);
  const noData = filtered.length===0;
  $('downloadReportBtn').disabled    = noData;
  $('downloadReportBtn').style.opacity = noData?'0.4':'1';
  $('reportHint').style.display      = noData?'block':'none';
  const preview = $('reportPreview');
  preview.innerHTML = filtered.length>0 ? `<h3>Preview (${filtered.length} records):</h3>`+filtered.map((b,i)=>buildCard(b,i+1)).join('') : '';
}

// ── Build HTML Report ──────────────────────────────────────
function buildReportHTML() {
  const filtered    = getFiltered(recSearch, recFDate, recFMonth);
  const hotelName   = currentUser?.hotelName || 'Hotel';
  const label       = recFMonth?`Month: ${recFMonth}`:recFDate?`Date: ${fmtDate(recFDate)}`:'All Bookings';
  const totalRooms  = filtered.reduce((a,b)=>a+Number(b.rooms),0);
  const totalNights = filtered.reduce((a,b)=>a+nights(b.checkIn,b.checkOut),0);
  const generated   = new Date().toLocaleString('en-IN');

  return `<div id="pdfTarget" style="font-family:Arial,sans-serif;color:#111;width:100%;background:#fff;">
    <div style="background:linear-gradient(135deg,#0f0f2a,#1a0d35);color:#f0c040;padding:24px 20px;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🏨</div>
      <div style="font-size:18px;font-weight:700;">${escHtml(hotelName)}</div>
      <div style="font-size:12px;color:#c0a030;margin-top:4px;">Booking Report — ${escHtml(label)}</div>
      <div style="font-size:10px;color:#807050;margin-top:4px;">Generated: ${generated}</div>
    </div>
    <div style="display:flex;background:#f5f5f5;border:1px solid #ddd;border-top:none;">
      <div style="flex:1;text-align:center;padding:12px 8px;border-right:1px solid #ddd;">
        <div style="font-size:22px;font-weight:700;color:#0f0f2a;">${filtered.length}</div>
        <div style="font-size:10px;color:#888;">BOOKINGS</div>
      </div>
      <div style="flex:1;text-align:center;padding:12px 8px;border-right:1px solid #ddd;">
        <div style="font-size:22px;font-weight:700;color:#1a5fa0;">${totalRooms}</div>
        <div style="font-size:10px;color:#888;">ROOMS</div>
      </div>
      <div style="flex:1;text-align:center;padding:12px 8px;">
        <div style="font-size:22px;font-weight:700;color:#6a1a8a;">${totalNights}</div>
        <div style="font-size:10px;color:#888;">NIGHTS</div>
      </div>
    </div>
    <div style="overflow-x:auto;border:1px solid #ddd;border-top:none;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:520px;">
        <thead>
          <tr style="background:#0f0f2a;color:#f0c040;">
            <th style="padding:9px 7px;text-align:left;">#</th>
            <th style="padding:9px 7px;text-align:left;">Guest Name</th>
            <th style="padding:9px 7px;text-align:left;">Contact</th>
            <th style="padding:9px 7px;text-align:center;">Rooms</th>
            <th style="padding:9px 7px;text-align:left;">Check-In</th>
            <th style="padding:9px 7px;text-align:left;">Check-Out</th>
            <th style="padding:9px 7px;text-align:center;">Nights</th>
            <th style="padding:9px 7px;text-align:left;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((b,i)=>{
            const n=nights(b.checkIn,b.checkOut);
            return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};border-bottom:1px solid #eee;">
              <td style="padding:8px 7px;color:#888;">${i+1}</td>
              <td style="padding:8px 7px;font-weight:600;">${escHtml(b.name)}</td>
              <td style="padding:8px 7px;">${escHtml(b.contact)}</td>
              <td style="padding:8px 7px;text-align:center;">${b.rooms}</td>
              <td style="padding:8px 7px;">${fmtDate(b.checkIn)}</td>
              <td style="padding:8px 7px;">${fmtDate(b.checkOut)}</td>
              <td style="padding:8px 7px;text-align:center;">${n}</td>
              <td style="padding:8px 7px;color:#666;font-size:11px;">${escHtml(b.notes||'-')}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f0f0f0;font-weight:700;border-top:2px solid #ddd;">
            <td colspan="3" style="padding:9px 7px;color:#555;">TOTAL</td>
            <td style="padding:9px 7px;text-align:center;">${totalRooms}</td>
            <td colspan="2"></td>
            <td style="padding:9px 7px;text-align:center;">${totalNights}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div style="text-align:center;padding:10px;color:#aaa;font-size:10px;margin-top:6px;">Hotel Management System - ${escHtml(hotelName)}</div>
  </div>`;
}

// ── Show Report Fullscreen ─────────────────────────────────
function showReportScreen() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (filtered.length===0) return flash('No record found', false);
  const hotelName = currentUser?.hotelName||'Hotel';
  const label     = recFMonth?`Month: ${recFMonth}`:recFDate?`Date: ${fmtDate(recFDate)}`:'All Bookings';
  $('reportOverlayTitle').textContent = `${hotelName} - ${label}`;
  $('reportOverlayBody').innerHTML    = buildReportHTML();
  $('reportOverlay').style.display    = 'block';
  document.body.style.overflow        = 'hidden';
}

function closeReportScreen() {
  $('reportOverlay').style.display = 'none';
  document.body.style.overflow     = '';
}

// ════════════════════════════════════════════════════════════
//  PURE JS PDF — No library needed! Works offline!
// ════════════════════════════════════════════════════════════
function generateHotelPDF(filtered) {
  const san = s => String(s||'').replace(/[^\x20-\x7E]/g,'?');
  const esc = s => san(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const ps  = s => `(${esc(s)})`;
  const rgb = (r,g,b) => `${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`;

  const PW=841, PH=595, ML=28, MR=28, MT=25, MB=25;
  const tableW = PW-ML-MR; // 785

  const cols = [
    {h:'#',          w:22 },
    {h:'Guest Name', w:150},
    {h:'Contact',    w:95 },
    {h:'Rooms',      w:40 },
    {h:'Check-In',   w:68 },
    {h:'Check-Out',  w:68 },
    {h:'Nights',     w:40 },
    {h:'Notes',      w:302},
  ]; // sum = 785

  const colX = [];
  let sx = ML+4;
  cols.forEach(c => { colX.push(sx); sx+=c.w; });

  const HDR_H=72, THDR_H=20, ROW_H=16;
  const rpp = Math.max(1, Math.floor((PH-MT-MB-HDR_H-THDR_H)/ROW_H));

  const hotelName   = san(currentUser?.hotelName||'Hotel');
  const label       = recFMonth?`Month: ${recFMonth}`:recFDate?`Date: ${fmtDate(recFDate)}`:'All Bookings';
  const totalRooms  = filtered.reduce((a,b)=>a+Number(b.rooms),0);
  const totalNights = filtered.reduce((a,b)=>a+nights(b.checkIn,b.checkOut),0);
  const genDate     = new Date().toLocaleDateString('en-IN');

  const pages = [];
  if (filtered.length===0) pages.push([]);
  else for (let i=0;i<filtered.length;i+=rpp) pages.push(filtered.slice(i,i+rpp));
  const NP = pages.length;

  const streams = pages.map((rows, pgIdx) => {
    let s='';

    // Header bg
    s+=`${rgb(15,15,42)} rg\n`;
    s+=`${ML} ${PH-MT-HDR_H} ${tableW} ${HDR_H} re f\n`;
    // Hotel name
    s+=`${rgb(240,192,64)} rg\n`;
    s+=`BT /F2 14 Tf 1 0 0 1 ${ML+10} ${PH-MT-20} Tm ${ps(hotelName)} Tj ET\n`;
    // Subtitle
    s+=`${rgb(192,160,48)} rg\n`;
    s+=`BT /F1 9 Tf 1 0 0 1 ${ML+10} ${PH-MT-35} Tm ${ps('Booking Report - '+label)} Tj ET\n`;
    // Generated
    s+=`${rgb(128,112,80)} rg\n`;
    s+=`BT /F1 8 Tf 1 0 0 1 ${ML+10} ${PH-MT-48} Tm ${ps('Generated: '+genDate)} Tj ET\n`;
    // Summary
    s+=`${rgb(192,160,48)} rg\n`;
    s+=`BT /F1 8 Tf 1 0 0 1 ${ML+10} ${PH-MT-62} Tm ${ps('Bookings: '+filtered.length+'   Rooms: '+totalRooms+'   Nights: '+totalNights)} Tj ET\n`;
    // Page number
    s+=`${rgb(128,112,80)} rg\n`;
    s+=`BT /F1 8 Tf 1 0 0 1 ${PW-MR-65} ${PH-MT-20} Tm ${ps('Page '+(pgIdx+1)+'/'+NP)} Tj ET\n`;

    // Table header
    const tY = PH-MT-HDR_H-THDR_H;
    s+=`${rgb(15,15,42)} rg\n`;
    s+=`${ML} ${tY} ${tableW} ${THDR_H} re f\n`;
    s+=`${rgb(240,192,64)} rg\n`;
    cols.forEach((col,ci)=>{ s+=`BT /F2 8 Tf 1 0 0 1 ${colX[ci]} ${tY+6} Tm ${ps(col.h)} Tj ET\n`; });

    // Data rows
    rows.forEach((b, li) => {
      const gi  = pgIdx*rpp+li;
      const rY  = tY-(li+1)*ROW_H;
      s+=`${li%2===0?'1 1 1':'0.961 0.961 0.969'} rg\n`;
      s+=`${ML} ${rY} ${tableW} ${ROW_H} re f\n`;
      s+=`0.867 0.867 0.867 RG 0.3 w ${ML} ${rY} m ${ML+tableW} ${rY} l S\n`;
      const cells=[
        String(gi+1),
        san(b.name).substring(0,24),
        san(b.contact).substring(0,15),
        String(b.rooms),
        fmtDate(b.checkIn),
        fmtDate(b.checkOut),
        String(nights(b.checkIn,b.checkOut)),
        san(b.notes||'-').substring(0,42),
      ];
      s+=`0.067 0.067 0.067 rg\n`;
      cells.forEach((cell,ci)=>{
        s+=`BT ${ci===1?'/F2':'/F1'} 8 Tf 1 0 0 1 ${colX[ci]} ${rY+5} Tm ${ps(cell)} Tj ET\n`;
      });
    });

    // Totals row
    if (pgIdx===NP-1 && filtered.length>0) {
      const totY = tY-(rows.length+1)*ROW_H;
      s+=`0.922 0.922 0.922 rg ${ML} ${totY} ${tableW} ${ROW_H} re f\n`;
      s+=`0.2 0.2 0.2 rg\n`;
      s+=`BT /F2 8 Tf 1 0 0 1 ${colX[0]} ${totY+5} Tm (TOTAL) Tj ET\n`;
      s+=`BT /F2 8 Tf 1 0 0 1 ${colX[3]} ${totY+5} Tm ${ps(String(totalRooms))} Tj ET\n`;
      s+=`BT /F2 8 Tf 1 0 0 1 ${colX[6]} ${totY+5} Tm ${ps(String(totalNights))} Tj ET\n`;
    }
    return s;
  });

  // PDF assembly
  const sBase=5, pBase=sBase+NP, totalObjs=pBase+NP;
  const parts=[], byteOff={};
  let pos=0;
  const w   = str => { parts.push(str); pos+=str.length; };
  const sObj= id  => { byteOff[id]=pos; w(`${id} 0 obj\n`); };
  const eObj= ()  => w('endobj\n');

  w('%PDF-1.4\n');

  sObj(1); w('<< /Type /Catalog /Pages 2 0 R >>\n'); eObj();
  sObj(2);
  w(`<< /Type /Pages /Kids [${Array.from({length:NP},(_,i)=>`${pBase+i} 0 R`).join(' ')}] /Count ${NP} >>\n`);
  eObj();
  sObj(3); w('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n'); eObj();
  sObj(4); w('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n'); eObj();

  streams.forEach((stream,i) => {
    sObj(sBase+i);
    w(`<< /Length ${stream.length} >>\nstream\n`);
    w(stream);
    w('\nendstream\n');
    eObj();
  });

  pages.forEach((_,i) => {
    sObj(pBase+i);
    w(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${sBase+i} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\n`);
    eObj();
  });

  const xrefPos=pos;
  w(`xref\n0 ${totalObjs}\n`);
  w('0000000000 65535 f \n');
  for (let i=1;i<totalObjs;i++) w(String(byteOff[i]||0).padStart(10,'0')+' 00000 n \n');
  w(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  return parts.join('');
}

// ── Download PDF button ────────────────────────────────────
function downloadPDF() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (!filtered.length) return flash('No record found', false);

  const loading = $('pdfLoading');
  if (loading) loading.style.display='flex';

  setTimeout(() => {
    try {
      const pdfStr = generateHotelPDF(filtered);
      const bytes  = new Uint8Array(pdfStr.length);
      for (let i=0;i<pdfStr.length;i++) bytes[i]=pdfStr.charCodeAt(i)&0xff;

      const blob = new Blob([bytes], {type:'application/pdf'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const hn   = (currentUser?.hotelName||'Hotel').replace(/[^a-zA-Z0-9]/g,'_');
      const lb   = (recFMonth||recFDate||'All').replace(/[^a-zA-Z0-9-]/g,'_');
      a.href     = url;
      a.download = `${hn}_${lb}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 5000);

      if (loading) loading.style.display='none';
      flash('PDF download ho gayi!', true);
    } catch(e) {
      if (loading) loading.style.display='none';
      console.error('PDF error:',e);
      flash('PDF error: '+e.message, false);
    }
  }, 120);
}

// ── Share Report ───────────────────────────────────────────
function shareReport() {
  const filtered = getFiltered(recSearch, recFDate, recFMonth);
  if (!filtered.length) return flash('Koi record nahi mila!', false);

  const hotelName   = currentUser?.hotelName||'Hotel';
  const label       = recFMonth?`Month: ${recFMonth}`:recFDate?`Date: ${fmtDate(recFDate)}`:'Sabhi Bookings';
  const totalRooms  = filtered.reduce((a,b)=>a+Number(b.rooms),0);
  const totalNights = filtered.reduce((a,b)=>a+nights(b.checkIn,b.checkOut),0);

  const lines=[
    `*${hotelName} - Booking Report*`,
    `Filter: ${label}`,
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    `--------------------`,
    ...filtered.map((b,i)=>{
      const n=nights(b.checkIn,b.checkOut);
      return [``,`*${i+1}. ${b.name}*`,`Ph: ${b.contact}`,
        `${fmtDate(b.checkIn)} -> ${fmtDate(b.checkOut)}`,
        `${b.rooms} Room(s) - ${n} Night(s)`,
        b.notes?`Note: ${b.notes}`:null
      ].filter(Boolean).join('\n');
    }),
    ``,`--------------------`,`*Summary*`,
    `Bookings: ${filtered.length}`,`Rooms: ${totalRooms}`,`Nights: ${totalNights}`,
  ].join('\n');

  if (navigator.share) { navigator.share({title:`${hotelName} Report`,text:lines}).catch(()=>{}); return; }

  const win=window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`,'_blank');
  if (!win) {
    if (navigator.clipboard) navigator.clipboard.writeText(lines).then(()=>flash('Report copied',true));
    else {
      const ta=document.createElement('textarea');
      ta.value=lines; ta.style.cssText='position:fixed;opacity:0;';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try{document.execCommand('copy');flash('Report copied',true);}
      catch{flash('Share not accesable',false);}
      document.body.removeChild(ta);
    }
  }
}

// ── DOMContentLoaded ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-login — app bnd karo vapas kholo, andar rahoge!
  const savedUser = getSavedSession();
  if (savedUser) loginUser(savedUser);

  $('authPassword')?.addEventListener('keydown', e => { if(e.key==='Enter') handleAuth(); });
  $('authUsername')?.addEventListener('keydown', e => { if(e.key==='Enter') $('authPassword')?.focus(); });
});

