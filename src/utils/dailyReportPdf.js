import jsPDF from 'jspdf';

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const CONTENT_H = PAGE_H - 2 * MARGIN;
const LIGHT = [220, 220, 220];
const LIGHTER = [240, 240, 240];
const BLACK = [0, 0, 0];

export function generateDailyReportPDF(data) {
  const {
    todayStr,
    totalItems,
    totalRevenue,
    stylistCount,
    guestCount,
    categoryBreakdown,
    personBreakdown,
    itemBreakdown,
    servedLog,
  } = data;

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  const drawLine = (ly, color = LIGHT, width = 0.2) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(width);
    pdf.line(MARGIN, ly, PAGE_W - MARGIN, ly);
  };

  const setFont = (style = 'normal', size = 10) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
  };

  const truncate = (text, maxWidth) => {
    if (!text) return '';
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    let t = text;
    while (pdf.getTextWidth(t + '…') > maxWidth && t.length > 0) {
      t = t.slice(0, -1);
    }
    return t + '…';
  };

  // ==================== PAGE 1: SUMMARY ====================
  setFont('bold', 22);
  pdf.setTextColor(...BLACK);
  pdf.text('Daily Report', MARGIN, y);
  y += 9;

  setFont('normal', 11);
  pdf.text(todayStr, MARGIN, y);
  y += 10;

  // Stats: 2x2 grid of bordered boxes
  const boxGap = 5;
  const boxW = (CONTENT_W - boxGap) / 2;
  const boxH = 18;
  const stats = [
    { label: 'Items Served', value: String(totalItems) },
    { label: 'Total Value', value: `$${totalRevenue.toFixed(2)}` },
    { label: 'Stylist Orders', value: String(stylistCount) },
    { label: 'Guest Orders', value: String(guestCount) },
  ];

  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = MARGIN + col * (boxW + boxGap);
    const by = y + row * (boxH + boxGap);
    pdf.setDrawColor(...LIGHT);
    pdf.setLineWidth(0.3);
    pdf.rect(bx, by, boxW, boxH);
    setFont('bold', 15);
    pdf.text(s.value, bx + 4, by + 8);
    setFont('normal', 9);
    pdf.text(s.label, bx + 4, by + 14);
  });

  y += 2 * (boxH + boxGap) + 5;

  // Top Items (text-based, no chart bars)
  if (itemBreakdown.length > 0) {
    ensureSpace(10);
    setFont('bold', 13);
    pdf.text('Top Items Today', MARGIN, y);
    y += 6;
    drawLine(y);
    y += 5;

    setFont('normal', 10);
    itemBreakdown.slice(0, 8).forEach(item => {
      ensureSpace(6);
      pdf.text(truncate(item.name, CONTENT_W * 0.55), MARGIN + 2, y);
      pdf.text(`${item.count} served`, PAGE_W - MARGIN, y, { align: 'right' });
      y += 5;
      drawLine(y, LIGHTER);
      y += 4;
    });
    y += 2;
  }

  // Category breakdown
  if (categoryBreakdown.length > 0) {
    ensureSpace(10);
    setFont('bold', 13);
    pdf.text('By Category', MARGIN, y);
    y += 6;
    drawLine(y);
    y += 5;

    setFont('normal', 10);
    categoryBreakdown.forEach(cat => {
      ensureSpace(6);
      pdf.text(truncate(cat.name, CONTENT_W * 0.45), MARGIN + 2, y);
      pdf.text(`${cat.count} served`, PAGE_W / 2, y);
      pdf.text(`$${cat.revenue.toFixed(2)}`, PAGE_W - MARGIN, y, { align: 'right' });
      y += 5;
      drawLine(y, LIGHTER);
      y += 4;
    });
  }

  // ==================== PAGE 2+: ORDERS BY PERSON ====================
  pdf.addPage();
  y = MARGIN;

  setFont('bold', 16);
  pdf.text('Orders by Person', MARGIN, y);
  y += 8;
  drawLine(y);
  y += 6;

  if (personBreakdown.length === 0) {
    setFont('normal', 11);
    pdf.text('No orders today.', MARGIN, y);
  }

  personBreakdown.forEach(person => {
    ensureSpace(16);

    setFont('bold', 11);
    pdf.text(person.name, MARGIN, y);
    const nameW = pdf.getTextWidth(person.name);
    setFont('normal', 9);
    pdf.text(`(${person.type})`, MARGIN + nameW + 3, y);
    pdf.text(`${person.count} item${person.count !== 1 ? 's' : ''}`, PAGE_W - MARGIN - 35, y);
    setFont('bold', 11);
    pdf.text(`$${person.revenue.toFixed(2)}`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 5;

    setFont('normal', 9);
    const items = Object.entries(person.items).map(([name, qty]) => `${qty}x ${name}`);
    const lines = pdf.splitTextToSize(items.join('   '), CONTENT_W - 6);
    lines.forEach(line => {
      ensureSpace(5);
      pdf.text(line, MARGIN + 4, y);
      y += 5;
    });

    y += 3;
    drawLine(y);
    y += 5;
  });

  // ==================== PAGE N+: ITEMS SERVED TODAY ====================
  pdf.addPage();
  y = MARGIN;

  setFont('bold', 16);
  pdf.text('Items Served Today', MARGIN, y);
  y += 8;
  drawLine(y);
  y += 6;

  const colWidths = [CONTENT_W * 0.30, CONTENT_W * 0.28, CONTENT_W * 0.12, CONTENT_W * 0.14, CONTENT_W * 0.16];
  const colX = [];
  let accX = MARGIN;
  colWidths.forEach(w => { colX.push(accX); accX += w; });

  setFont('bold', 10);
  ['Item', 'Category', 'Qty', 'Price', 'Total'].forEach((h, i) => {
    pdf.text(h, colX[i] + 2, y);
  });
  y += 3;
  drawLine(y);
  y += 5;

  setFont('normal', 10);
  itemBreakdown.forEach(item => {
    ensureSpace(7);
    pdf.text(truncate(item.name, colWidths[0] - 4), colX[0] + 2, y);
    pdf.text(truncate(item.category || '-', colWidths[1] - 4), colX[1] + 2, y);
    pdf.text(String(item.count), colX[2] + 2, y);
    pdf.text(`$${(item.revenue / item.count).toFixed(2)}`, colX[3] + 2, y);
    pdf.text(`$${item.revenue.toFixed(2)}`, colX[4] + 2, y);
    y += 5;
    drawLine(y, LIGHTER);
    y += 3;
  });

  ensureSpace(8);
  y += 1;
  drawLine(y, BLACK, 0.4);
  y += 5;
  setFont('bold', 10);
  pdf.text('Total', colX[0] + 2, y);
  pdf.text(String(totalItems), colX[2] + 2, y);
  pdf.text(`$${totalRevenue.toFixed(2)}`, colX[4] + 2, y);

  // ==================== PAGE M+: SERVED LOG ====================
  pdf.addPage();
  y = MARGIN;

  setFont('bold', 16);
  pdf.text('Served Log', MARGIN, y);
  y += 8;
  drawLine(y);
  y += 6;

  if (servedLog.length === 0) {
    setFont('normal', 11);
    pdf.text('No items served today.', MARGIN, y);
  }

  const logCols = [CONTENT_W * 0.22, CONTENT_W * 0.33, CONTENT_W * 0.15, CONTENT_W * 0.13, CONTENT_W * 0.17];
  const logX = [];
  let accLX = MARGIN;
  logCols.forEach(w => { logX.push(accLX); accLX += w; });

  setFont('bold', 10);
  ['Item', 'Requested By', 'Table', 'Price', 'Time'].forEach((h, i) => {
    pdf.text(h, logX[i] + 2, y);
  });
  y += 3;
  drawLine(y);
  y += 5;

  setFont('normal', 10);
  servedLog.forEach(order => {
    ensureSpace(7);
    pdf.text(truncate(order.item_name || '-', logCols[0] - 4), logX[0] + 2, y);
    const byStr = `${order.requested_by_name} (${order.requested_by_type})`;
    pdf.text(truncate(byStr, logCols[1] - 4), logX[1] + 2, y);
    pdf.text(truncate(order.chair_table || '-', logCols[2] - 4), logX[2] + 2, y);
    pdf.text(`$${(order.price || 0).toFixed(2)}`, logX[3] + 2, y);
    pdf.text(order.time || '', logX[4] + 2, y);
    y += 5;
    drawLine(y, LIGHTER);
    y += 3;
  });

  // ==================== PAGE NUMBERS ====================
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    setFont('normal', 8);
    pdf.setTextColor(...LIGHT);
    pdf.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 7, { align: 'center' });
  }

  return pdf;
}