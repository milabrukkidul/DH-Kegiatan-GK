/**
 * app.js — Logika halaman tamu (index.html)
 * Bergantung pada: api.js, db.js, canvas.js
 * Semua operasi DB kini async (await).
 */

'use strict';

let currentKegiatan = null;

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = Fmt.tahun();

  SignaturePad.init('sig-canvas', 'sig-wrap', 'sig-hint');
  document.getElementById('btn-clear-sig').addEventListener('click', () => SignaturePad.clear());
  document.getElementById('hadir-form').addEventListener('submit', onSubmit);
  document.getElementById('btn-hadir-lagi').addEventListener('click', resetForm);
  document.getElementById('btn-refresh-kegiatan').addEventListener('click', refreshKegiatan);
  document.getElementById('btn-dark-mode').addEventListener('click', toggleDarkMode);

  // Inisialisasi dark mode dari localStorage
  initDarkMode();

  // Debug: Clear cache dengan Ctrl+Shift+R atau Cmd+Shift+R
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (confirm('Hapus semua cache lokal dan reload halaman?')) {
        localStorage.removeItem('dh_kegiatan');
        localStorage.removeItem('dh_hadir');
        console.log('[Debug] Cache cleared');
        showToast('Cache dihapus, reload halaman...', 'success');
        setTimeout(() => location.reload(), 800);
      }
    }
  });

  await loadPage();
});

/* ── REFRESH KEGIATAN ────────────────────────────────────── */
async function refreshKegiatan() {
  const btn = document.getElementById('btn-refresh-kegiatan');
  if (!btn) return;
  
  // Animasi rotasi
  btn.style.animation = 'spin 0.6s linear';
  btn.disabled = true;
  
  try {
    if (DB.isGasMode()) {
      // Clear cache dan ambil data fresh dari server
      localStorage.removeItem('dh_kegiatan');
      
      const freshKegiatan = await GasAPI.getAllKegiatan();
      localStorage.setItem('dh_kegiatan', JSON.stringify(freshKegiatan));
      console.log('[Refresh] Data kegiatan diperbarui:', freshKegiatan.length, 'kegiatan');
      
      currentKegiatan = await DB.getKegiatanAktif();
      console.log('[Refresh] Kegiatan aktif:', currentKegiatan);
      renderKegiatan(currentKegiatan);
      
      if (currentKegiatan) {
        const hadir = await DB.getHadirByKegiatan(currentKegiatan.id);
        renderDaftarHadir(hadir);
      }
      
      showToast('✓ Data kegiatan berhasil diperbarui', 'success');
    } else {
      showToast('Mode lokal - tidak ada data server untuk diperbarui', 'warn');
    }
  } catch (err) {
    console.error('[Refresh] Error:', err);
    showToast('Gagal memperbarui data: ' + err.message, 'error');
  } finally {
    btn.style.animation = '';
    btn.disabled = false;
  }
}

/* ── LOAD PAGE ───────────────────────────────────────────── */
async function loadPage() {
  showLoading(true);
  try {
    DB.seedIfEmpty();

    const setting = await DB.getSetting();
    applyTheme(setting);
    applyLogo(setting);
    document.getElementById('header-title').textContent =
      setting.nama_sekolah || 'Daftar Hadir Digital';
    document.title = (setting.nama_sekolah || 'Daftar Hadir') + ' — Daftar Hadir';

    // Cek koneksi API di mode GAS
    if (DB.isGasMode()) {
      try {
        await GasAPI.ping();
        console.log('[App] Koneksi API GAS berhasil');
        
        // Force refresh data dari server (bypass cache)
        // Ini penting untuk memastikan data selalu fresh
        try {
          const freshKegiatan = await GasAPI.getAllKegiatan();
          console.log('[App] Data kegiatan diperbarui dari server:', freshKegiatan.length, 'kegiatan');
          // Update localStorage cache dengan data fresh
          localStorage.setItem('dh_kegiatan', JSON.stringify(freshKegiatan));
        } catch (err) {
          console.warn('[App] Gagal refresh data kegiatan:', err.message);
        }
      } catch (e) {
        console.warn('[App] Koneksi API GAS gagal:', e.message);
        showToast('⚠️ Koneksi ke server lambat atau bermasalah. Data mungkin tidak tersinkron.', 'warning');
      }
    }

    // Tampilkan badge mode
    renderModeBadge();

    currentKegiatan = await DB.getKegiatanAktif();
    console.log('[App] Kegiatan aktif:', currentKegiatan);
    renderKegiatan(currentKegiatan);

    if (currentKegiatan) {
      const hadir = await DB.getHadirByKegiatan(currentKegiatan.id);
      renderDaftarHadir(hadir);
    }
  } catch (e) {
    showToast('Gagal memuat data: ' + e.message, 'error');
    console.error(e);
  } finally {
    showLoading(false);
  }
}

