import React, { useState, useEffect, useRef } from 'react';
import StabilogramChart from './StabilogramChart';
import VelocityChart from './VelocityChart';
import SplChart from './SplChart';
import { calculateCopParameters } from '../utils/copMath';
import { socket } from '../utils/socket'; // client socket
import webSerialManager from '../utils/webSerial';
import PostureConclusionCard from './PostureConclusionCard';

// Audio Beep Generator using Web Audio API
function playSoundCue(type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

    if (type === 'start') {
      // Beep tunggal sedang
      oscillator.frequency.value = 523.25; // C5
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 400);
    } else if (type === 'switch') {
      // Beep ganda tinggi-rendah
      oscillator.frequency.value = 880; // A5
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 440; // A4
        setTimeout(() => {
          oscillator.stop();
          audioCtx.close();
        }, 300);
      }, 150);
    } else if (type === 'finish') {
      // Nada kemenangan melodik pendek
      oscillator.frequency.value = 523.25; // C5
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 659.25; // E5
        setTimeout(() => {
          oscillator.frequency.value = 783.99; // G5
          setTimeout(() => {
            oscillator.frequency.value = 1046.50; // C6
            setTimeout(() => {
              oscillator.stop();
              audioCtx.close();
            }, 300);
          }, 150);
        }, 150);
      }, 150);
    }
  } catch (e) {
    console.warn('Audio Context error (usually blocked by browser policy before user interaction):', e);
  }
}

