/**
 * Client-side PDF generation utility for fee bills.
 * Uses jsPDF to build professional A4 fee vouchers.
 */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export async function generateBillPDF(bill) {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 18;
  const CW = W - M * 2;

  // ── Dark header band ──────────────────────────────────────────────────────
  doc.setFillColor(6, 8, 16);
  doc.rect(0, 0, W, 52, 'F');

  // Accent stripe
  doc.setFillColor(0, 180, 220);
  doc.rect(0, 52, W, 2, 'F');

  // College name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('FUSION COLLEGE NAROWAL', W / 2, 18, { align: 'center' });

  // Sub-title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(140, 200, 255);
  doc.text('OFFICIAL FEE VOUCHER', W / 2, 28, { align: 'center' });

  // Month label
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 210);
  const monthLabel = `${MONTH_NAMES[(bill.month || 1) - 1]} ${bill.year}`;
  doc.text(monthLabel, W / 2, 37, { align: 'center' });

  // Status pill (top-right)
  const statusColorMap = {
    UNPAID:  [220, 38,  38],
    PAID:    [16,  185, 129],
    PARTIAL: [245, 158, 11],
    WAIVED:  [139, 92,  246],
  };
  const [sr, sg, sb] = statusColorMap[bill.status] || [100, 100, 100];
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(W - M - 28, 23, 28, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(bill.status || 'UNPAID', W - M - 14, 28.8, { align: 'center' });

  // ── Student Details Box ───────────────────────────────────────────────────
  let y = 60;
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(M, y, CW, 52, 3, 3, 'F');
  doc.setDrawColor(220, 225, 240);
  doc.roundedRect(M, y, CW, 52, 3, 3, 'S');

  // Box header
  doc.setFillColor(30, 35, 61);
  doc.roundedRect(M, y, CW, 9, 3, 3, 'F');
  doc.rect(M, y + 5, CW, 4, 'F'); // fill corners
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('👤  STUDENT DETAILS', M + 5, y + 6.5);

  const L = M + 5;
  const R = M + CW / 2 + 4;
  const rows = [
    ['Student Name', bill.student?.name || '—', 'Roll Number', bill.student?.rollNumber || '—'],
    ['Class',        bill.student?.class?.name || '—', "Father's Name", bill.student?.fatherName || '—'],
    ['Fee Package',  bill.student?.feePackage?.name || 'Custom Override', 'Admission %', bill.student?.admissionPercentage != null ? `${bill.student.admissionPercentage}%` : '—'],
  ];

  let dy = y + 18;
  for (const [lk, lv, rk, rv] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 140, 170);
    doc.text(lk, L, dy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 35, 60);
    doc.text(lv, L + 28, dy);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 140, 170);
    doc.text(rk, R, dy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 35, 60);
    doc.text(rv, R + 30, dy);
    dy += 11;
  }

  // ── Charges Table ─────────────────────────────────────────────────────────
  y += 58;

  // Table header
  doc.setFillColor(13, 15, 26);
  doc.roundedRect(M, y, CW, 10, 2, 2, 'F');
  doc.setTextColor(160, 220, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('📋  CHARGE DESCRIPTION', L, y + 7);
  doc.text('AMOUNT (₨)', M + CW - 3, y + 7, { align: 'right' });

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let itemCount = 0;
  for (const item of bill.items || []) {
    if (itemCount % 2 === 0) {
      doc.setFillColor(248, 249, 255);
      doc.rect(M, y - 3, CW, 10, 'F');
    }
    doc.setTextColor(40, 45, 70);
    doc.text(item.title, L, y + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.text(Number(item.amount).toLocaleString(), M + CW - 3, y + 3.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 10;
    itemCount++;
  }

  // Total Row
  doc.setFillColor(0, 150, 200);
  doc.roundedRect(M, y, CW, 13, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('💰  TOTAL DUE', L, y + 9.5);
  doc.text(`₨${Number(bill.totalAmount).toLocaleString()}`, M + CW - 3, y + 9.5, { align: 'right' });

  y += 20;

  // ── Payment / Due Date Info ───────────────────────────────────────────────
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(M, y, CW, bill.status === 'PAID' || bill.status === 'PARTIAL' ? 26 : 16, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 65, 90);
  const dueFormatted = new Date(bill.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`📆  Due Date: ${dueFormatted}`, L, y + 10);

  if ((bill.status === 'PAID' || bill.status === 'PARTIAL') && bill.paidAt) {
    const paidFormatted = new Date(bill.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`✅  Paid: ₨${Number(bill.paidAmount || 0).toLocaleString()} on ${paidFormatted}`, L, y + 21);
  }

  if (bill.remarks) {
    y += bill.status === 'PAID' || bill.status === 'PARTIAL' ? 32 : 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 150);
    doc.text(`📝 Remarks: ${bill.remarks}`, L, y);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 205, 225);
  doc.line(M, 272, M + CW, 272);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 155, 175);
  doc.text('This is a computer-generated fee voucher. No signature required.', W / 2, 277, { align: 'center' });
  doc.text('Fusion College Narowal  |  For queries contact the administration office.', W / 2, 283, { align: 'center' });

  return doc;
}

export function getBillFilename(bill) {
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const name = (bill.student?.name || 'Student').replace(/\s+/g, '_');
  const roll = (bill.student?.rollNumber || 'ROLL').replace(/-/g, '_');
  const mon  = SHORT_MONTHS[(bill.month || 1) - 1];
  return `FEE_${name}_${roll}_${mon}_${bill.year}.pdf`;
}
