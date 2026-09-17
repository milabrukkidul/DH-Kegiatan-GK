/**
 * api.js — GAS API Client (JSONP transport)
 *
 * Mengapa JSONP, bukan fetch()?
 * ─────────────────────────────
 * GAS Web App selalu melakukan HTTP redirect (302) dari URL asli
 * ke URL akhir. Browser memblokir redirect cross-origin ketika ada
 * CORS header yang tidak cocok — sehingga fetch() gagal dengan
 * "Failed to fetch" / CORS error meskipun GAS sudah set
 * Access-Control-Allow-Origin: *.
 *
 * JSONP bekerja via tag <script> yang tidak terkena batasan CORS,
 * sehingga redirect GAS tidak menjadi masalah sama sekali.
 *
 * Semua parameter dikirim sebagai query string GET.
 * GAS membungkus response dalam callback: cb123({...})
 */

'use strict';

const GasAPI = (() => {

  const CFG_KEY    = 'dh_gas_url';
  const TIMEOUT_MS = 30000; // Naik dari 15s ke 30s untuk koneksi mobile yang lambat
  let   _cbCounter = 0;

  // URL default — langsung aktif bahkan di mode samaran / cache bersih.
  // Nilai ini dipakai jika localStorage belum pernah diisi.
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbyXd2newAaVueZlLeLEicQFOSBxiKQoR0mpfcV0Etv5F7yRjBSCHbHKEe0hssxQ7IFtng/exec';

  /* ── CONFIG ──────────────────────────────────────────────── */
  function getUrl() {
    // Cek localStorage dulu (bisa di-override dari panel Admin),
    // fallback ke DEFAULT_URL jika kosong.
    return localStorage.getItem(CFG_KEY) || DEFAULT_URL;
  }

  function setUrl(u) {
    localStorage.setItem(CFG_KEY, u.trim());
  }

  function isConfigured() {
    return getUrl().startsWith('https://script.google.com/macros/');
  }

  // Operasi tulis yang TIDAK boleh di-retry secara buta (risiko duplikat data)
  const WRITE_ACTIONS = new Set([
    'simpanHadir', 'tambahKegiatan', 'hapusKegiatan',
    'hapusHadir', 'editKegiatan', 'updateStatusKegiatan',
    'saveSetting', 'setup'
  ]);

  /* ── JSONP TRANSPORT ─────────────────────────────────────── */
  // allowRetry: false untuk write operations agar tidak kirim data 2x
  function request(params, retryCount = 0, allowRetry) {
    // Tentukan boleh retry atau tidak berdasarkan action
    if (allowRetry === undefined) {
      allowRetry = !WRITE_ACTIONS.has(params.action);
    }

    return new Promise((resolve, reject) => {
      const base = getUrl();
      if (!base) return reject(new Error('URL API GAS belum dikonfigurasi.'));

      const cbName  = '__gasCallback_' + (++_cbCounter) + '_' + Date.now();

      const timer = setTimeout(() => {
        cleanup();
        if (allowRetry && retryCount < 1) {
          // Read operations: retry aman karena tidak mengubah data
          console.warn('[API] Request timeout, mencoba lagi... (attempt ' + (retryCount + 2) + ')');
          request(params, retryCount + 1, allowRetry).then(resolve).catch(reject);
        } else {
          // Write operations: JANGAN retry — data mungkin sudah masuk di server
          // Pesan error khusus untuk write agar user tahu situasinya
          const isWrite = WRITE_ACTIONS.has(params.action);
          reject(new Error(
            isWrite
              ? 'Koneksi timeout. Data kemungkinan sudah tersimpan — ' +
                'cek daftar hadir sebelum mencoba kirim lagi.'
              : 'Request timeout (30 detik). Periksa koneksi dan URL GAS.'
          ));
        }
      }, TIMEOUT_MS);

      window[cbName] = (data) => {
        cleanup();
        if (data && data.ok === false) {
          reject(new Error(data.error || 'GAS mengembalikan error'));
        } else {
          resolve(data);
        }
      };

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      // Bangun query string
      // Catatan: base64 TTD bisa sangat panjang (~50KB).
      // GAS Web App mendukung URL hingga ~2000 karakter untuk parameter
      // biasa, namun untuk TTD kita encode langsung (GAS menerima
      // URL panjang karena diproses oleh server Google, bukan browser bar).
      const allParams = Object.assign({}, params, { callback: cbName });
      const qs = Object.entries(allParams)
        .map(([k, v]) => {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return encodeURIComponent(k) + '=' + encodeURIComponent(val);
        })
        .join('&');

      const url = base + (base.includes('?') ? '&' : '?') + qs;

      const script   = document.createElement('script');
      script.src     = url;
      script.onerror = () => {
        cleanup();
        if (allowRetry && retryCount < 1) {
          // Read operations: retry aman
          console.warn('[API] Script error, mencoba lagi... (attempt ' + (retryCount + 2) + ')');
          request(params, retryCount + 1, allowRetry).then(resolve).catch(reject);
        } else {
          reject(new Error(
            'Script tidak dapat dimuat. Kemungkinan penyebab:\n' +
            '• URL GAS salah atau belum di-deploy\n' +
            '• Deployment belum diset "Anyone" aksesnya\n' +
            '• Koneksi internet bermasalah\n' +
            '• Periksa apakah URL dimulai dengan https://'
          ));
        }
      };
      document.head.appendChild(script);
    });
  }

  /* ── GAS Code.gs perlu diupdate untuk mendukung JSONP ─────
     doGet(e) harus membungkus response dalam callback:
       var cb = e.parameter.callback;
       if (cb) return ContentService
         .createTextOutput(cb + '(' + JSON.stringify(data) + ')')
         .setMimeType(ContentService.MimeType.JAVASCRIPT);
  ─────────────────────────────────────────────────────────── */

  /* ── ENDPOINTS ───────────────────────────────────────────── */
  async function ping() {
    return request({ action: 'ping' });
  }

  async function getSetting() {
    const res = await request({ action: 'setting' });
    return res.data;
  }

  async function getKegiatanAktif() {
    const res = await request({ action: 'kegiatanAktif' });
    return res.data;
  }

  async function getAllKegiatan() {
    const res = await request({ action: 'kegiatan' });
    return res.data;
  }

  async function getHadirByKegiatan(id) {
    const res = await request({ action: 'hadir', id });
    return res.data;
  }

  async function getStatistik(id) {
    const res = await request({ action: 'statistik', id });
    return res.data;
  }

  async function login(password) {
    return request({ action: 'login', password });
  }

  async function tambahKegiatan(password, data) {
    return request({ action: 'tambahKegiatan', password, ...data });
  }

  async function updateStatusKegiatan(password, id, status) {
    return request({ action: 'updateStatusKegiatan', password, id, status });
  }

  async function hapusKegiatan(password, id) {
    return request({ action: 'hapusKegiatan', password, id });
  }

  async function editKegiatan(password, data) {
    return request({ action: 'editKegiatan', password, ...data });
  }

  async function simpanHadir(data) {
    // data berisi: { idKegiatan, nama, jabatan, keterangan, ttd, clientId }
    // clientId dikirim dari db.js sebagai idempotency key —
    // GAS menolak request dengan clientId yang sudah pernah diproses.
    return request({ action: 'simpanHadir', ...data });
  }

  async function hapusHadir(password, id) {
    return request({ action: 'hapusHadir', password, id });
  }

  async function saveSetting(password, data) {
    return request({ action: 'saveSetting', password, ...data });
  }

  async function setup(password) {
    return request({ action: 'setup', password });
  }

  return {
    getUrl, setUrl, isConfigured,
    ping,
    getSetting,
    getKegiatanAktif, getAllKegiatan,
    getHadirByKegiatan, getStatistik,
    login,
    tambahKegiatan, editKegiatan, updateStatusKegiatan, hapusKegiatan,
    simpanHadir, hapusHadir,
    saveSetting, setup
  };

})();
