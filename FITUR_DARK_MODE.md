# Fitur Dark Mode / Light Mode

## Deskripsi

Aplikasi Daftar Hadir Digital sekarang dilengkapi dengan **toggle dark mode dan light mode** untuk kenyamanan mata pengguna, terutama saat digunakan di malam hari atau di lingkungan dengan cahaya rendah.

## Lokasi Tombol

### Halaman Tamu (index.html)
- **Posisi**: Header, sebelah kiri tombol Admin (🔐)
- **Icon**: 
  - 🌙 Bulan = Mode terang aktif (klik untuk ke gelap)
  - ☀️ Matahari = Mode gelap aktif (klik untuk ke terang)

### Panel Admin (admin.html)
- **Posisi**: Header, sebelah kiri tombol Lihat Halaman Tamu (👁️) dan Logout (🚪)
- **Icon**: Sama seperti halaman tamu

## Cara Menggunakan

1. **Toggle Manual**: Klik icon bulan/matahari di header
2. **Otomatis**: Pilihan mode disimpan di browser dan akan diingat saat kunjungan berikutnya
3. **Sinkronisasi**: Mode yang dipilih berlaku untuk semua halaman (tamu & admin)

## Fitur

✅ **Persistent**: Pilihan mode tersimpan di localStorage browser  
✅ **Smooth Transition**: Transisi halus antar mode dengan CSS transition  
✅ **Toast Notification**: Notifikasi konfirmasi saat mengganti mode  
✅ **Cross-Page**: Mode berlaku di halaman tamu dan admin  
✅ **Icon Toggle**: Icon berubah sesuai mode aktif  

## Perubahan Visual

### Dark Mode
- **Background**: Gelap (#1a1a1a)
- **Surface/Card**: Abu-abu gelap (#2d2d2d)
- **Text**: Putih keabu-abuan (#e8eaed)
- **Border**: Abu-abu medium (#3c4043)
- **Shadow**: Lebih dalam untuk kontras

### Light Mode (Default)
- **Background**: Terang (#f0f4f8)
- **Surface/Card**: Putih (#ffffff)
- **Text**: Hitam keabu-abuan (#202124)
- **Border**: Abu-abu terang (#dadce0)
- **Shadow**: Tipis untuk kesan clean

## Komponen yang Mendukung Dark Mode

- ✅ Header & Navigation
- ✅ Card & Container
- ✅ Form Input & Textarea
- ✅ Button (Primary, Outline, Danger, Warning)
- ✅ Signature Pad Canvas
- ✅ Table (Admin)
- ✅ Modal & Dialog
- ✅ Toast Notification
- ✅ Badge & Status Indicator
- ✅ List Item (Daftar Hadir)
- ✅ Statistics Card (Admin)

## Technical Details

### File yang Diubah

1. **index.html**
   - Tambah tombol dark mode di header
   - Tambah icon SVG untuk light/dark

2. **admin.html**
   - Tambah tombol dark mode di header
   - Tambah icon SVG untuk light/dark

3. **css/style.css**
   - Tambah CSS variables untuk dark mode
   - Selector `[data-theme="dark"]` untuk override warna
   - Transisi smooth untuk semua elemen

4. **js/app.js**
   - Fungsi `initDarkMode()` - Load preferensi dari localStorage
   - Fungsi `toggleDarkMode()` - Switch mode dan simpan preferensi
   - Fungsi `applyThemeMode()` - Terapkan theme ke DOM

5. **js/admin.js**
   - Fungsi `toggleDarkMode()` - Switch mode di admin
   - Fungsi `applyThemeMode()` - Terapkan theme di admin
   - Auto-init dark mode saat halaman load

### Implementasi

```javascript
// localStorage key
const THEME_KEY = 'dh_theme';

// Toggle function
function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}
```

### CSS Variables

```css
:root {
  --clr-bg: #f0f4f8;
  --clr-surface: #ffffff;
  --clr-text: #202124;
}

[data-theme="dark"] {
  --clr-bg: #1a1a1a;
  --clr-surface: #2d2d2d;
  --clr-text: #e8eaed;
}
```

## Browser Support

- ✅ Chrome/Edge (versi terbaru)
- ✅ Firefox (versi terbaru)
- ✅ Safari (iOS & macOS)
- ✅ Mobile browsers (Android & iOS)
- ✅ localStorage tersedia di semua browser modern

## Testing Checklist

- [ ] Toggle di halaman tamu berfungsi
- [ ] Toggle di panel admin berfungsi
- [ ] Mode tersimpan setelah refresh halaman
- [ ] Mode sinkron antara halaman tamu dan admin
- [ ] Semua komponen (form, table, modal) terlihat jelas di dark mode
- [ ] Tanda tangan canvas tetap berfungsi di dark mode
- [ ] Icon toggle berganti sesuai mode aktif
- [ ] Toast notification muncul saat toggle
- [ ] Tidak ada elemen yang tidak terbaca di dark mode

## User Guide

**Q: Bagaimana cara mengaktifkan dark mode?**  
A: Klik icon bulan (🌙) di header. Mode akan berubah menjadi gelap dan tersimpan otomatis.

**Q: Apakah pilihan mode akan hilang setelah tutup browser?**  
A: Tidak, pilihan mode disimpan di localStorage browser dan akan diingat.

**Q: Apakah dark mode menghemat baterai?**  
A: Ya, terutama di perangkat dengan layar OLED/AMOLED. Dark mode dapat menghemat baterai hingga 30-40%.

**Q: Bagaimana cara kembali ke mode terang?**  
A: Klik icon matahari (☀️) di header.

**Q: Apakah mode sinkron di semua tab?**  
A: Mode disimpan per browser, jadi tab baru akan mengikuti mode terakhir yang dipilih.

## Rekomendasi

- **Gunakan dark mode** saat bekerja di malam hari atau ruangan gelap
- **Gunakan light mode** saat di luar ruangan atau ruangan terang
- **Pilihan personal**: Beberapa pengguna lebih nyaman dengan salah satu mode sepanjang waktu

## Future Enhancement Ideas

- [ ] Auto dark mode berdasarkan waktu (malam = gelap, siang = terang)
- [ ] Follow sistem operasi (`prefers-color-scheme`)
- [ ] Custom theme colors (user-defined)
- [ ] Gradient theme options
- [ ] High contrast mode untuk aksesibilitas

---

**Status**: ✅ Implemented & Ready
**Version**: 2.1.0
**Date**: 17 September 2026