/* ── MODE BADGE ──────────────────────────────────────────── */
function renderModeBadge() {
  const existing = document.getElementById('mode-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.id    = 'mode-badge';

  if (DB.isGasMode()) {
    const apiUrl = GasAPI.getUrl();
    const isValidUrl = apiUrl && apiUrl.startsWith('https://script.google.com/macros/');
    
    if (isValidUrl) {
      badge.style.cssText =
        'position:fixed;bottom:60px;right:14px;z-index:300;' +
        'background:#34a853;color:#fff;font-size:11px;font-weight:700;' +
        'padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.2);' +
        'display:flex;align-items:center;gap:5px;';
      badge.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="white">' +
        '<path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5C3.89 3 3 3.9 3 5L2.99 19A2 2 0 0 0 5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1h-2z"/>' +
        '</svg> Terhubung ke Spreadsheet';
    } else {
      // URL GAS tidak valid atau kosong
      badge.style.cssText =
        'position:fixed;bottom:60px;right:14px;z-index:300;' +
        'background:#d93025;color:#fff;font-size:11px;font-weight:700;' +
        'padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.2);' +
        'display:flex;align-items:center;gap:5px;cursor:pointer;';
      badge.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="white">' +
        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
        '</svg> URL API Tidak Valid';
      badge.title = 'Klik untuk info lebih lanjut';
      badge.addEventListener('click', () => {
        showToast('URL API tidak valid. Periksa pengaturan di panel Admin.', 'error');
      });
    }
  } else {
    badge.style.cssText =
      'position:fixed;bottom:60px;right:14px;z-index:300;' +
      'background:#f29900;color:#111;font-size:11px;font-weight:700;' +
      'padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.2);' +
      'display:flex;align-items:center;gap:5px;';
    badge.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14a7 7 0 0 1-7-7h14a7 7 0 0 1-7 7z"/>' +
      '</svg> Mode Lokal';
  }
  document.body.appendChild(badge);
}

/* ── THEME ───────────────────────────────────────────────── */
function applyTheme(setting) {
  if (setting?.warna_primer) {
    document.documentElement.style.setProperty('--clr-primary', setting.warna_primer);
    document.documentElement.style.setProperty(
      '--clr-primary-dk', darken(setting.warna_primer, 30)
    );
  }
}

/* ── LOGO ────────────────────────────────────────────────── */
function applyLogo(setting) {
  const LOGO_DEFAULT = 'https://i.ibb.co.com/B2KQmpM1/logoMI-R.png';
  const url = (setting?.logo_url || '').trim() || LOGO_DEFAULT;
  const img = document.getElementById('header-logo-img');
  const svg = document.getElementById('header-logo-fallback');
  if (!img) return;
  img.src = url;
  img.style.display = '';
  if (svg) svg.style.display = 'none';
}

function darken(hex, amt) {
  if (!hex || !hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r   = Math.max(0, (num >> 16) - amt);
  const g   = Math.max(0, ((num >> 8) & 0xff) - amt);
  const b   = Math.max(0, (num & 0xff) - amt);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ── RENDER KEGIATAN ─────────────────────────────────────── */
function renderKegiatan(kg) {
  const infoEl = document.getElementById('kg-info');
  const formEl = document.getElementById('form-card');
  const listEl = document.getElementById('list-card');

  if (!kg) {
    infoEl.innerHTML =
      '<div class="no-data">📋 Belum ada kegiatan aktif.<br>' +
      'Hubungi admin untuk membuat kegiatan.</div>';
    formEl.style.display = 'none';
    listEl.style.display = 'none';
    return;
  }

  infoEl.innerHTML = `
    <div class="kg-badge${kg.status !== 'Aktif' ? ' inactive' : ''}">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      ${esc(kg.status)}
    </div>
    <div class="kg-title">${esc(kg.judul)}</div>
    <div class="kg-meta">
      <div class="kg-meta-row"><span class="lbl">📅 Tanggal</span><span>${esc(Fmt.tanggalHari(kg.tanggal))}</span></div>
      <div class="kg-meta-row"><span class="lbl">🕐 Waktu</span><span>${kg.waktu ? esc(Fmt.waktu(kg.waktu)) : '-'}</span></div>
      ${kg.lokasi     ? `<div class="kg-meta-row"><span class="lbl">📍 Lokasi</span><span>${esc(kg.lokasi)}</span></div>` : ''}
      ${kg.keterangan ? `<div class="kg-meta-row"><span class="lbl">📝 Ket.</span><span>${esc(kg.keterangan)}</span></div>` : ''}
    </div>`;

  // Blokir form jika status Nonaktif
  const isAktif  = kg.status === 'Aktif';
  const banner   = document.getElementById('form-nonaktif-banner');
  const formEl2  = document.getElementById('hadir-form');
  const btnSubmit = document.getElementById('btn-submit');

  formEl.style.display = 'block';
  listEl.style.display = 'block';

  if (banner) banner.style.display = isAktif ? 'none' : 'flex';
  if (formEl2) {
    // Nonaktifkan semua input dan tombol submit jika bukan Aktif
    Array.from(formEl2.elements).forEach(el => { el.disabled = !isAktif; });
  }
  if (btnSubmit) btnSubmit.disabled = !isAktif;
}

/* ── RENDER DAFTAR HADIR ─────────────────────────────────── */
function renderDaftarHadir(list) {
  const el    = document.getElementById('hadir-list');
  const count = document.getElementById('hadir-count');
  count.textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<div class="no-data">Belum ada yang hadir saat ini.</div>';
    return;
  }

  el.innerHTML = list.map(h => {
    const initial = (h.nama || '?').charAt(0).toUpperCase();
    const jam     = Fmt.waktu(h.waktuAbsen || '');
    return `
      <div class="hadir-item">
        <div class="avatar">${initial}</div>
        <div class="hadir-info">
          <div class="hadir-nama">${esc(h.nama)}</div>
          <div class="hadir-jabatan">${esc(h.jabatan)}</div>
        </div>
        <div class="hadir-ttd">
          ${h.ttd ? `<img src="${h.ttd}" alt="ttd ${esc(h.nama)}">` : ''}
        </div>
        <div class="hadir-time">${jam}</div>
      </div>`;
  }).join('');
}

/* ── SUBMIT ──────────────────────────────────────────────── */
let isSubmitting = false; // Flag untuk mencegah double submit

async function onSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('btn-submit');
  
  // Cegah double submit - cek dari 2 sumber
  if (isSubmitting || btn.dataset.submitting === 'true') {
    console.log('[Submit] Masih dalam proses, abaikan klik duplikat');
    return;
  }

  const nama       = document.getElementById('input-nama').value.trim();
  const jabatan    = document.getElementById('input-jabatan').value;
  const keterangan = document.getElementById('input-keterangan').value.trim();
  const ttd        = SignaturePad.getDataURL();

  if (!ttd) { SignaturePad.setError(); return; }
  if (!currentKegiatan) {
    showToast('Tidak ada kegiatan aktif.', 'error');
    return;
  }
  if (currentKegiatan.status !== 'Aktif') {
    showToast('Kegiatan sudah Nonaktif — pengisian ditutup.', 'error');
    return;
  }
  
  // Set flag dan disable button
  isSubmitting = true;
  btn.dataset.submitting = 'true';
  setButtonLoading(btn, true, 'Menyimpan…');
  
  // Disable form juga untuk keamanan ekstra
  const formElements = document.getElementById('hadir-form').elements;
  Array.from(formElements).forEach(el => { el.disabled = true; });

  try {
    const result = await DB.simpanHadir({
      idKegiatan: currentKegiatan.id,
      nama, jabatan, keterangan, ttd
    });

    if (!result.ok) {
      showToast(result.msg, 'error');
      // Re-enable form jika error
      if (currentKegiatan.status === 'Aktif') {
        Array.from(formElements).forEach(el => { el.disabled = false; });
      }
      return;
    }

    // Tampil sukses
    document.getElementById('success-nama').textContent      = nama;
    document.getElementById('success-kegiatan').textContent  = currentKegiatan.judul;
    document.getElementById('success-jabatan').textContent   = jabatan;
    document.getElementById('success-mode').textContent      =
      DB.isGasMode() ? '✓ Tersimpan di Google Spreadsheet' : '✓ Tersimpan di perangkat ini';

    document.getElementById('form-card').style.display    = 'none';
    document.getElementById('success-card').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('✓ Daftar hadir berhasil disimpan!', 'success');

    // Refresh daftar
    const hadir = await DB.getHadirByKegiatan(currentKegiatan.id);
    renderDaftarHadir(hadir);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
    // Re-enable form jika error
    if (currentKegiatan.status === 'Aktif') {
      Array.from(formElements).forEach(el => { el.disabled = false; });
    }
  } finally {
    // Reset flag dan button
    isSubmitting = false;
    btn.dataset.submitting = 'false';
    setButtonLoading(btn, false,
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="white">' +
      '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>' +
      '</svg> Kirim Daftar Hadir'
    );
  }
}

/* ── RESET ───────────────────────────────────────────────── */
function resetForm() {
  // Reset form dan flag
  isSubmitting = false;
  const formEl = document.getElementById('hadir-form');
  const btn = document.getElementById('btn-submit');
  
  formEl.reset();
  SignaturePad.clear();
  
  if (btn) btn.dataset.submitting = 'false';
  
  // Re-enable semua form elements jika kegiatan masih aktif
  if (currentKegiatan && currentKegiatan.status === 'Aktif') {
    Array.from(formEl.elements).forEach(el => { el.disabled = false; });
  }
  
  document.getElementById('success-card').style.display = 'none';
  document.getElementById('form-card').style.display    = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── UTILS ───────────────────────────────────────────────── */
function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  el.classList.toggle('hidden', !show);
}

function showToast(msg, type = '') {
  const wrap = document.getElementById('toast-container');
  const div  = document.createElement('div');
  div.className   = 'toast ' + type;
  div.textContent = msg;
  wrap.appendChild(div);
  setTimeout(() => div.remove(), 3300);
}

function setButtonLoading(btn, loading, html) {
  btn.disabled  = loading;
  btn.innerHTML = loading
    ? '<span class="spinner" style="width:18px;height:18px;border-width:3px;"></span> ' + html
    : html;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── DARK MODE ───────────────────────────────────────────── */
function initDarkMode() {
  const theme = localStorage.getItem('dh_theme') || 'light';
  applyThemeMode(theme);
}

function toggleDarkMode() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyThemeMode(newTheme);
  localStorage.setItem('dh_theme', newTheme);
  
  const msg = newTheme === 'dark' ? '🌙 Mode gelap diaktifkan' : '☀️ Mode terang diaktifkan';
  showToast(msg, 'success');
}

function applyThemeMode(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  const iconLight = document.getElementById('icon-light');
  const iconDark = document.getElementById('icon-dark');
  
  if (theme === 'dark') {
    // Dark mode aktif, tampilkan icon matahari (untuk switch ke light)
    if (iconLight) iconLight.style.display = '';
    if (iconDark) iconDark.style.display = 'none';
  } else {
    // Light mode aktif, tampilkan icon bulan (untuk switch ke dark)
    if (iconLight) iconLight.style.display = 'none';
    if (iconDark) iconDark.style.display = '';
  }
}
