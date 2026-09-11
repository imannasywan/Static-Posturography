import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import PatientForm from './components/PatientForm';
import TestProgress from './components/TestProgress';
import HistoryList from './components/HistoryList';
import TutorialModal from './components/TutorialModal';
import { socket } from './utils/socket';
import webSerialManager from './utils/webSerial';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'form', 'exam', 'history'
  const [patientData, setPatientData] = useState(null);
  
  // Connection States
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [serialError, setSerialError] = useState(null);
  
  // Modal State
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Connect WebSockets automatically on mount
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle Arduino connection via Web Serial API
  const handleConnectSerial = async () => {
    setSerialError(null);
    try {
      await webSerialManager.connect(
        115200, 
        (data) => {
          // Kita terima data serial, di-forward ke WS jika dibutuhkan,
          // tapi biasanya TestProgress.jsx yang akan menangani pembacaan datanya.
        },
        (err) => {
          setSerialError(err.message);
          setIsSerialConnected(false);
        }
      );
      setIsSerialConnected(true);
    } catch (e) {
      setSerialError(e.message || 'Koneksi dibatalkan atau gagal.');
      setIsSerialConnected(false);
    }
  };

  const handleDisconnectSerial = async () => {
    await webSerialManager.disconnect();
    setIsSerialConnected(false);
  };

  const handleStartExamFlow = () => {
    setCurrentView('form');
  };

  const handlePatientFormSubmit = (data) => {
    setPatientData(data);
    setCurrentView('exam');
  };

  return (
    <div className="app-container">
      {/* HEADER UTAMA APLIKASI (Sesuai Figma Header) */}
      <header className="app-header">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
          <div className="brand-icon-wrapper">
            {/* Waveform/Pulse Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h3L9 3l6 18 3-9h3" />
            </svg>
          </div>
          <div className="brand-text">
            <h1>Rancang Bangun Static Posturografi</h1>
            <p>Berbasis Sensor Load Cell</p>
          </div>
        </div>

        {/* Global Connection Controls */}
        <div className="header-actions">
          {webSerialManager.isSupported() ? (
            <div className="connection-controls">
              <div className="status-dot-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <span className={`status-dot ${isSerialConnected ? 'connected' : 'disconnected'}`} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {isSerialConnected ? 'Perangkat Terhubung' : 'Perangkat Terputus'}
                </span>
              </div>
              
              {isSerialConnected ? (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleDisconnectSerial}>
                  Putuskan Koneksi
                </button>
              ) : (
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleConnectSerial}>
                  Hubungkan Perangkat
                </button>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Mode Simulator (Web Serial tidak didukung browser ini)
            </span>
          )}

          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setIsTutorialOpen(true)}>
            Panduan
          </button>
        </div>
      </header>

      {/* TAMPILAN INTERAKTIF UTAMA */}
      <main className="app-content">
        {serialError && (
          <div className="card fade-in" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#b91c1c', padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span><strong>Pemberitahuan Serial:</strong> {serialError}</span>
            <button style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setSerialError(null)}>tutup</button>
          </div>
        )}

        {currentView === 'dashboard' && (
          <Dashboard 
            onStartExam={handleStartExamFlow}
            onViewHistory={() => setCurrentView('history')}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        )}

        {currentView === 'form' && (
          <PatientForm 
            onBack={() => setCurrentView('dashboard')}
            onSubmit={handlePatientFormSubmit}
          />
        )}

        {currentView === 'exam' && (
          <TestProgress 
            patientData={patientData}
            isSerialConnected={isSerialConnected}
            onCancel={() => setCurrentView('form')}
            onSaveComplete={() => setCurrentView('history')}
          />
        )}

        {currentView === 'history' && (
          <HistoryList 
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {/* Tutorial / Panduan Modal */}
      <TutorialModal 
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
