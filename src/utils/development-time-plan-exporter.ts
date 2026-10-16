import { jsPDF } from 'jspdf';
import { parseDate, formatDate } from './gantt-scheduling-engine';

/**
 * Format date for the reference timeline display: DD MMM 'YY
 * Example: 2026-10-01 -> "01 Oct '26"
 */
export function formatTimelineDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? parseDate(d) : d;
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}

/**
 * Format report header date: MMMM D, YYYY
 * Example: "September 16, 2026"
 */
export function formatReportHeaderDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Rasterize SVG Element to an HTML5 Canvas at the specified scale factor (default: 2 for Retina/300DPI)
 */
async function rasterizeSvgToCanvas(
  svgElement: SVGSVGElement,
  scale: number = 2
): Promise<HTMLCanvasElement> {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  // Ensure standard namespaces and styles
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Check if there is an executive export header to unhide in the export
  const exportHdr = clonedSvg.querySelector('#svg-export-header');
  let headerExtraHeight = 0;
  if (exportHdr) {
    (exportHdr as SVGElement).style.display = 'block';
    exportHdr.removeAttribute('style');
    headerExtraHeight = 85;
  }

  const baseWidth = svgElement.viewBox.baseVal?.width || svgElement.clientWidth || 1600;
  const baseHeight = (svgElement.viewBox.baseVal?.height || svgElement.clientHeight || 540) + headerExtraHeight;

  if (headerExtraHeight > 0) {
    clonedSvg.setAttribute('viewBox', `0 -${headerExtraHeight} ${baseWidth} ${baseHeight}`);
  }
  clonedSvg.setAttribute('width', String(baseWidth));
  clonedSvg.setAttribute('height', String(baseHeight));

  // Insert explicit white background as first child
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', `-${headerExtraHeight}`);
  bgRect.setAttribute('width', String(baseWidth));
  bgRect.setAttribute('height', String(baseHeight));
  bgRect.setAttribute('fill', '#FFFFFF');
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  const width = baseWidth;
  const height = baseHeight;

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clonedSvg);

  // Fix namespace self-closing issues if any
  if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scale for crisp high resolution
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into image for canvas rasterization'));
    };

    img.src = url;
  });
}

/**
 * Export Development Time Plan to a High-Resolution PNG file
 */
export async function exportTimelineToPng(
  svgElement: SVGSVGElement,
  projectId: string,
  projectName?: string
): Promise<void> {
  const canvas = await rasterizeSvgToCanvas(svgElement, 2.5); // 2.5x resolution for 300DPI crispness

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob from canvas'));
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `${projectId || 'Project'}_Development_Time_Plan_${todayStr}.png`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      resolve();
    }, 'image/png');
  });
}

/**
 * Export Development Time Plan to a Landscape PDF document
 */
export async function exportTimelineToPdf(
  svgElement: SVGSVGElement,
  projectId: string,
  projectName?: string
): Promise<void> {
  const canvas = await rasterizeSvgToCanvas(svgElement, 2.0);
  const imgData = canvas.toDataURL('image/png', 1.0);

  // Landscape A3 gives 1190.55 x 841.89 points - perfect for automotive schedule boards
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const ratio = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
  const renderW = canvasWidth * ratio;
  const renderH = canvasHeight * ratio;

  const renderX = margin + (availableWidth - renderW) / 2;
  const renderY = margin + (availableHeight - renderH) / 2;

  pdf.addImage(imgData, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${projectId || 'Project'}_Development_Time_Plan_${todayStr}.pdf`;

  pdf.save(filename);
}
