# Rancang Bangun Static Posturografi - Web Application

Aplikasi web full-stack ini dirancang untuk merekam, memvisualisasikan, dan menganalisis parameter keseimbangan postural manusia (posturografi statis) secara real-time dari platform sensor load cell berbasis Arduino Uno. 

Aplikasi ini menampilkan tiga parameter klinis utama:
1. **Stabilogram (Area of Ellipse / AoE)**: Luas area elips konfidensi 95% yang melingkupi distribusi titik Center of Pressure (CoP).
2. **Sway Path Length (SPL)**: Panjang lintasan total yang ditempuh oleh CoP selama durasi tes.
3. **Average CoP Velocity**: Kecepatan rata-rata koreksi postural di sepanjang sumbu Anteroposterior (AP) dan Mediolateral (ML).

Sistem database menggunakan **MySQL** (biasanya melalui XAMPP/phpMyAdmin) secara lokal untuk menyimpan rekam medis pasien serta seluruh data koordinat mentah agar dapat divisualisasikan ulang di kemudian hari.

---

## 🚀 Fitur Utama

- **Real-time Live Graphing**: Visualisasi lintasan CoP dan fluktuasi kecepatan (AP/ML) instan yang di-update secara live.
- **95% Confidence Ellipse**: Perhitungan matematika teoretis presisi tinggi untuk elips sebaran CoP.
- **Web Serial API (Direct Browser Connection)**: Hubungkan Arduino langsung ke browser Chrome/Edge dengan satu klik tanpa perlu instalasi driver serial pada sisi backend.
- **Audio Cue System**: Bunyi bips otomatis penanda perubahan fase pengujian (30s mata terbuka ➡️ 30s mata tertutup) dan penanda selesai.
- **Database MySQL Terintegrasi**: Penyimpanan riwayat pemeriksaan lengkap dengan visualisasi data grafik historis pasien.
- **Interactive Simulator**: Mode pengujian virtual untuk testing tanpa hardware yang menyimulasikan perbedaan respon kontrol keseimbangan (sehat vs gangguan keseimbangan).

---

## 🛠️ Persyaratan Sistem

- [Node.js](https://nodejs.org/) (Versi 16 atau lebih baru) terpasang di komputer Anda.
- [XAMPP](https://www.apachefriends.org/) (atau MySQL Server mandiri) terpasang dan dalam kondisi aktif.
- Web Browser modern yang mendukung **Web Serial API** (Google Chrome, Microsoft Edge, atau Opera).

---

## ⚙️ Cara Instalasi & Menjalankan Aplikasi

1. **Instalasi Semua Dependensi**  
   Buka terminal/PowerShell di direktori proyek ini (`C:\Users\lenovo\.gemini\antigravity\scratch\posturografi-app`) lalu jalankan perintah:
   ```bash
   npm run install-all
   ```
   Perintah ini akan secara otomatis mengunduh seluruh dependensi untuk folder `backend` dan `frontend`.

2. **Jalankan Aplikasi Web**  
   Setelah instalasi selesai, jalankan server backend dan frontend secara bersamaan dengan perintah:
   ```bash
   npm start
   ```
   Website akan terbuka secara otomatis di browser Anda pada alamat:
   - **Frontend**: `http://localhost:3000`
   - **Backend API**: `http://localhost:5000`

---

## 🔌 Integrasi Hardware & Arduino Uno

### 1. Skema Pengkabelan Arduino
Aplikasi ini sudah diselaraskan dengan program Arduino Anda yang menggunakan **4 Modul HX711** untuk memperkuat data dari **8 Load Cell** (2 load cell per modul). Pin default pada Arduino Uno adalah:

- Pin **SCK** (Clock) HX711 1, 2, 3, dan 4 dihubungkan secara paralel ke **Pin Digital 2** Arduino Uno.
- Pin **DOUT** (Data Out) masing-masing modul:
  - Modul 1 (Depan Kiri / F1) ➡️ **Pin Digital 3**
  - Modul 2 (Belakang Kiri / F2) ➡️ **Pin Digital 4**
  - Modul 3 (Belakang Kanan / F3) ➡️ **Pin Digital 5**
  - Modul 4 (Depan Kanan / F4) ➡️ **Pin Digital 6**

### 2. Kalibrasi Load Cell
Sebelum menggunakan alat, pastikan Anda telah mencari nilai **Faktor Kalibrasi** (`scale`) untuk masing-masing sensor Anda.
- Pada program Arduino, atur nilai `scale = 19500.0;` sesuai hasil kalibrasi Anda agar berat yang dibaca ber-satuan Kilogram (Kg).
- Sistem akan otomatis melakukan **Auto Tare / Offset** nilai awal sesaat setelah Arduino dinyalakan (3 detik pertama tanpa beban di atas plat).

### 3. Cara Menghubungkan ke Website
1. Colokkan kabel USB Arduino Uno ke laptop/komputer.
2. Buka halaman utama website posturografi (`http://localhost:3000`).
3. Klik tombol **"Hubungkan Arduino"** di pojok kanan atas website.
4. Pilih port USB Arduino Anda (misal: `COM3`, `COM4`, dst) lalu klik **Connect**.
5. Status koneksi di website akan berubah menjadi **"Arduino Terhubung"** (Lampu Hijau) dan sistem siap menerima aliran koordinat CoP.

---

## 📝 Alur Pemeriksaan Pasien (Prosedur TA)

1. Buka menu **"Mulai Pemeriksaan"** di dashboard.
2. Lengkapi form identitas pasien (Nama, Jenis Kelamin, Usia, Tinggi, Berat, dan dugaan kelainan keseimbangan).
3. Klik **"Mulai Pemeriksaan"** untuk masuk ke panel tes.
4. Pastikan pasien berdiri tenang di tengah plat sensor.
5. Klik **"Mulai Pemeriksaan (1 Menit)"**:
   - **Fase 1 (Detik 0 - 30)**: Pasien berdiri tegak dengan mata terbuka, memandang lurus ke depan.
   - **Transisi (Detik 30)**: Bunyi beep ganda akan terdengar. Pasien segera menutup mata rapat-rapat tanpa mengubah posisi berdiri.
   - **Fase 2 (Detik 30 - 60)**: Pasien berdiri dengan mata tertutup, mempertahankan keseimbangan tubuhnya.
   - **Selesai (Detik 60)**: Melodi kemenangan pendek berbunyi. Aliran data otomatis dihentikan.
6. Klik **"Simpan Hasil & Selesai"** untuk menyimpan hasil ke database SQLite. Hasil rekam dapat Anda buka kembali kapan saja melalui menu **"Riwayat Pemeriksaan Pasien"**.
