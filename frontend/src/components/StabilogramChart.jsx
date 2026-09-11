import React, { useRef, useEffect } from 'react';

export default function StabilogramChart({ points, ellipse, width = 360, height = 360 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Setup High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const padding = 40;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Fungsi menggambar grid kosong secara statis (tanpa dependensi variabel data)
    function drawEmptyGrid(ctx) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      
      const steps = 4;
      const stepX = plotWidth / steps;
      const stepY = plotHeight / steps;

      for (let i = 0; i <= steps; i++) {
        const px = padding + i * stepX;
        ctx.beginPath();
        ctx.moveTo(px, padding);
        ctx.lineTo(px, height - padding);
        ctx.stroke();

        const py = padding + i * stepY;
        ctx.beginPath();
        ctx.moveTo(padding, py);
        ctx.lineTo(width - padding, py);
        ctx.stroke();
      }

      // Sumbu utama tengah
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding, padding + plotHeight / 2);
      ctx.lineTo(width - padding, padding + plotHeight / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding + plotWidth / 2, padding);
      ctx.lineTo(padding + plotWidth / 2, height - padding);
      ctx.stroke();

      // Label sumbu
      ctx.fillStyle = 'var(--text-main)';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('ML CoP (cm)', width / 2, height - 6);

      ctx.save();
      ctx.translate(6, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('AP CoP (cm)', 0, 0);
      ctx.restore();
    }

    // Draw placeholder/empty state if not enough points
    if (!points || points.length < 2) {
      drawEmptyGrid(ctx);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '13px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Menunggu data sensor...', width / 2, height / 2);
      return;
    }

    // Pusat data untuk centering
    const N = points.length;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < N; i++) {
      sumX += points[i].x;
      sumY += points[i].y;
    }
    const meanX = sumX / N;
    const meanY = sumY / N;

    // Centered points
    const centeredPoints = points.map(p => ({
      x: p.x - meanX,
      y: p.y - meanY
    }));

    // Tentukan batas sumbu secara dinamis (asimetris) dengan margin 15%
    let minX = -1.0;
    let maxX = 1.0;
    let minY = -1.0;
    let maxY = 1.0;

    if (centeredPoints.length > 0) {
      const xs = centeredPoints.map(p => p.x);
      const ys = centeredPoints.map(p => p.y);
      const realMinX = Math.min(...xs);
      const realMaxX = Math.max(...xs);
      const realMinY = Math.min(...ys);
      const realMaxY = Math.max(...ys);

      const rangeX = realMaxX - realMinX || 1.0;
      const rangeY = realMaxY - realMinY || 1.0;

      minX = realMinX - rangeX * 0.15;
      maxX = realMaxX + rangeX * 0.15;
      minY = realMinY - rangeY * 0.15;
      maxY = realMaxY + rangeY * 0.15;

      // Amankan batas minimum agar sumbu nol terlihat jelas
      if (minX > -0.5) minX = -0.5;
      if (maxX < 0.5) maxX = 0.5;
      if (minY > -0.5) minY = -0.5;
      if (maxY < 0.5) maxY = 0.5;
    }

    // Fungsi konversi koordinat ke pixel canvas
    const toPxX = (x) => padding + ((x - minX) / (maxX - minX)) * plotWidth;
    const toPxY = (y) => padding + ((maxY - y) / (maxY - minY)) * plotHeight;

    // 1. Gambar Grid & Sumbu Koordinat
    drawGrid(ctx, minX, maxX, minY, maxY);

    // 2. Gambar Lintasan CoP (Sway Path - purple line with alpha 0.5)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 103, 189, 0.5)'; 
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.moveTo(toPxX(centeredPoints[0].x), toPxY(centeredPoints[0].y));
    for (let i = 1; i < centeredPoints.length; i++) {
      ctx.lineTo(toPxX(centeredPoints[i].x), toPxY(centeredPoints[i].y));
    }
    ctx.stroke();

    // 3. Gambar Titik-titik CoP (Dots - solid purple, size 15 di Python = radius ~3)
    ctx.fillStyle = '#9467bd';
    for (let i = 0; i < centeredPoints.length; i++) {
      ctx.beginPath();
      ctx.arc(toPxX(centeredPoints[i].x), toPxY(centeredPoints[i].y), 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 4. Gambar Legenda di dalam canvas (kanan atas)
    const legendX = width - padding - 120;
    const legendY = padding + 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.rect(legendX, legendY, 110, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9467bd';
    ctx.beginPath();
    ctx.arc(legendX + 16, legendY + 11, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '9px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Center of Pressure', legendX + 28, legendY + 11);

    // Fungsi menggambar grid pembantu
    function drawGrid(ctx, minX, maxX, minY, maxY) {
      // Garis grid vertikal (ML CoP: kelipatan 0.5)
      const xStep = 0.5;
      const startX = Math.ceil(minX / xStep) * xStep;
      for (let val = startX; val <= maxX; val += xStep) {
        const px = toPxX(val);
        if (px >= padding && px <= width - padding) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([1, 2]); // grid dotted
          
          ctx.beginPath();
          ctx.moveTo(px, padding);
          ctx.lineTo(px, height - padding);
          ctx.stroke();

          // Label teks X
          ctx.setLineDash([]);
          ctx.fillStyle = '#000000';
          ctx.font = '10px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(val.toFixed(1), px, height - padding + 6);
        }
      }

      // Garis grid horizontal (AP CoP: kelipatan 1.0)
      const yStep = 1.0;
      const startY = Math.ceil(minY / yStep) * yStep;
      for (let val = startY; val <= maxY; val += yStep) {
        const py = toPxY(val);
        if (py >= padding && py <= height - padding) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([1, 2]); // grid dotted
          
          ctx.beginPath();
          ctx.moveTo(padding, py);
          ctx.lineTo(width - padding, py);
          ctx.stroke();

          // Label teks Y
          ctx.setLineDash([]);
          ctx.fillStyle = '#000000';
          ctx.font = '10px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(val.toFixed(1), padding - 8, py);
        }
      }

      // Sumbu X & Y Utama (melalui x=0 dan y=0) - garis hitam putus-putus
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); // dashed
      
      // Sumbu X Utama (y=0)
      if (minY <= 0 && maxY >= 0) {
        ctx.beginPath();
        ctx.moveTo(padding, toPxY(0));
        ctx.lineTo(width - padding, toPxY(0));
        ctx.stroke();
      }

      // Sumbu Y Utama (x=0)
      if (minX <= 0 && maxX >= 0) {
        ctx.beginPath();
        ctx.moveTo(toPxX(0), padding);
        ctx.lineTo(toPxX(0), height - padding);
        ctx.stroke();
      }

      // Reset dash style
      ctx.setLineDash([]);

      // Border Box hitam di sekeliling plot area
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(padding, padding, plotWidth, plotHeight);
      ctx.stroke();

      // Label Nama Sumbu
      ctx.fillStyle = '#000000';
      ctx.font = '11px "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';
      
      // Label ML (horizontal)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('ML CoP (cm)', width / 2, height - 6);

      // Label AP (vertikal)
      ctx.save();
      ctx.translate(12, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('AP CoP (cm)', 0, 0);
      ctx.restore();
    }

  }, [points, ellipse, width, height]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="stabilogram-canvas"
      />
    </div>
  );
}
