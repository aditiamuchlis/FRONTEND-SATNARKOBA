/**
 * Menempelkan watermark Timestamp (WIB) dan Koordinat GPS langsung pada citra foto
 * agar setiap bukti foto lapangan memiliki jejak waktu & lokasi permanen.
 */
export async function stampPhotoWithMetadata(
  sourceDataUrl: string,
  timestampIso: string,
  latitude: number,
  longitude: number,
  labelPrefix = 'SIPINAR SATRESNARKOBA'
): Promise<string> {
  if (typeof document === 'undefined') {
    return sourceDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 1024;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = Math.max(480, Math.round(img.width * scale));
        canvas.height = Math.max(360, Math.round(img.height * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const bannerHeight = 76;
        ctx.fillStyle = 'rgba(16, 42, 67, 0.86)';
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

        ctx.fillStyle = '#b78a28';
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 3);

        const formattedTime = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date(timestampIso));

        ctx.fillStyle = '#faf0d7';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(
          `${labelPrefix} | WAKTU: ${formattedTime} WIB`,
          14,
          canvas.height - bannerHeight + 28
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.fillText(
          `KOORDINAT GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          14,
          canvas.height - bannerHeight + 52
        );

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}