export default function TestProgress({ patientData, onCancel, onSaveComplete, isSerialConnected }) {
  const [testState, setTestState] = useState('idle'); // 'idle', 'running-tahap1', 'running-tahap2', 'completed'
  const [totalTimeLeft, setTotalTimeLeft] = useState(60); // 60s total
  const [stageTimeLeft, setStageTimeLeft] = useState(30); // 30s per stage
  
  // Data points
  const [pointsTahap1, setPointsTahap1] = useState([]);
  const [pointsTahap2, setPointsTahap2] = useState([]);
  
  // Live computed parameters
  const [paramsTahap1, setParamsTahap1] = useState({ spl: 0, aoe: 0, velAp: 0, velMl: 0, ellipse: { a: 0, b: 0, theta: 0, cx: 0, cy: 0 } });
  const [paramsTahap2, setParamsTahap2] = useState({ spl: 0, aoe: 0, velAp: 0, velMl: 0, ellipse: { a: 0, b: 0, theta: 0, cx: 0, cy: 0 } });

  // Use refs to avoid closures issues in serial/websocket callbacks
  const stateRef = useRef('idle');
  const points1Ref = useRef([]);
  const points2Ref = useRef([]);
  const startTimestamp1 = useRef(null);
  const startTimestamp2 = useRef(null);
  const timerInterval = useRef(null);

  // Keep stateRef synced
  useEffect(() => {
    stateRef.current = testState;
  }, [testState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDataStream();
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  const startDataStream = (activeStage) => {
    // 1. WebSocket simulator if serial is not connected
    if (!isSerialConnected) {
      const phaseNum = activeStage === 'running-tahap1' ? 1 : 2;
      socket.emit('start-simulation', {
        phase: phaseNum,
        hasDisorder: patientData.hasBalanceDisorder === 'Ya'
      });
      
      socket.off('cop-data');
      socket.on('cop-data', handleIncomingCopData);
    } else {
      // 2. Web Serial API: register listener on the manager
      webSerialManager.registerListener(
        (data) => {
          // Adjust weight using form weight
          data.w = parseFloat(patientData.weight);
          handleIncomingCopData(data);
        },
        (err) => console.error('Serial connection error during test:', err)
      );
    }
  };

  const stopDataStream = () => {
    if (!isSerialConnected) {
      socket.emit('stop-simulation');
      socket.off('cop-data');
    } else {
      webSerialManager.unregisterListener();
    }
  };

  // Handler data masuk
  const handleIncomingCopData = (data) => {
    const currentState = stateRef.current;
    
    const xVal = parseFloat(data.x);
    const yVal = parseFloat(data.y);
    
    // PENGAMAN: Cek apakah koordinat masuk akal (Batas fisik platform l=33, w=17, offset X ~24)
    if (xVal < 0 || xVal > 50 || yVal < -20 || yVal > 20) {
      console.log(`[INFO] Data noise terdeteksi (X: ${xVal} | Y: ${yVal}). Otomatis diabaikan.`);
      return;
    }
    
    // Pastikan data memiliki t (timestamp) untuk kalkulasi kecepatan instan
    const dataWithTimestamp = {
      ...data,
      x: xVal,
      y: yVal,
      t: data.t || Date.now()
    };
    
    if (currentState === 'running-tahap1') {
      const pointsLen = points1Ref.current.length;
      // PENGAMAN: Cek apakah sampel pertama tidak stabil/noise
      if (pointsLen === 0 && (xVal < 0 || xVal > 50 || yVal < -20 || yVal > 20)) {
        console.log("[INFO] Sampel pertama tidak stabil/noise. Otomatis diabaikan.");
        return;
      }
      
      const updated = [...points1Ref.current, dataWithTimestamp];
      points1Ref.current = updated;
      setPointsTahap1(updated);
      
      // Hitung parameter real-time (durasi elapsed = 30 - stageTimeLeft)
      const elapsed = startTimestamp1.current ? Math.max(0.1, (Date.now() - startTimestamp1.current) / 1000) : 30.0;
      const computed = calculateCopParameters(updated, Math.min(30, elapsed));
      setParamsTahap1(computed);
      
    } else if (currentState === 'running-tahap2') {
      const pointsLen = points2Ref.current.length;
      // PENGAMAN: Cek apakah sampel pertama tidak stabil/noise
      if (pointsLen === 0 && (xVal < 0 || xVal > 50 || yVal < -20 || yVal > 20)) {
        console.log("[INFO] Sampel pertama tidak stabil/noise. Otomatis diabaikan.");
        return;
      }
      
      const updated = [...points2Ref.current, dataWithTimestamp];
      points2Ref.current = updated;
      setPointsTahap2(updated);
      
      const elapsed = startTimestamp2.current ? Math.max(0.1, (Date.now() - startTimestamp2.current) / 1000) : 0.1;
      const computed = calculateCopParameters(updated, Math.min(30, elapsed));
      setParamsTahap2(computed);
    }
  };

  // Mulai Pemeriksaan
  const handleStartTest = () => {
    playSoundCue('start');
    setTestState('running-tahap1');
    setPointsTahap1([]);
    setPointsTahap2([]);
    points1Ref.current = [];
    points2Ref.current = [];
    setTotalTimeLeft(60);
    setStageTimeLeft(30);
    startTimestamp1.current = Date.now();
    startTimestamp2.current = null;

    startDataStream('running-tahap1');

    timerInterval.current = setInterval(() => {
      // 1. Kurangi sisa waktu total
      setTotalTimeLeft((prevTotal) => {
        if (prevTotal <= 1) return 0;
        return prevTotal - 1;
      });

      // 2. Kurangi sisa waktu tahap aktif dan tangani transisi
      setStageTimeLeft((prevStage) => {
        const nextStage = prevStage - 1;

        // Transisi dari Tahap 1 ke Tahap 2
        if (stateRef.current === 'running-tahap1' && nextStage <= 0) {
          playSoundCue('switch');
          setTestState('running-tahap2');
          startTimestamp2.current = Date.now(); // reset waktu untuk matematika tahap 2
          
          if (!isSerialConnected) {
            startDataStream('running-tahap2');
          }
          return 30; // Reset timer tahap ke 30s
        }

        // Tes selesai saat Tahap 2 habis
        if (stateRef.current === 'running-tahap2' && nextStage <= 0) {
          playSoundCue('finish');
          clearInterval(timerInterval.current);
          setTestState('completed');
          stopDataStream();
          return 0;
        }

        return nextStage;
      });
    }, 1000);
  };

  // Batalkan Tes
  const handleCancelTest = () => {
    stopDataStream();
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    onCancel();
  };

  // Simpan Hasil ke DB SQLite
  const handleSaveResult = async () => {
    const payload = {
      name: patientData.name,
      gender: patientData.gender,
      age: parseInt(patientData.age),
      height: parseFloat(patientData.height),
      weight: parseFloat(patientData.weight),
      has_balance_disorder: patientData.hasBalanceDisorder,
      tahap1_spl: paramsTahap1.spl,
      tahap1_aoe: paramsTahap1.aoe,
      tahap1_vel_ap: paramsTahap1.velAp,
      tahap1_vel_ml: paramsTahap1.velMl,
      tahap2_spl: paramsTahap2.spl,
      tahap2_aoe: paramsTahap2.aoe,
      tahap2_vel_ap: paramsTahap2.velAp,
      tahap2_vel_ml: paramsTahap2.velMl,
      raw_data_tahap1: pointsTahap1,
      raw_data_tahap2: pointsTahap2
    };

    try {
      const response = await fetch('http://localhost:5000/api/examinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert('Data pemeriksaan berhasil disimpan ke database MySQL Laragon.');
        onSaveComplete();
      } else {
        const err = await response.json();
        alert('Gagal menyimpan data: ' + err.error);
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan koneksi server saat menyimpan data.');
    }
  };

  // Helper format waktu MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dapatkan poin aktif berdasarkan state untuk visualisasi grafik
  const activePoints = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? pointsTahap2 
    : pointsTahap1;

  const activeEllipse = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? paramsTahap2.ellipse 
    : paramsTahap1.ellipse;

  const activeAoE = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? paramsTahap2.aoe 
    : paramsTahap1.aoe;

  const activeSpl = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? paramsTahap2.spl 
    : paramsTahap1.spl;

  const activeVelAp = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? paramsTahap2.velAp 
    : paramsTahap1.velAp;

  const activeVelMl = testState === 'running-tahap2' || (testState === 'completed' && pointsTahap2.length > 0)
    ? paramsTahap2.velMl 
    : paramsTahap1.velMl;

  return (
    <div className="fade-in">
      <div className="exam-header-bar">
        <div className="patient-info">
          <h3>Pemeriksaan Berlangsung</h3>
          <p>Pasien: {patientData.name}</p>
        </div>
        
        <div className="timers-wrapper">
          <div className="timer-box total">
            <div className="timer-label">Waktu Total</div>
            <div className="timer-value">{formatTime(totalTimeLeft)}</div>
          </div>
          
          <div className="timer-box stage">
            <div className="timer-label">
              {testState === 'running-tahap1' ? 'Tahap 1' : testState === 'running-tahap2' ? 'Tahap 2' : 'Tahap Selesai'}
            </div>
            <div className="timer-value">{formatTime(stageTimeLeft)}</div>
          </div>
        </div>
      </div>

      <div className="exam-layout">
        
        {/* PANEL KIRI: Prosedur */}
        <div className="exam-sidebar">
          <div className="card procedure-card" style={{ marginBottom: 0 }}>
            <h3 className="card-title" style={{ fontSize: '16px' }}>Prosedur Pelaksanaan Pemeriksaan</h3>
            
            {/* TAHAP 1 CARD */}
            <div className={`stage-card ${testState === 'running-tahap1' ? 'active' : pointsTahap1.length > 0 ? 'completed' : 'pending'}`}>
              {pointsTahap1.length > 0 && testState !== 'running-tahap1' && (
                <span className="stage-badge">Selesai</span>
              )}
              {testState === 'running-tahap1' && (
                <span className="stage-badge">Sedang Berlangsung</span>
              )}
              <div className="stage-header">
                <div className="stage-icon">
                  {pointsTahap1.length > 0 && testState !== 'running-tahap1' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </div>
                <div className="stage-info">
                  <div className="stage-title">Tahap 1: Berdiri dengan 2 Kaki Mata Terbuka</div>
                  <div className="stage-desc">Berdiri tegak dengan kedua kaki, mata terbuka, pandang lurus ke depan. Durasi: 30 detik.</div>
                </div>
              </div>

              {/* Masing-masing metrik tahap 1 */}
              {(pointsTahap1.length > 0 || testState === 'running-tahap1') && (
                <div className="stage-metrics">
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">SPL:</span>
                    <span className="stage-metric-val">{paramsTahap1.spl} cm</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">AoE:</span>
                    <span className="stage-metric-val">{paramsTahap1.aoe} cm²</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">Avg Velocity (AP):</span>
                    <span className="stage-metric-val">{paramsTahap1.velAp} cm/s</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">Avg Velocity (ML):</span>
                    <span className="stage-metric-val">{paramsTahap1.velMl} cm/s</span>
                  </div>
                </div>
              )}
            </div>

            {/* TAHAP 2 CARD */}
            <div className={`stage-card ${testState === 'running-tahap2' ? 'active' : testState === 'completed' ? 'completed' : 'pending'}`}>
              {testState === 'completed' && (
                <span className="stage-badge">Selesai</span>
              )}
              {testState === 'running-tahap2' && (
                <span className="stage-badge">Sedang Berlangsung</span>
              )}
              <div className="stage-header">
                <div className="stage-icon">
                  {testState === 'completed' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  ) : (
                    // Eye off icon
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </div>
                <div className="stage-info">
                  <div className="stage-title">Tahap 2: Berdiri dengan 2 Kaki Mata Tertutup</div>
                  <div className="stage-desc">Berdiri dengan kedua kaki, mata tertutup, pertahankan keseimbangan. Durasi: 30 detik.</div>
                </div>
              </div>

              {/* Masing-masing metrik tahap 2 */}
              {(pointsTahap2.length > 0 || testState === 'running-tahap2') && (
                <div className="stage-metrics">
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">SPL:</span>
                    <span className="stage-metric-val">{paramsTahap2.spl} cm</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">AoE:</span>
                    <span className="stage-metric-val">{paramsTahap2.aoe} cm²</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">Avg Velocity (AP):</span>
                    <span className="stage-metric-val">{paramsTahap2.velAp} cm/s</span>
                  </div>
                  <div className="stage-metric-item">
                    <span className="stage-metric-label">Avg Velocity (ML):</span>
                    <span className="stage-metric-val">{paramsTahap2.velMl} cm/s</span>
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFIKASI SELESAI */}
            {testState === 'completed' && (
              <div className="success-alert fade-in">
                <div className="success-alert-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div className="success-alert-text">
                  <h4>Pemeriksaan Selesai!</h4>
                  <p>Semua tahap telah berhasil direkam. Lihat kesimpulan dan simpan hasil di bawah.</p>
                </div>
              </div>
            )}

            {/* PROGRESS BAR */}
            <div className="progress-container">
              <div className="progress-header">
                <span>Progress Keseluruhan</span>
                <span>
                  {testState === 'idle' ? 'Tahap 0 dari 2' : testState === 'running-tahap1' ? 'Tahap 1 dari 2' : 'Tahap 2 dari 2'}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill"
                  style={{
                    width: 
                      testState === 'idle' ? '0%' : 
                      testState === 'running-tahap1' ? `${((30 - stageTimeLeft) / 60) * 100}%` :
                      testState === 'running-tahap2' ? `${(30 + (30 - stageTimeLeft)) / 60 * 100}%` : 
                      '100%'
                  }}
                />
              </div>
              <div className="progress-sub">
                {testState === 'idle' ? 'Belum dimulai' : 
                 testState === 'running-tahap1' ? `Progress tahap saat ini: ${Math.round((30 - stageTimeLeft) / 30 * 100)}%` : 
                 testState === 'running-tahap2' ? `Progress tahap saat ini: ${Math.round((30 - stageTimeLeft) / 30 * 100)}%` : 
                 'Pemeriksaan 100% Selesai'}
              </div>
            </div>

            {/* CONTROLS */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {testState === 'idle' && (
                <button className="btn btn-primary" onClick={handleStartTest} style={{ width: '100%' }}>
                  Mulai Pemeriksaan (1 Menit)
                </button>
              )}
              
              {testState.startsWith('running') && (
                <button className="btn btn-danger" onClick={handleCancelTest} style={{ width: '100%' }}>
                  Batalkan Pemeriksaan
                </button>
              )}

              {testState === 'completed' && (
                <>
                  <button className="btn btn-primary" onClick={handleSaveResult} style={{ width: '100%', backgroundColor: 'var(--success)' }}>
                    Simpan Hasil & Selesai
                  </button>
                  <button className="btn btn-secondary" onClick={handleStartTest} style={{ width: '100%' }}>
                    Tes Ulang
                  </button>
                  <button className="btn btn-danger" onClick={handleCancelTest} style={{ width: '100%' }}>
                    Keluar ke Formulir
                  </button>
                </>
              )}
            </div>

          </div>
        </div>

        {/* PANEL KANAN: Grafik */}
        <div className="exam-main">
          {testState === 'completed' && (
            <PostureConclusionCard 
              tahap1={paramsTahap1}
              tahap2={paramsTahap2}
            />
          )}
          
          {/* SPL Card (Grafik 1) */}
          <div className="card chart-card" style={{ marginBottom: 0 }}>
            <div className="chart-header">
              <h3 className="card-title" style={{ fontSize: '15px', marginBottom: 0 }}>
                Grafik 1: Sway Path Length (SPL)
              </h3>
            </div>
            
            <div className="chart-subtitle">
              Akumulasi panjang lintasan pergeseran Center of Pressure (CoP) terhadap waktu.
            </div>

            <SplChart 
              points={activePoints} 
            />

            <div className="chart-legend" style={{ marginBottom: '16px' }}>
              <div className="legend-item">
                <div className="legend-color-dot" style={{ backgroundColor: '#1f77b4' }} />
                <span>Sway Path Length</span>
              </div>
            </div>

            <div className="metric-highlight-box" style={{ 
              marginTop: '16px', 
              backgroundColor: '#e0f2fe', 
              color: '#0f172a', 
              border: 'none', 
              fontWeight: 'bold', 
              padding: '8px 16px', 
              borderRadius: '20px', 
              display: 'inline-block',
              width: 'auto',
              fontSize: '14px',
              fontFamily: '"Plus Jakarta Sans", sans-serif'
            }}>
              <span>SPL Saat Ini: {activeSpl.toFixed(1)} cm</span>
            </div>
          </div>

          {/* Stabilogram Card */}
          <div className="card chart-card" style={{ marginBottom: 0 }}>
            <div className="chart-header">
              <h3 className="card-title" style={{ fontSize: '15px', marginBottom: 0 }}>
                Grafik 2: Area of Ellipse (Stabilogram)
              </h3>
            </div>
            
            <div className="chart-subtitle">
              Visualisasi pergeseran Center of Pressure (CoP).
            </div>

            <StabilogramChart 
              points={activePoints} 
              ellipse={activeEllipse} 
            />

            <div className="chart-legend" style={{ marginBottom: '16px' }}>
              <div className="legend-item">
                <div className="legend-color-dot" style={{ backgroundColor: '#9467bd' }} />
                <span>Center of Pressure</span>
              </div>
            </div>

            <div className="metric-highlight-box" style={{ 
              marginTop: '16px', 
              backgroundColor: '#faf5ff', 
              color: '#0f172a', 
              border: 'none', 
              fontWeight: 'bold', 
              padding: '8px 16px', 
              borderRadius: '20px', 
              display: 'inline-block',
              width: 'auto',
              fontSize: '14px',
              fontFamily: '"Plus Jakarta Sans", sans-serif'
            }}>
              <span>AoE Saat Ini: {activeAoE.toFixed(4)} cm²</span>
            </div>
          </div>

          {/* Velocity Card */}
          <div className="card chart-card" style={{ marginBottom: 0 }}>
            <div className="chart-header">
              <h3 className="card-title" style={{ fontSize: '15px', marginBottom: 0 }}>
                Grafik 3: Average CoP Velocity
              </h3>
            </div>

            <div className="chart-subtitle">
              Fluktuasi kecepatan koreksi postural di sepanjang sumbu AP (Biru) dan ML (Kuning).
            </div>

            <VelocityChart points={activePoints} />

            <div className="chart-legend" style={{ marginBottom: '16px' }}>
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
              marginTop: '16px', 
              backgroundColor: '#f0fdf4', 
              color: '#0f172a', 
              border: 'none', 
              fontWeight: 'bold', 
              padding: '8px 16px', 
              borderRadius: '20px', 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '24px',
              width: 'max-content',
              fontSize: '14px',
              fontFamily: '"Plus Jakarta Sans", sans-serif'
            }}>
              <span>V-AP Rata-rata: {activeVelAp.toFixed(3)} cm/s</span>
              <span>V-ML Rata-rata: {activeVelMl.toFixed(3)} cm/s</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
