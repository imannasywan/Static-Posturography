import React from 'react';

/**
 * PostureConclusionCard
 * Komponen untuk menampilkan kesimpulan analisis postur tubuh
 * berdasarkan rata-rata parameter Tahap 1 (Mata Terbuka) dan Tahap 2 (Mata Tertutup).
 * 
 * @param {Object} props
 * @param {Object} props.tahap1 - Parameter Tahap 1 { spl, aoe, velAp, velMl }
 * @param {Object} props.tahap2 - Parameter Tahap 2 { spl, aoe, velAp, velMl }
 * @param {boolean} [props.showBackButton] - Apakah menampilkan tombol "Kembali ke Dashboard"
 * @param {Function} [props.onBack] - Callback saat tombol "Kembali ke Dashboard" diklik
 */
export default function PostureConclusionCard({ tahap1, tahap2, showBackButton, onBack }) {
  // Ekstraksi nilai dengan fallback jika data belum lengkap
  const spl1 = tahap1?.spl ?? 0;
  const aoe1 = tahap1?.aoe ?? 0;
  const velAp1 = tahap1?.velAp ?? 0;
  const velMl1 = tahap1?.velMl ?? 0;

  const spl2 = tahap2?.spl ?? 0;
  const aoe2 = tahap2?.aoe ?? 0;
  const velAp2 = tahap2?.velAp ?? 0;
  const velMl2 = tahap2?.velMl ?? 0;

  // 1. Hitung Rata-rata Gabungan Kedua Kondisi
  const meanSpl = (spl1 + spl2) / 2.0;
  const meanAoe = (aoe1 + aoe2) / 2.0;

  const velEo = (velAp1 + velMl1) / 2.0;
  const velEc = (velAp2 + velMl2) / 2.0;
  const meanVelocity = (velEo + velEc) / 2.0;

  // 2. Definisikan Threshold Berdasarkan Data Tabel Pengujian
  const THRESHOLD_SPL = 4.075;       // dalam cm
  const THRESHOLD_AOE = 1.035;       // dalam cm^2
  const THRESHOLD_VELOCITY = 0.084;   // dalam cm/s

  // 3. Logika Penentu Kesimpulan Pemeriksaan Postur
  const isPerluPerhatian = (meanSpl >= THRESHOLD_SPL) || (meanAoe > THRESHOLD_AOE) || (meanVelocity > THRESHOLD_VELOCITY);
  
  const status = isPerluPerhatian ? "PERLU PERHATIAN" : "BAIK";
  const kesimpulan = isPerluPerhatian
    ? "Kontrol postur tubuh Anda memerlukan perhatian. Disarankan untuk melakukan latihan keseimbangan dan konsultasi dengan tenaga medis."
    : "Kontrol postur tubuh Anda berada dalam kondisi baik dan stabil. Pertahankan aktivitas fisik rutin Anda.";

  const statusClass = isPerluPerhatian ? "perlu-perhatian" : "baik";

  return (
    <div className={`posture-conclusion-card ${statusClass} fade-in`}>
      <h3 className="conclusion-title">Kesimpulan Pemeriksaan Postur</h3>
      
      <div className="status-box">
        <div className="status-icon">
          {/* Checkmark icon in circle (red for perhatian, green for baik) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div className="status-text-content">
          <div className="status-label">Status: {status}</div>
          <div className="status-desc">{kesimpulan}</div>
        </div>
      </div>

      <div className="parameter-section">
        <div className="parameter-section-title">Rata-rata Parameter:</div>
        <div className="parameter-grid">
          <div className="parameter-item">
            <div className="param-label">SPL</div>
            <div className="param-value">{meanSpl.toFixed(2)} cm</div>
          </div>
          <div className="parameter-item">
            <div className="param-label">AoE</div>
            <div className="param-value">{meanAoe.toFixed(4)} cm²</div>
          </div>
          <div className="parameter-item">
            <div className="param-label">Avg Velocity</div>
            <div className="param-value">{meanVelocity.toFixed(3)} cm/s</div>
          </div>
        </div>
      </div>

      {showBackButton && (
        <button className="btn btn-primary btn-kembali" onClick={onBack}>
          Kembali ke Dashboard
        </button>
      )}
    </div>
  );
}
