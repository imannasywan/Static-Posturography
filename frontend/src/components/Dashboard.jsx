import React from 'react';

export default function Dashboard({ onStartExam, onViewHistory, onOpenTutorial }) {
  return (
    <div className="fade-in">
      <div className="welcome-box">
        <div className="welcome-icon-circle">
          {/* Pulse/Sine wave icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h3L9 3l6 18 3-9h3" />
          </svg>
        </div>
        
        <h2>Selamat Datang di Pemeriksaan</h2>
        <p>
          Sistem pemeriksaan keseimbangan tubuh menggunakan teknologi sensor load cell untuk analisis postur statis
        </p>

        <div className="welcome-buttons">
          <button className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }} onClick={onStartExam}>
            {/* Play Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Mulai Pemeriksaan
          </button>
          
          <button className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '15px' }} onClick={onOpenTutorial}>
            {/* Book Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Petunjuk Penggunaan
          </button>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div style={{ color: 'var(--primary)', marginBottom: '12px', fontWeight: 'bold' }}>Akurat</div>
          <p>
            Menggunakan sensor load cell presisi tinggi untuk pengukuran yang akurat dalam mendeteksi pergeseran Center of Pressure (CoP).
          </p>
        </div>
        
        <div className="feature-card">
          <div style={{ color: 'var(--primary)', marginBottom: '12px', fontWeight: 'bold' }}>Cepat</div>
          <p>
            Proses pemeriksaan yang efisien dengan pengolahan data langsung dari Perangkat dan visualisasi hasil real-time dalam 1 menit.
          </p>
        </div>
        
        <div className="feature-card">
          <div style={{ color: 'var(--primary)', marginBottom: '12px', fontWeight: 'bold' }}>Mudah</div>
          <p>
            Interface yang intuitif dengan panduan langkah-demi-langkah, ramah bagi operator dan pasien dari berbagai kalangan.
          </p>
        </div>
      </div>

      {/* Quick Access to History */}
      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={onViewHistory}>
          {/* History Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Lihat Riwayat Pemeriksaan Pasien
        </button>
      </div>
    </div>
  );
}
