import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

// Konfigurasi koneksi MySQL Server (Default XAMPP)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Kosong secara default di XAMPP
};

let dbPool = null;

async function initializeDatabase() {
  try {
    // 1. Hubungkan ke MySQL Server tanpa memilih database terlebih dahulu
    const tempConnection = await mysql.createConnection(dbConfig);
    
    // 2. Buat database jika belum ada di phpMyAdmin
    await tempConnection.query('CREATE DATABASE IF NOT EXISTS posturography');
    console.log('Database "posturography" terverifikasi / dibuat.');
    await tempConnection.end();

    // 3. Buat Connection Pool untuk database posturography
    dbPool = mysql.createPool({
      ...dbConfig,
      database: 'posturography',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. Buat tabel examinations jika belum ada
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS examinations (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        gender VARCHAR(50) NOT NULL,
        age INT NOT NULL,
        height DOUBLE NOT NULL,
        weight DOUBLE NOT NULL,
        has_balance_disorder VARCHAR(10) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Parameter Tahap 1 (Mata Terbuka)
        tahap1_spl DOUBLE,
        tahap1_aoe DOUBLE,
        tahap1_vel_ap DOUBLE,
        tahap1_vel_ml DOUBLE,
        
        -- Parameter Tahap 2 (Mata Tertutup)
        tahap2_spl DOUBLE,
        tahap2_aoe DOUBLE,
        tahap2_vel_ap DOUBLE,
        tahap2_vel_ml DOUBLE,
        
        -- Koordinat mentah CoP dalam format teks JSON
        raw_data_tahap1 LONGTEXT,
        raw_data_tahap2 LONGTEXT,
        
        PRIMARY KEY (id)
      )
    `);
    console.log('Tabel "examinations" siap digunakan di database MySQL.');
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL Server:', err.message);
    console.error('👉 Pastikan XAMPP (Module MySQL) sudah di-START!');
  }
}

initializeDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Batas payload besar untuk data koordinat mentah

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ==========================================
// REST API Endpoints (MySQL)
// ==========================================

// 1. Ambil semua riwayat pasien (tanpa data koordinat besar agar loading cepat)
app.get('/api/examinations', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database MySQL tidak terhubung. Jalankan MySQL di XAMPP.' });
  }

  const query = `
    SELECT id, name, gender, age, height, weight, has_balance_disorder, created_at,
           tahap1_spl, tahap1_aoe, tahap1_vel_ap, tahap1_vel_ml,
           tahap2_spl, tahap2_aoe, tahap2_vel_ap, tahap2_vel_ml
    FROM examinations
    ORDER BY created_at DESC
  `;

  try {
    const [rows] = await dbPool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Ambil detail pemeriksaan spesifik (dengan data koordinat mentah untuk render grafik)
app.get('/api/examinations/:id', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database MySQL tidak terhubung.' });
  }

  const { id } = req.params;
  try {
    const [rows] = await dbPool.query('SELECT * FROM examinations WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data pemeriksaan tidak ditemukan.' });
    }
    
    const row = rows[0];
    row.raw_data_tahap1 = row.raw_data_tahap1 ? JSON.parse(row.raw_data_tahap1) : [];
    row.raw_data_tahap2 = row.raw_data_tahap2 ? JSON.parse(row.raw_data_tahap2) : [];
    
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Simpan data pemeriksaan pasien baru ke MySQL
app.post('/api/examinations', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database MySQL tidak terhubung. Aktifkan XAMPP MySQL.' });
  }

  const {
    name, gender, age, height, weight, has_balance_disorder,
    tahap1_spl, tahap1_aoe, tahap1_vel_ap, tahap1_vel_ml,
    tahap2_spl, tahap2_aoe, tahap2_vel_ap, tahap2_vel_ml,
    raw_data_tahap1, raw_data_tahap2
  } = req.body;

  if (!name || !gender) {
    return res.status(400).json({ error: 'Nama dan Jenis Kelamin wajib diisi.' });
  }

  const query = `
    INSERT INTO examinations (
      name, gender, age, height, weight, has_balance_disorder,
      tahap1_spl, tahap1_aoe, tahap1_vel_ap, tahap1_vel_ml,
      tahap2_spl, tahap2_aoe, tahap2_vel_ap, tahap2_vel_ml,
      raw_data_tahap1, raw_data_tahap2
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    name, gender, age || 0, height || 0, weight || 0, has_balance_disorder || 'Tidak',
    tahap1_spl || 0, tahap1_aoe || 0, tahap1_vel_ap || 0, tahap1_vel_ml || 0,
    tahap2_spl || 0, tahap2_aoe || 0, tahap2_vel_ap || 0, tahap2_vel_ml || 0,
    JSON.stringify(raw_data_tahap1 || []),
    JSON.stringify(raw_data_tahap2 || [])
  ];

  try {
    const [result] = await dbPool.query(query, params);
    res.status(201).json({ id: result.insertId, message: 'Data pemeriksaan berhasil disimpan ke MySQL.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Hapus data pemeriksaan
app.delete('/api/examinations/:id', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database MySQL tidak terhubung.' });
  }

  const { id } = req.params;
  try {
    const [result] = await dbPool.query('DELETE FROM examinations WHERE id = ?', [id]);
    res.json({ message: 'Data berhasil dihapus dari database MySQL.', affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// API Endpoints & Logika Koneksi Serial Hardware
// ==========================================
let serialPortInstance = null;

// Endpoint untuk melacak Port COM yang tersedia di komputer/laptop
app.get('/api/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk menyambungkan koneksi ke Arduino
app.post('/api/connect-serial', (req, res) => {
  const { path, baudRate = 115200 } = req.body;
  
  if (serialPortInstance && serialPortInstance.isOpen) {
    serialPortInstance.close();
  }

  try {
    serialPortInstance = new SerialPort({ path, baudRate });
    const parser = serialPortInstance.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    serialPortInstance.on('open', () => {
      console.log(`📡 Port serial berhasil dibuka pada: ${path}`);
      res.json({ success: true, message: `Berhasil terhubung ke ${path}` });
    });

    parser.on('data', (data) => {
      try {
        let parsed = null;
        const trimmedLine = data.trim();
        
        // Lewati baris log string pembuka dari Arduino
        if (trimmedLine.startsWith('#') || trimmedLine.startsWith('Menunggu')) {
          return;
        }

        // Tangkap data spesifik yang ditandai oleh keyword "DATA:" dari Arduino
        if (trimmedLine.includes('DATA:')) {
          const parts = trimmedLine.split('DATA:');
          const dataPart = parts[1].trim(); // Berisi "XCoP_Total,YCoP_Total"
          const coords = dataPart.split(',');
          
          if (coords.length >= 2) {
            parsed = {
              x: parseFloat(coords[0]),
              y: parseFloat(coords[1]),
              w: 60.0 // Default weight statis, sesuaikan jika ada variabel berat dinamis
            };
          }
        }
        
        // Pancarkan langsung ke frontend secara Real-time via WebSockets
        if (parsed && !isNaN(parsed.x) && !isNaN(parsed.y)) {
          io.emit('cop-data', parsed);
        }
      } catch (e) {
        // Abaikan line data yang korup/rusak saat dibaca
      }
    });

    serialPortInstance.on('error', (err) => {
      console.error('Error pada serial port:', err.message);
      io.emit('serial-error', { message: err.message });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk memutuskan koneksi Arduino
app.post('/api/disconnect-serial', (req, res) => {
  if (serialPortInstance && serialPortInstance.isOpen) {
    serialPortInstance.close((err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true, message: 'Port serial diputuskan.' });
    });
  } else {
    res.json({ success: true, message: 'Tidak ada port serial yang aktif.' });
  }
});


// ==========================================
// WebSocket & Real-time Simulator (Fallback)
// ==========================================
let simulatorInterval = null;
let simulationTime = 0;

function generateSimulatedCop(phase, time, hasDisorder = false) {
  const baseFreq = 0.5;
  let swayAmpX = 0.12; 
  let swayAmpY = 0.10; 
  let noiseLevel = 0.02;
  let driftSpeed = 0;
  
  if (phase === 1) {
    if (hasDisorder) {
      swayAmpX = 0.28; swayAmpY = 0.25; noiseLevel = 0.05;
    }
  } else {
    swayAmpX = 0.35; swayAmpY = 0.32; noiseLevel = 0.06;
    if (hasDisorder) {
      swayAmpX = 0.75; swayAmpY = 0.68; noiseLevel = 0.12; driftSpeed = 0.015; 
    }
  }
  
  const x = swayAmpX * Math.sin(2 * Math.PI * baseFreq * time) + 
            (swayAmpX * 0.4) * Math.cos(2 * Math.PI * (baseFreq * 2.3) * time) + 
            (Math.random() - 0.5) * noiseLevel + (driftSpeed * time * 0.1);
            
  const y = swayAmpY * Math.cos(2 * Math.PI * (baseFreq * 0.8) * time) + 
            (swayAmpY * 0.3) * Math.sin(2 * Math.PI * (baseFreq * 1.7) * time) + 
            (Math.random() - 0.5) * noiseLevel + (driftSpeed * time * 0.05);

  const weight = 60.0 + (Math.random() - 0.5) * 0.4;

  return {
    x: parseFloat(x.toFixed(4)),
    y: parseFloat(y.toFixed(4)),
    w: parseFloat(weight.toFixed(2))
  };
}

io.on('connection', (socket) => {
  console.log('Client WebSocket terhubung:', socket.id);

  socket.on('start-simulation', (config) => {
    console.log('Memulai simulasi...');
    if (simulatorInterval) clearInterval(simulatorInterval);
    
    simulationTime = 0;
    simulatorInterval = setInterval(() => {
      simulationTime += 0.05;
      const data = generateSimulatedCop(config.phase, simulationTime, config.hasDisorder);
      socket.emit('cop-data', data);
    }, 50);
  });

  socket.on('stop-simulation', () => {
    if (simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
    }
  });

  socket.on('serial-forward', (data) => {
    socket.broadcast.emit('cop-data', data);
  });

  socket.on('disconnect', () => {
    if (simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
});