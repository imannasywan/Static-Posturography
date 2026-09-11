/**
 * webSerial.js
 * Wrapper untuk Web Serial API agar frontend dapat membaca data dari Arduino Uno
 * secara langsung melalui browser (Chrome/Edge/Opera).
 */

class WebSerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.readableStreamClosed = null;
    this.keepReading = false;
    this.isConnected = false;
    this.onDataListener = null;
    this.onErrorListener = null;
  }

  /**
   * Cek apakah Web Serial API didukung oleh browser saat ini
   */
  isSupported() {
    return 'serial' in navigator;
  }

  /**
   * Mendaftarkan listener aktif untuk pemrosesan data real-time
   */
  registerListener(onDataReceived, onError) {
    this.onDataListener = onDataReceived;
    if (onError) {
      this.onErrorListener = onError;
    }
  }

  /**
   * Menghapus listener aktif saat pengujian selesai atau dibatalkan
   */
  unregisterListener() {
    this.onDataListener = null;
  }

  /**
   * Menghubungkan browser ke port serial Arduino
   * @param {number} baudRate - Default 115200
   * @param {Function} onDataReceived - Callback untuk data koordinat parsed {x, y, w}
   * @param {Function} onError - Callback jika terjadi error
   */
  async connect(baudRate = 115200, onDataReceived, onError) {
    if (!this.isSupported()) {
      throw new Error('Browser Anda tidak mendukung Web Serial API. Gunakan Chrome, Edge, atau Opera.');
    }

    try {
      // Meminta user memilih port serial
      this.port = await navigator.serial.requestPort();
      
      // Membuka port serial
      await this.port.open({ baudRate });
      this.isConnected = true;
      this.keepReading = true;

      // Daftarkan listener awal
      this.registerListener(onDataReceived, onError);

      // Jalankan proses pembacaan secara asynchronous (hanya sekali)
      this.readLoop();
      
      return true;
    } catch (error) {
      console.error('Koneksi serial gagal:', error);
      if (onError) onError(error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Loop pembacaan data serial secara terus menerus
   */
  async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      try {
        const textDecoder = new TextDecoderStream();
        this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        this.reader = reader;

        let buffer = '';

        while (this.keepReading) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          
          buffer += value;
          
          // Pecah buffer berdasarkan baris baru (\n atau \r\n)
          const lines = buffer.split(/\r?\n/);
          // Simpan baris terakhir yang belum lengkap kembali ke buffer
          buffer = lines.pop();

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            try {
              let parsedData = null;
              
              // Handle format spesifik Arduino User: "... | DATA:X,Y"
              if (trimmedLine.includes('DATA:')) {
                const parts = trimmedLine.split('DATA:');
                const dataPart = parts[1].trim(); // "X,Y"
                const coords = dataPart.split(',');
                if (coords.length >= 2) {
                  parsedData = {
                    x: parseFloat(coords[0]),
                    y: parseFloat(coords[1]),
                    w: 60.0 // Default weight, will be overwritten by Patient's form weight
                  };
                }
              } else if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                // Parse format JSON: {"x": 0.12, "y": -0.05, "w": 62.4}
                parsedData = JSON.parse(trimmedLine);
              } else {
                // Parse format CSV standar: "X_CoP,Y_CoP"
                const parts = trimmedLine.split(',');
                if (parts.length >= 2) {
                  parsedData = {
                    x: parseFloat(parts[0]),
                    y: parseFloat(parts[1]),
                    w: parts[2] ? parseFloat(parts[2]) : 60.0
                  };
                }
              }

              // Validasi hasil parse dan kirim ke listener
              if (parsedData && !isNaN(parsedData.x) && !isNaN(parsedData.y)) {
                if (this.onDataListener) {
                  this.onDataListener({
                    x: parsedData.x,
                    y: parsedData.y,
                    w: !isNaN(parsedData.w) ? parsedData.w : 60.0,
                    t: Date.now()
                  });
                }
              }
            } catch (err) {
              // Abaikan baris jika gagal di-parse
            }
          }
        }
      } catch (error) {
        console.error('Error saat membaca data serial:', error);
        if (this.onErrorListener) this.onErrorListener(error);
        break;
      }
    }
  }

  /**
   * Memutuskan koneksi serial
   */
  async disconnect() {
    this.keepReading = false;
    
    if (this.reader) {
      try {
        await this.reader.cancel();
        await this.readableStreamClosed.catch(() => {});
      } catch (err) {
        console.warn('Gagal membatalkan reader:', err);
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (err) {
        console.warn('Gagal menutup port:', err);
      }
      this.port = null;
    }

    this.isConnected = false;
  }
}

export const webSerialManager = new WebSerialManager();
export default webSerialManager;
