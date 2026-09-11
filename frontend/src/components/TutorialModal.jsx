import React from 'react';

export default function TutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h3 className="card-title" style={{ fontSize: '22px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          Petunjuk Penggunaan Sistem Posturografi
        </h3>

        <div style={{ marginTop: '20px' }}>
          <div className="tutorial-step">
            <h4>Langkah 1: Hubungkan Hardware Perangkat</h4>
            <p>
              Hubungkan perangkat Anda ke komputer menggunakan kabel USB. Pastikan hardware 2 plat plate, 8 sensor load cell, dan 4 modul HX711 sudah terpasang dan terkalibrasi dengan benar sesuai skema PIN pada kode program perangkat.
            </p>
          </div>

          <div className="tutorial-step">
            <h4>Langkah 2: Persiapan Pemeriksaan</h4>
            <p>
              Isi biodata diri pasien pada formulir pendaftaran. Posisikan pasien berdiri tegak dengan pijakan kaki sesuai dengan gambar kaki yang ada di plate, pandangan lurus kedepan, dan badan rileks.
            </p>
          </div>

          <div className="tutorial-step">
            <h4>Langkah 3: Koneksikan Website dengan Perangkat</h4>
            <p>
              Pada halaman pemeriksaan, klik tombol <strong>"Hubungkan Perangkat"</strong> di pojok kanan atas. Browser akan memunculkan pop-up pemilihan port. Pilih port serial perangkat Anda (misal: <code>COM3</code> atau <code>COM4</code>) dan klik <strong>Connect</strong>. Baud rate yang digunakan adalah <strong>115200</strong>.
            </p>
          </div>

          <div className="tutorial-step">
            <h4>Langkah 4: Lakukan Pemeriksaan</h4>
            <p>
              Klik <strong>"Mulai Pemeriksaan"</strong>. Tes keseimbangan terdiri dari dua tahap berturut-turut:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              <li><strong>Tahap 1 (30 detik)</strong>: Berdiri tegak dengan kedua kaki, mata terbuka, pandang lurus ke depan.</li>
              <li><strong>Tahap 2 (30 detik)</strong>: Berdiri dengan posisi sama, tetapi mata ditutup rapat. Pertahankan keseimbangan.</li>
            </ul>
            <p style={{ marginTop: '8px' }}>
              Sistem akan memutar bunyi/suara isyarat saat perpindahan tahap dan ketika tes selesai. Grafik stabilogram dan kecepatan akan diupdate secara real-time.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
