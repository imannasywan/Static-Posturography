#include "HX711.h"

HX711 hx1, hx2, hx3, hx4;

#define SCK 2
#define DOUT1 3 // F1 (Kiri Depan)
#define DOUT2 4 // F2 (Kiri Belakang)
#define DOUT3 5 // F3 (Kanan Depan)
#define DOUT4 6 // F4 (Kanan Belakang)

float scale = 21000.0;
long o1, o2, o3, o4;
bool sudah_offset = false;

// DIMENSI PLATFORM (Sesuai Buku TA)
float l = 33.0;  // Panjang plat (cm)
float w = 17.0;  // Lebar plat (cm)
float df = 28.0; // Jarak antar kaki (cm)
float fw = 10.0; // Lebar kaki (cm)

void setup() {
  Serial.begin(115200);
  hx1.begin(DOUT1, SCK); hx2.begin(DOUT2, SCK);
  hx3.begin(DOUT3, SCK); hx4.begin(DOUT4, SCK);
  
  Serial.println("SISTEM READY. JANGAN ADA BEBAN!");
  delay(3000);
}

void loop() {
  // 1. BACA DATA RAW
  long r1 = hx1.read_average(5); long r2 = hx2.read_average(5);
  long r3 = hx3.read_average(5); long r4 = hx4.read_average(5);

  // 2. AUTO TARE / OFFSET
  if (!sudah_offset) {
    o1 = r1; o2 = r2; o3 = r3; o4 = r4;
    sudah_offset = true; 
    Serial.println("OFFSET FIX. SILAKAN NAIK.");
    return;
  }

  // 3. KONVERSI KE BERAT (KG)
  float F1 = (r1 - o1) / scale; 
  float F2 = (r2 - o2) / scale; 
  float F3 = (r3 - o3) / scale; 
  float F4 = (r4 - o4) / scale; 

  float total_beban = F1 + F2 + F3 + F4;

  // 4. LOGIKA PENGHITUNGAN COP (Jika beban > 5kg)
  if (total_beban > 5.0) {
    
    // CoP Lokal Kiri
    float XCoPl = ((F2 - F1) * (w / 2.0)) / (F1 + F2);
    float YCoPl = ((F2 - F1) * (l / 2.0)) / (F1 + F2); 

    // CoP Lokal Kanan
    float XCoPr = ((F4 - F3) * (w / 2.0)) / (F3 + F4);
    float YCoPr = ((F4 - F3) * (l / 2.0)) / (F3 + F4);

    // CoP Total
    float XCoP_Total = (fw + (df / 2.0)) + (XCoPl - XCoPr);
    float YCoP_Total = (YCoPl + YCoPr) / 2.0;

    // 5. OUTPUT DATA UNTUK ARDUINO SERIAL MONITOR (Debug Log)
    // Selalu akhiri baris dengan println agar tidak mengganggu buffer pembacaan serial di web
    Serial.print("DBG | L(");
    Serial.print(XCoPl); Serial.print(","); Serial.print(YCoPl);
    Serial.print(") R(");
    Serial.print(XCoPr); Serial.print(","); Serial.print(YCoPr);
    Serial.print(") TOTAL(");
    Serial.print(XCoP_Total); Serial.print(","); Serial.print(YCoP_Total);
    Serial.print(") BEBAN:");
    Serial.println(total_beban);

    // 6. OUTPUT DATA UNTUK WEBSITE (Satu Baris Bersih)
    Serial.print("DATA:");
    Serial.print(XCoP_Total);
    Serial.print(",");
    Serial.println(YCoP_Total);

  } else {
    Serial.println("Menunggu Beban...");
  }
  delay(100);
}
