import React, { useRef, useEffect } from 'react';
import { calculateInstantVelocity } from '../utils/copMath';

export default function VelocityChart({ points, width = 480, height = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Setup High-DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Fungsi menggambar grid kecepatan kosong secara statis (tanpa dependensi variabel data)
    function drawEmptyStaticGrid(ctx) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;

      // Garis grid horizontal Y (4 sections)
      const stepsY = 4;
      const stepY = plotHeight / stepsY;
      for (let i = 0; i <= stepsY; i++) {
        const py = paddingTop + i * stepY;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, py);
        ctx.lineTo(width - paddingRight, py);
        ctx.stroke();
      }

      // Garis grid vertikal X (setiap 5 detik, total 30 detik)
      const stepsX = 6;
      const stepX = plotWidth / stepsX;
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '9px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i <= stepsX; i++) {
        const px = paddingLeft + i * stepX;
        ctx.beginPath();
        ctx.moveTo(px, paddingTop);
        ctx.lineTo(px, paddingTop + plotHeight);
        ctx.stroke();

        // Label detik 0s, 5s, ..., 30s
        ctx.fillText(`${i * 5}s`, px, paddingTop + plotHeight + 6);
      }

      // Sumbu utama X & Y
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      
      // Sumbu X
      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop + plotHeight);
      ctx.lineTo(width - paddingRight, paddingTop + plotHeight);
      ctx.stroke();

      // Sumbu Y
      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, paddingTop + plotHeight);
      ctx.stroke();

      // Label sumbu vertikal
      ctx.fillStyle = 'var(--text-main)';
      ctx.font = 'bold 9px Plus Jakarta Sans';
      ctx.save();
      ctx.translate(12, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Velocity (cm/s)', 0, 0);
      ctx.restore();
    }

    // Draw grid if empty
    if (!points || points.length < 3) {
      drawEmptyStaticGrid(ctx);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Menunggu data kecepatan...', width / 2, height / 2);
      return;
    }

    // 1. Hitung Kecepatan Instan (tanpa moving average smoothing untuk mencocokkan dengan grafik Python)
    const velocities = [{ ap: 0, ml: 0, t: 0 }]; // Titik awal t=0, v=0, sama dengan v_ml[0]=0, v_ap[0]=0 di Python

    for (let i = 1; i < points.length; i++) {
      const v = calculateInstantVelocity(points[i - 1], points[i]);
      velocities.push({
        ap: v.ap,
        ml: v.ml,
        t: (points[i].t - points[0].t) / 1000 // Detik relatif
      });
    }

    // Temukan kecepatan maks untuk auto-scale sumbu Y (bulatkan ke kelipatan 1 terdekat)
    let maxV = 1.0; // Minimal batas atas 1.0 cm/s
    for (const v of velocities) {
      if (v.ap > maxV) maxV = v.ap;
      if (v.ml > maxV) maxV = v.ml;
    }
    maxV = Math.ceil(maxV * 1.15); // Beri margin atas dan bulatkan ke atas

    // Konversi koordinat ke pixel
    const totalTime = Math.max(30, velocities[velocities.length - 1].t);
    
    const toPxX = (t) => paddingLeft + (t / totalTime) * plotWidth;
    const toPxY = (v) => paddingTop + plotHeight - (v / maxV) * plotHeight;

    // 2. Gambar Grid & Label Sumbu
    drawStaticGrid(ctx, maxV, totalTime);

    // 3. Gambar Garis Kecepatan ML (Mediolateral - Orange #ff7f0e)
    ctx.beginPath();
    ctx.strokeStyle = '#ff7f0e';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(toPxX(velocities[0].t), toPxY(velocities[0].ml));
    for (let i = 1; i < velocities.length; i++) {
      ctx.lineTo(toPxX(velocities[i].t), toPxY(velocities[i].ml));
    }
    ctx.stroke();

    // 4. Gambar Garis Kecepatan AP (Anteroposterior - Blue #1f77b4)
    ctx.beginPath();
    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(toPxX(velocities[0].t), toPxY(velocities[0].ap));
    for (let i = 1; i < velocities.length; i++) {
      ctx.lineTo(toPxX(velocities[i].t), toPxY(velocities[i].ap));
    }
    ctx.stroke();

    // 5. Gambar Legenda di dalam canvas (kanan atas)
    const legendX = width - paddingRight - 80;
    const legendY = paddingTop + 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.rect(legendX, legendY, 70, 36);
    ctx.fill();
    ctx.stroke();

    // Legenda V-AP (Blue)
    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(legendX + 8, legendY + 10);
    ctx.lineTo(legendX + 24, legendY + 10);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '9px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('V-AP', legendX + 30, legendY + 10);

    // Legenda V-ML (Orange)
    ctx.strokeStyle = '#ff7f0e';
    ctx.beginPath();
    ctx.moveTo(legendX + 8, legendY + 26);
    ctx.lineTo(legendX + 24, legendY + 26);
    ctx.stroke();

    ctx.fillText('V-ML', legendX + 30, legendY + 26);

    // Fungsi menggambar grid pembantu
    function drawStaticGrid(ctx, maxVal, totalT = 30) {
      // Garis horizontal pembantu (Y ticks: kelipatan 1)
      const yStep = 1;
      for (let val = 0; val <= maxVal; val += yStep) {
        const py = paddingTop + plotHeight - (val / maxVal) * plotHeight;
        if (py >= paddingTop && py <= paddingTop + plotHeight) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([1, 2]); // grid dotted

          ctx.beginPath();
          ctx.moveTo(paddingLeft, py);
          ctx.lineTo(width - paddingRight, py);
          ctx.stroke();

          // Label teks Y
          ctx.setLineDash([]);
          ctx.fillStyle = '#000000';
          ctx.font = '10px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(val.toString(), paddingLeft - 8, py);
        }
      }

      // Garis vertikal pembantu (X ticks: kelipatan 5)
      const xStep = 5;
      for (let val = 0; val <= totalT; val += xStep) {
        const px = paddingLeft + (val / totalT) * plotWidth;
        if (px >= paddingLeft && px <= paddingLeft + plotWidth) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([1, 2]); // grid dotted

          ctx.beginPath();
          ctx.moveTo(px, paddingTop);
          ctx.lineTo(px, paddingTop + plotHeight);
          ctx.stroke();

          // Label teks X
          ctx.setLineDash([]);
          ctx.fillStyle = '#000000';
          ctx.font = '10px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(val.toString(), px, paddingTop + plotHeight + 6);
        }
      }

      // Sumbu utama berupa Border Box hitam di sekeliling plot area
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(paddingLeft, paddingTop, plotWidth, plotHeight);
      ctx.stroke();

      // Label sumbu vertikal (AP/ML Velocity)
      ctx.fillStyle = '#000000';
      ctx.font = '11px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
      ctx.save();
      ctx.translate(12, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Velocity (cm/s)', 0, 0);
      ctx.restore();

      // Label sumbu horizontal (Waktu (detik))
      ctx.fillStyle = '#000000';
      ctx.font = '11px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Waktu (detik)', paddingLeft + plotWidth / 2, paddingTop + plotHeight + 18);
    }

  }, [points, width, height]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="stabilogram-canvas"
        style={{ height: `${height}px`, width: '100%' }}
      />
    </div>
  );
}
