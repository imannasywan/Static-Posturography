import React, { useRef, useEffect } from 'react';

export default function SplChart({ points, width = 480, height = 180 }) {
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
    const paddingBottom = 35;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Draw grid if empty
    if (!points || points.length < 2) {
      drawStaticGrid(ctx, 10.0, 30);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Menunggu data SPL...', width / 2, height / 2);
      return;
    }

    // 1. Hitung Akumulasi SPL terhadap waktu
    const splProgress = [{ t: 0, val: 0 }];
    let accumulatedSpl = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      accumulatedSpl += Math.sqrt(dx * dx + dy * dy);
      
      splProgress.push({
        t: (points[i].t - points[0].t) / 1000, // Detik relatif
        val: parseFloat(accumulatedSpl.toFixed(2))
      });
    }

    // Temukan SPL maks untuk auto-scale sumbu Y (Bulatkan ke kelipatan 5 terdekat)
    let maxSpl = Math.max(5.0, accumulatedSpl * 1.15); // Minimal batas atas 5.0 cm, beri margin 15%
    maxSpl = Math.ceil(maxSpl / 5) * 5;

    const totalTime = Math.max(30, splProgress[splProgress.length - 1].t);
    
    const toPxX = (t) => paddingLeft + (t / totalTime) * plotWidth;
    const toPxY = (val) => paddingTop + plotHeight - (val / maxSpl) * plotHeight;

    // 2. Gambar Grid & Label Sumbu
    drawStaticGrid(ctx, maxSpl, totalTime);

    // 3. Gambar Garis SPL (Solid Blue Line - matching Matplotlib color #1f77b4)
    ctx.beginPath();
    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(toPxX(splProgress[0].t), toPxY(splProgress[0].val));
    for (let i = 1; i < splProgress.length; i++) {
      ctx.lineTo(toPxX(splProgress[i].t), toPxY(splProgress[i].val));
    }
    ctx.stroke();

    // 4. Gambar Titik-titik Marker pada garis (circular markers, size 3 di Python)
    ctx.fillStyle = '#1f77b4';
    for (let i = 0; i < splProgress.length; i++) {
      ctx.beginPath();
      ctx.arc(toPxX(splProgress[i].t), toPxY(splProgress[i].val), 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 5. Gambar Legenda di dalam canvas (kanan bawah)
    const legendX = width - paddingRight - 120;
    const legendY = height - paddingBottom - 30;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.rect(legendX, legendY, 110, 22);
    ctx.fill();
    ctx.stroke();

    // Gambar garis legenda & marker
    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(legendX + 8, legendY + 11);
    ctx.lineTo(legendX + 24, legendY + 11);
    ctx.stroke();

    ctx.fillStyle = '#1f77b4';
    ctx.beginPath();
    ctx.arc(legendX + 16, legendY + 11, 2.5, 0, 2 * Math.PI);
    ctx.fill();

    // Teks legenda
    ctx.fillStyle = '#000000';
    ctx.font = '9px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sway Path Length', legendX + 28, legendY + 11);

    // Fungsi menggambar grid pembantu
    function drawStaticGrid(ctx, maxVal, totalT) {
      // Garis horizontal pembantu (Y ticks: kelipatan 5)
      const yStep = 5;
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

      // Label nama sumbu vertikal
      ctx.fillStyle = '#000000';
      ctx.font = '11px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
      ctx.save();
      ctx.translate(12, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('SPL (cm)', 0, 0);
      ctx.restore();

      // Label nama sumbu horizontal
      ctx.fillStyle = '#000000';
      ctx.font = '11px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Waktu (detik)', paddingLeft + plotWidth / 2, paddingTop + plotHeight + 20);
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
