import React, { useState, useEffect } from 'react';
import StabilogramChart from './StabilogramChart';
import VelocityChart from './VelocityChart';
import SplChart from './SplChart';
import { calculateCopParameters } from '../utils/copMath';
import PostureConclusionCard from './PostureConclusionCard';
import { API_BASE_URL } from '../utils/apiConfig';

export default function HistoryList({ onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for showing detail modal
  const [selectedExam, setSelectedExam] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('tahap1'); // 'tahap1' or 'tahap2'

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/examinations`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Gagal mengambil riwayat:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data pemeriksaan atas nama "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/examinations/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Data berhasil dihapus.');
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data.');
    }
  };

  const handleRowClick = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/examinations/${id}`);
      if (res.ok) {
        const fullData = await res.json();
        setSelectedExam(fullData);
        setActiveDetailTab('tahap1'); // Reset to tab 1
      }
    } catch (e) {
      console.error(e);
      alert('Gagal memuat detail pemeriksaan.');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fade-in">
      <div className="history-title-row">
        <button className="btn-text" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Kembali ke Dashboard
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Riwayat Pemeriksaan Pasien</h2>
      </div>

      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Memuat data dari database SQLite...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada riwayat pemeriksaan disimpan. Silakan lakukan tes baru.
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Waktu Pemeriksaan</th>
                  <th>Nama Lengkap</th>
                  <th>Detail Pasien</th>
                  <th>Kelainan Keseimbangan?</th>
                  <th style={{ backgroundColor: 'rgba(22, 163, 74, 0.05)' }}>Tahap 1 (Mata Buka)</th>
                  <th style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>Tahap 2 (Mata Tutup)</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => (
                  <tr 
                    key={row.id} 
                    onClick={() => handleRowClick(row.id)} 
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk melihat detail grafik"
                  >
                    <td>{idx + 1}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{row.name}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{row.gender}, {row.age} thn</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.height} cm / {row.weight} kg</div>
                    </td>
                    <td>
                      <span className={`badge-disorder ${row.has_balance_disorder.toLowerCase()}`}>
                        {row.has_balance_disorder}
                      </span>
                    </td>
                    <td style={{ backgroundColor: 'rgba(22, 163, 74, 0.02)', fontSize: '12px' }}>
                      <div>SPL: <strong>{row.tahap1_spl} cm</strong></div>
                      <div>AoE: <strong>{row.tahap1_aoe} cm²</strong></div>
                    </td>
                    <td style={{ backgroundColor: 'rgba(37, 99, 235, 0.02)', fontSize: '12px' }}>
                      <div>SPL: <strong>{row.tahap2_spl} cm</strong></div>
                      <div>AoE: <strong>{row.tahap2_aoe} cm²</strong></div>
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'nowrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          Grafik
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={(e) => handleDelete(row.id, row.name, e)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL WITH GRAPH VISUALIZATION */}
      {selectedExam && (
        <div className="modal-overlay" onClick={() => setSelectedExam(null)}>
          <div 
            className="modal-content fade-in" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1000px', width: '95%' }}
          >
            <button className="modal-close-btn" onClick={() => setSelectedExam(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3 className="card-title" style={{ fontSize: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Detail Hasil Pemeriksaan: {selectedExam.name}
            </h3>

            {/* Profile Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '16px', 
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '13px'
            }}>
              <div><strong>Waktu Tes:</strong> {formatDate(selectedExam.created_at)}</div>
              <div><strong>Jenis Kelamin:</strong> {selectedExam.gender}</div>
              <div><strong>Usia:</strong> {selectedExam.age} tahun</div>
              <div><strong>Tinggi / Berat:</strong> {selectedExam.height} cm / {selectedExam.weight} kg</div>
              <div><strong>Kelainan Keseimbangan:</strong> {selectedExam.has_balance_disorder}</div>
            </div>

            {/* Posture Conclusion Card */}
            <div style={{ marginTop: '24px' }}>
              <PostureConclusionCard 
                tahap1={{
                  spl: selectedExam.tahap1_spl,
                  aoe: selectedExam.tahap1_aoe,
                  velAp: selectedExam.tahap1_vel_ap,
                  velMl: selectedExam.tahap1_vel_ml
                }}
                tahap2={{
                  spl: selectedExam.tahap2_spl,
                  aoe: selectedExam.tahap2_aoe,
                  velAp: selectedExam.tahap2_vel_ap,
                  velMl: selectedExam.tahap2_vel_ml
                }}
                showBackButton={true}
                onBack={() => {
                  setSelectedExam(null);
                  onBack();
                }}
              />
            </div>

            {/* Stage Selector Tabs */}
            <div className="flex" style={{ borderBottom: '1.5px solid var(--border-color)', marginTop: '24px', gap: '8px' }}>
              <button 
                className="btn-text" 
                style={{ 
                  padding: '8px 16px', 
                  borderBottom: activeDetailTab === 'tahap1' ? '2.5px solid var(--success)' : 'none',
                  color: activeDetailTab === 'tahap1' ? 'var(--success)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
                onClick={() => setActiveDetailTab('tahap1')}
              >
                Tahap 1: Mata Terbuka
              </button>
              
              <button 
                className="btn-text" 
                style={{ 
                  padding: '8px 16px', 
                  borderBottom: activeDetailTab === 'tahap2' ? '2.5px solid var(--primary)' : 'none',
                  color: activeDetailTab === 'tahap2' ? 'var(--primary)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
                onClick={() => setActiveDetailTab('tahap2')}
              >
                Tahap 2: Mata Tertutup
              </button>
            </div>

            {/* Tab Contents: Grid of charts and metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '20px' }}>
              
              {/* Left Column: Stabilogram Chart & Main Metrics */}
              <div>
                <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                    Stabilogram CoP - {activeDetailTab === 'tahap1' ? 'Mata Terbuka' : 'Mata Tertutup'}
                  </h4>
                  
                  <StabilogramChart 
                    points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
                    ellipse={{}}
                    width={320}
                    height={320}
                  />

                  <div className="chart-legend" style={{ marginBottom: '16px', fontSize: '11px' }}>
                    <div className="legend-item">
                      <div className="legend-color-dot" style={{ backgroundColor: '#9467bd' }} />
                      <span>Center of Pressure</span>
                    </div>
                  </div>

                  <div className="metric-highlight-box" style={{ 
                    marginTop: '12px', 
                    backgroundColor: '#f9f2ff', 
                    color: '#6b21a8', 
                    border: 'none', 
                    fontWeight: 'bold', 
                    padding: '10px 16px', 
                    borderRadius: '8px'
                  }}>
                    AoE Saat Ini: {activeDetailTab === 'tahap1' ? selectedExam.tahap1_aoe.toFixed(4) : selectedExam.tahap2_aoe.toFixed(4)} cm²
                  </div>
                </div>
              </div>

              {/* Right Column: SPL Chart & Velocity Chart */}
              <div>
                {/* SPL Chart (Grafik 1) */}
                <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                    Sway Path Length (SPL) - {activeDetailTab === 'tahap1' ? 'Mata Terbuka' : 'Mata Tertutup'}
                  </h4>
                  
                  <SplChart 
                    points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
                    width={400}
                    height={180}
                  />

                  <div className="chart-legend" style={{ marginTop: '12px', fontSize: '11px' }}>
                    <div className="legend-item">
                      <div className="legend-color-dot" style={{ backgroundColor: '#1f77b4' }} />
                      <span>Sway Path Length</span>
                    </div>
                  </div>

                  <div className="metric-highlight-box" style={{ 
                    marginTop: '12px', 
                    backgroundColor: '#e6f2ff', 
                    color: '#1e40af', 
                    border: 'none', 
                    fontWeight: 'bold', 
                    padding: '10px 16px', 
                    borderRadius: '8px'
                  }}>
                    SPL Saat Ini: {activeDetailTab === 'tahap1' ? selectedExam.tahap1_spl.toFixed(1) : selectedExam.tahap2_spl.toFixed(1)} cm
                  </div>
                </div>

                {/* Velocity Chart (Grafik 3) */}
                <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                    Fluktuasi Kecepatan CoP (AP/ML)
                  </h4>
                  
                  <VelocityChart 
                    points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
                    width={400}
                    height={185}
                  />

                  <div className="chart-legend" style={{ marginTop: '12px', fontSize: '11px' }}>
                    <div className="legend-item">
                      <div className="legend-color-dot" style={{ backgroundColor: '#1f77b4' }} />
                      <span>V-AP</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color-dot" style={{ backgroundColor: '#ff7f0e' }} />
                      <span>V-ML</span>
                    </div>
                  </div>

                  <div className="metric-highlight-box" style={{ 
                    marginTop: '12px', 
                    backgroundColor: '#effbf3', 
                    color: '#166534', 
                    border: 'none', 
                    fontWeight: 'bold', 
                    padding: '10px 16px', 
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '24px',
                    justifyContent: 'center'
                  }}>
                    <span>V-AP Rata-rata: {(activeDetailTab === 'tahap1' ? selectedExam.tahap1_vel_ap : selectedExam.tahap2_vel_ap).toFixed(3)} cm/s</span>
                    <span>V-ML Rata-rata: {(activeDetailTab === 'tahap1' ? selectedExam.tahap1_vel_ml : selectedExam.tahap2_vel_ml).toFixed(3)} cm/s</span>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedExam(null)}>
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// import React, { useState, useEffect } from 'react';
// import StabilogramChart from './StabilogramChart';
// import VelocityChart from './VelocityChart';
// import SplChart from './SplChart';
// import { calculateCopParameters } from '../utils/copMath';
// import PostureConclusionCard from './PostureConclusionCard';

// export default function HistoryList({ onBack }) {
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // State for showing detail modal
//   const [selectedExam, setSelectedExam] = useState(null);
//   const [detailLoading, setDetailLoading] = useState(false);
//   const [activeDetailTab, setActiveDetailTab] = useState('tahap1'); // 'tahap1' or 'tahap2'

//   useEffect(() => {
//     fetchHistory();
//   }, []);

//   const fetchHistory = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch('http://localhost:5000/api/examinations');
//       if (res.ok) {
//         const data = await res.json();
//         setHistory(data);
//       }
//     } catch (e) {
//       console.error('Gagal mengambil riwayat:', e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (id, name, e) => {
//     e.stopPropagation();
//     if (!window.confirm(`Apakah Anda yakin ingin menghapus data pemeriksaan atas nama "${name}"?`)) {
//       return;
//     }

//     try {
//       const res = await fetch(`http://localhost:5000/api/examinations/${id}`, {
//         method: 'DELETE'
//       });
//       if (res.ok) {
//         alert('Data berhasil dihapus.');
//         fetchHistory();
//       }
//     } catch (e) {
//       console.error(e);
//       alert('Gagal menghapus data.');
//     }
//   };

//   const handleRowClick = async (id) => {
//     try {
//       setDetailLoading(true);
//       const res = await fetch(`http://localhost:5000/api/examinations/${id}`);
//       if (res.ok) {
//         const fullData = await res.json();
//         setSelectedExam(fullData);
//         setActiveDetailTab('tahap1'); // Reset to tab 1
//       }
//     } catch (e) {
//       console.error(e);
//       alert('Gagal memuat detail pemeriksaan.');
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const formatDate = (isoString) => {
//     try {
//       const d = new Date(isoString);
//       return d.toLocaleString('id-ID', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (e) {
//       return isoString;
//     }
//   };

//   return (
//     <div className="fade-in">
//       <div className="history-title-row">
//         <button className="btn-text" onClick={onBack}>
//           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//             <line x1="19" y1="12" x2="5" y2="12"></line>
//             <polyline points="12 19 5 12 12 5"></polyline>
//           </svg>
//           Kembali ke Dashboard
//         </button>
//         <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Riwayat Pemeriksaan Pasien</h2>
//       </div>

//       <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
//         {loading ? (
//           <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
//             Memuat data dari database SQLite...
//           </div>
//         ) : history.length === 0 ? (
//           <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
//             Belum ada riwayat pemeriksaan disimpan. Silakan lakukan tes baru.
//           </div>
//         ) : (
//           <div className="history-table-container">
//             <table className="history-table">
//               <thead>
//                 <tr>
//                   <th>No</th>
//                   <th>Waktu Pemeriksaan</th>
//                   <th>Nama Lengkap</th>
//                   <th>Detail Pasien</th>
//                   <th>Kelainan Keseimbangan?</th>
//                   <th style={{ backgroundColor: 'rgba(22, 163, 74, 0.05)' }}>Tahap 1 (Mata Buka)</th>
//                   <th style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>Tahap 2 (Mata Tutup)</th>
//                   <th>Aksi</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {history.map((row, idx) => (
//                   <tr 
//                     key={row.id} 
//                     onClick={() => handleRowClick(row.id)} 
//                     style={{ cursor: 'pointer' }}
//                     title="Klik untuk melihat detail grafik"
//                   >
//                     <td>{idx + 1}</td>
//                     <td>{formatDate(row.created_at)}</td>
//                     <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{row.name}</td>
//                     <td>
//                       <div style={{ fontSize: '12px' }}>{row.gender}, {row.age} thn</div>
//                       <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.height} cm / {row.weight} kg</div>
//                     </td>
//                     <td>
//                       <span className={`badge-disorder ${row.has_balance_disorder.toLowerCase()}`}>
//                         {row.has_balance_disorder}
//                       </span>
//                     </td>
//                     <td style={{ backgroundColor: 'rgba(22, 163, 74, 0.02)', fontSize: '12px' }}>
//                       <div>SPL: <strong>{row.tahap1_spl} cm</strong></div>
//                       <div>AoE: <strong>{row.tahap1_aoe} cm²</strong></div>
//                     </td>
//                     <td style={{ backgroundColor: 'rgba(37, 99, 235, 0.02)', fontSize: '12px' }}>
//                       <div>SPL: <strong>{row.tahap2_spl} cm</strong></div>
//                       <div>AoE: <strong>{row.tahap2_aoe} cm²</strong></div>
//                     </td>
//                     <td>
//                       <div className="flex gap-2" style={{ flexWrap: 'nowrap' }}>
//                         <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
//                           Grafik
//                         </button>
//                         <button 
//                           className="btn btn-danger" 
//                           style={{ padding: '6px 12px', fontSize: '12px' }}
//                           onClick={(e) => handleDelete(row.id, row.name, e)}
//                         >
//                           Hapus
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* DETAIL MODAL WITH GRAPH VISUALIZATION */}
//       {selectedExam && (
//         <div className="modal-overlay" onClick={() => setSelectedExam(null)}>
//           <div 
//             className="modal-content fade-in" 
//             onClick={(e) => e.stopPropagation()} 
//             style={{ maxWidth: '1000px', width: '95%' }}
//           >
//             <button className="modal-close-btn" onClick={() => setSelectedExam(null)}>
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                 <line x1="18" y1="6" x2="6" y2="18"></line>
//                 <line x1="6" y1="6" x2="18" y2="18"></line>
//               </svg>
//             </button>

//             <h3 className="card-title" style={{ fontSize: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
//               Detail Hasil Pemeriksaan: {selectedExam.name}
//             </h3>

//             {/* Profile Summary */}
//             <div style={{ 
//               display: 'grid', 
//               gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
//               gap: '16px', 
//               backgroundColor: '#f8fafc',
//               padding: '16px',
//               borderRadius: '8px',
//               marginTop: '16px',
//               fontSize: '13px'
//             }}>
//               <div><strong>Waktu Tes:</strong> {formatDate(selectedExam.created_at)}</div>
//               <div><strong>Jenis Kelamin:</strong> {selectedExam.gender}</div>
//               <div><strong>Usia:</strong> {selectedExam.age} tahun</div>
//               <div><strong>Tinggi / Berat:</strong> {selectedExam.height} cm / {selectedExam.weight} kg</div>
//               <div><strong>Kelainan Keseimbangan:</strong> {selectedExam.has_balance_disorder}</div>
//             </div>

//             {/* Posture Conclusion Card */}
//             <div style={{ marginTop: '24px' }}>
//               <PostureConclusionCard 
//                 tahap1={{
//                   spl: selectedExam.tahap1_spl,
//                   aoe: selectedExam.tahap1_aoe,
//                   velAp: selectedExam.tahap1_vel_ap,
//                   velMl: selectedExam.tahap1_vel_ml
//                 }}
//                 tahap2={{
//                   spl: selectedExam.tahap2_spl,
//                   aoe: selectedExam.tahap2_aoe,
//                   velAp: selectedExam.tahap2_vel_ap,
//                   velMl: selectedExam.tahap2_vel_ml
//                 }}
//                 showBackButton={true}
//                 onBack={() => {
//                   setSelectedExam(null);
//                   onBack();
//                 }}
//               />
//             </div>

//             {/* Stage Selector Tabs */}
//             <div className="flex" style={{ borderBottom: '1.5px solid var(--border-color)', marginTop: '24px', gap: '8px' }}>
//               <button 
//                 className="btn-text" 
//                 style={{ 
//                   padding: '8px 16px', 
//                   borderBottom: activeDetailTab === 'tahap1' ? '2.5px solid var(--success)' : 'none',
//                   color: activeDetailTab === 'tahap1' ? 'var(--success)' : 'var(--text-muted)',
//                   textDecoration: 'none',
//                   fontWeight: 'bold'
//                 }}
//                 onClick={() => setActiveDetailTab('tahap1')}
//               >
//                 Tahap 1: Mata Terbuka
//               </button>
              
//               <button 
//                 className="btn-text" 
//                 style={{ 
//                   padding: '8px 16px', 
//                   borderBottom: activeDetailTab === 'tahap2' ? '2.5px solid var(--primary)' : 'none',
//                   color: activeDetailTab === 'tahap2' ? 'var(--primary)' : 'var(--text-muted)',
//                   textDecoration: 'none',
//                   fontWeight: 'bold'
//                 }}
//                 onClick={() => setActiveDetailTab('tahap2')}
//               >
//                 Tahap 2: Mata Tertutup
//               </button>
//             </div>

//             {/* Tab Contents: Grid of charts and metrics */}
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '20px' }}>
              
//               {/* Left Column: Stabilogram Chart & Main Metrics */}
//               <div>
//                 <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
//                   <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
//                     Stabilogram CoP - {activeDetailTab === 'tahap1' ? 'Mata Terbuka' : 'Mata Tertutup'}
//                   </h4>
                  
//                   <StabilogramChart 
//                     points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
//                     ellipse={{}}
//                     width={320}
//                     height={320}
//                   />

//                   <div className="chart-legend" style={{ marginBottom: '16px', fontSize: '11px' }}>
//                     <div className="legend-item">
//                       <div className="legend-color-dot" style={{ backgroundColor: '#9467bd' }} />
//                       <span>Center of Pressure</span>
//                     </div>
//                   </div>

//                   <div className="metric-highlight-box" style={{ 
//                     marginTop: '12px', 
//                     backgroundColor: '#f9f2ff', 
//                     color: '#6b21a8', 
//                     border: 'none', 
//                     fontWeight: 'bold', 
//                     padding: '10px 16px', 
//                     borderRadius: '8px'
//                   }}>
//                     AoE Saat Ini: {activeDetailTab === 'tahap1' ? selectedExam.tahap1_aoe.toFixed(4) : selectedExam.tahap2_aoe.toFixed(4)} cm²
//                   </div>
//                 </div>
//               </div>

//               {/* Right Column: SPL Chart & Velocity Chart */}
//               <div>
//                 {/* SPL Chart (Grafik 1) */}
//                 <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none', marginBottom: '20px' }}>
//                   <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
//                     Sway Path Length (SPL) - {activeDetailTab === 'tahap1' ? 'Mata Terbuka' : 'Mata Tertutup'}
//                   </h4>
                  
//                   <SplChart 
//                     points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
//                     width={400}
//                     height={180}
//                   />

//                   <div className="chart-legend" style={{ marginTop: '12px', fontSize: '11px' }}>
//                     <div className="legend-item">
//                       <div className="legend-color-dot" style={{ backgroundColor: '#1f77b4' }} />
//                       <span>Sway Path Length</span>
//                     </div>
//                   </div>

//                   <div className="metric-highlight-box" style={{ 
//                     marginTop: '12px', 
//                     backgroundColor: '#e6f2ff', 
//                     color: '#1e40af', 
//                     border: 'none', 
//                     fontWeight: 'bold', 
//                     padding: '10px 16px', 
//                     borderRadius: '8px'
//                   }}>
//                     SPL Saat Ini: {activeDetailTab === 'tahap1' ? selectedExam.tahap1_spl.toFixed(1) : selectedExam.tahap2_spl.toFixed(1)} cm
//                   </div>
//                 </div>

//                 {/* Velocity Chart (Grafik 3) */}
//                 <div className="card chart-card" style={{ padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
//                   <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
//                     Fluktuasi Kecepatan CoP (AP/ML)
//                   </h4>
                  
//                   <VelocityChart 
//                     points={activeDetailTab === 'tahap1' ? selectedExam.raw_data_tahap1 : selectedExam.raw_data_tahap2}
//                     width={400}
//                     height={185}
//                   />

//                   <div className="chart-legend" style={{ marginTop: '12px', fontSize: '11px' }}>
//                     <div className="legend-item">
//                       <div className="legend-color-dot" style={{ backgroundColor: '#1f77b4' }} />
//                       <span>V-AP</span>
//                     </div>
//                     <div className="legend-item">
//                       <div className="legend-color-dot" style={{ backgroundColor: '#ff7f0e' }} />
//                       <span>V-ML</span>
//                     </div>
//                   </div>

//                   <div className="metric-highlight-box" style={{ 
//                     marginTop: '12px', 
//                     backgroundColor: '#effbf3', 
//                     color: '#166534', 
//                     border: 'none', 
//                     fontWeight: 'bold', 
//                     padding: '10px 16px', 
//                     borderRadius: '8px',
//                     display: 'flex',
//                     gap: '24px',
//                     justifyContent: 'center'
//                   }}>
//                     <span>V-AP Rata-rata: {(activeDetailTab === 'tahap1' ? selectedExam.tahap1_vel_ap : selectedExam.tahap2_vel_ap).toFixed(3)} cm/s</span>
//                     <span>V-ML Rata-rata: {(activeDetailTab === 'tahap1' ? selectedExam.tahap1_vel_ml : selectedExam.tahap2_vel_ml).toFixed(3)} cm/s</span>
//                   </div>
//                 </div>
//               </div>

//             </div>

//             <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
//               <button className="btn btn-secondary" onClick={() => setSelectedExam(null)}>
//                 Tutup Detail
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
