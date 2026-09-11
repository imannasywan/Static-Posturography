/**
 * copMath.js
 * Utilitas matematika untuk memproses koordinat Center of Pressure (CoP)
 * dalam posturografi.
 */

/**
 * Menghitung parameter keseimbangan secara keseluruhan dari sekumpulan titik CoP
 * @param {Array} points - Array objek [{x: number, y: number, w: number, t: number}]
 * @param {number} duration - Durasi perekaman dalam detik (misal: 30)
 * @returns {Object} Hasil perhitungan parameter
 */
export function calculateCopParameters(points, duration) {
  if (!points || points.length < 2) {
    return {
      spl: 0,
      aoe: 0,
      velAp: 0,
      velMl: 0,
      ellipse: { a: 0, b: 0, theta: 0, cx: 0, cy: 0 }
    };
  }

  const N = points.length;
  let sumX = 0;
  let sumY = 0;
  let spl = 0;
  let totalDiffX = 0;
  let totalDiffY = 0;

  for (let i = 0; i < N; i++) {
    sumX += points[i].x;
    sumY += points[i].y;

    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      
      spl += Math.sqrt(dx * dx + dy * dy);
      totalDiffX += Math.abs(dx);
      totalDiffY += Math.abs(dy);
    }
  }

  const meanX = sumX / N;
  const meanY = sumY / N;

  // Hitung Varians dan Kovarians
  let varX = 0;
  let varY = 0;
  let covXY = 0;

  if (N > 1) {
    for (let i = 0; i < N; i++) {
      const dx = points[i].x - meanX;
      const dy = points[i].y - meanY;
      varX += dx * dx;
      varY += dy * dy;
      covXY += dx * dy;
    }
    const divisor = N - 1;
    varX /= divisor;
    varY /= divisor;
    covXY /= divisor;
  }

  // Hitung Eigenvalues dari Matriks Kovarians
  // [ varX   covXY ]
  // [ covXY  varY  ]
  const trace = varX + varY;
  const det = varX * varY - covXY * covXY;
  
  // Amankan dari nilai negatif akibat error presisi floating-point
  const term = Math.max(0, (trace * trace) / 4 - det);
  const lambda1 = trace / 2 + Math.sqrt(term);
  const lambda2 = trace / 2 - Math.sqrt(term);

  // Sudut rotasi elips
  // theta = 0.5 * atan2(2 * covXY, varX - varY)
  const theta = 0.5 * Math.atan2(2 * covXY, varX - varY);

  // Nilai kritis untuk 95% confidence interval pada chi-square dengan 2 d.f adalah 5.991
  const chiSquare95 = 5.991;
  const a = Math.sqrt(chiSquare95 * Math.max(0, lambda1)); // semi-major axis (cm)
  const b = Math.sqrt(chiSquare95 * Math.max(0, lambda2)); // semi-minor axis (cm)

  // Area of Ellipse (AoE) = pi * a * b
  // Atau bisa dihitung sebagai: pi * chiSquare95 * sqrt(det)
  const aoe = Math.PI * a * b;

  // Kecepatan rata-rata CoP (ML = X axis, AP = Y axis)
  // Menyesuaikan dengan rumus Python: avg_v = sum(abs(diff)) / (len(x) * dt)
  // Di mana total duration = (N - 1) * dt, sehingga N * dt = N * (duration / (N - 1))
  const avgDt = N > 1 ? duration / (N - 1) : 1.0;
  const velMl = N > 0 ? totalDiffX / (N * avgDt) : 0;
  const velAp = N > 0 ? totalDiffY / (N * avgDt) : 0;

  return {
    spl: parseFloat(spl.toFixed(2)),
    aoe: parseFloat(aoe.toFixed(4)),
    velAp: parseFloat(velAp.toFixed(3)),
    velMl: parseFloat(velMl.toFixed(3)),
    ellipse: {
      a,
      b,
      theta,
      cx: meanX,
      cy: meanY
    }
  };
}

/**
 * Menghitung kecepatan instan antara dua titik CoP
 * Berguna untuk menampilkan fluktuasi kecepatan real-time di grafik
 */
export function calculateInstantVelocity(p1, p2) {
  if (!p1 || !p2) return { ap: 0, ml: 0 };
  const dt = (p2.t - p1.t) / 1000; // dalam detik
  if (dt <= 0) return { ap: 0, ml: 0 };

  const dx = Math.abs(p2.x - p1.x); // ML (X)
  const dy = Math.abs(p2.y - p1.y); // AP (Y)

  return {
    ml: dx / dt,
    ap: dy / dt
  };
}
