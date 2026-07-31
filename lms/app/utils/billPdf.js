/**
 * Client-side PDF generation utility for fee bills.
 * Uses jsPDF and jspdf-autotable to build a professional 3-part A4 fee voucher.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function generateBillPDF(bill, bankConfig = null) {

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const sectionHeight = H / 3;

  // Pre-load logo
  let logoBase64 = null;
  try {
    const res = await fetch('/logo.png');
    if (res.ok) {
      const blob = await res.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
  }

  const sections = ['Bank Copy', 'College Copy', 'Student Copy'];

  sections.forEach((sectionTitle, index) => {
    const startY = index * sectionHeight;
    const M = 15; // Margin
    const CW = W - M * 2; // Content Width
    const currentY = startY + M;

    // Draw dashed line separator if not the first section
    if (index > 0) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(0, startY, W, startY);
      doc.setLineDashPattern([], 0); // reset
      doc.setDrawColor(0, 0, 0);
    }

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', M, currentY, 20, 20);
    }

    // Header text
    doc.setTextColor(30, 35, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FUSION COLLEGE NAROWAL', W / 2, currentY + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Official Fee Voucher', W / 2, currentY + 11, { align: 'center' });

    // Section title (Copy type)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(30, 35, 61);
    doc.roundedRect(W - M - 30, currentY, 30, 7, 1, 1, 'F');
    doc.text(sectionTitle, W - M - 15, currentY + 4.8, { align: 'center' });

    // Month / Year / Status
    const monthLabel = `${MONTH_NAMES[(bill.month || 1) - 1]} ${bill.year}`;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Billing Month: ${monthLabel}`, M, currentY + 28);
    
    const dueDate = new Date(bill.dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Due Date: ${dueDate}`, W - M, currentY + 28, { align: 'right' });

    // Student Info Box
    let sy = currentY + 32;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(M, sy, CW, 18, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    
    // Line 1
    doc.text('Student Name:', M + 3, sy + 6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(bill.student?.name || '—', M + 25, sy + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Roll No:', M + CW / 2, sy + 6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(bill.student?.rollNumber || '—', M + CW / 2 + 15, sy + 6);

    // Line 2
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Father Name:', M + 3, sy + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(bill.student?.fatherName || '—', M + 25, sy + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Class:', M + CW / 2, sy + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(bill.student?.class?.name || '—', M + CW / 2 + 15, sy + 13);

    sy += 22; // Move below the box

    // Fee Items Table
    const tableData = (bill.items || []).map((item, i) => [
      i + 1,
      item.title,
      `Rs ${Number(item.amount).toLocaleString()}`,
    ]);

    doc.autoTable({
      startY: sy,
      head: [['#', 'Fee Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 35, 61], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: 50 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: M, right: M },
      tableWidth: CW,
      styles: { cellPadding: 2, minCellHeight: 6 },
    });

    const finalY = doc.lastAutoTable.finalY + 4;

    // Total Amount Box
    doc.setFillColor(240, 240, 240);
    doc.rect(M, finalY, CW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Payable Amount:', M + 3, finalY + 5.5);
    doc.text(`Rs ${Number(bill.totalAmount).toLocaleString()}`, W - M - 3, finalY + 5.5, { align: 'right' });

    // Status / Paid Stamp
    if (bill.status === 'PAID') {
      doc.setTextColor(16, 185, 129); // Emerald
      doc.setFontSize(14);
      doc.text('PAID', W / 2, finalY + 16, { align: 'center', angle: 0 });
    } else if (bill.status === 'WAIVED') {
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(14);
      doc.text('WAIVED', W / 2, finalY + 16, { align: 'center', angle: 0 });
    }

    // Bank Details for Bank & College Copies
    if (index < 2 && bankConfig) {
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const bx = M;
      const by = finalY + 13;
      doc.text(`Deposit To: ${bankConfig.bankName || ''} (${bankConfig.branchCode || ''})`, bx, by);
      doc.text(`A/C Title: ${bankConfig.accountTitle || ''}`, bx, by + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`A/C No: ${bankConfig.accountNumber || ''}`, bx, by + 8);
    }

    // Signatures
    doc.setDrawColor(150, 150, 150);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    const sigY = startY + sectionHeight - 10;
    doc.line(M, sigY - 4, M + 30, sigY - 4);
    doc.text('Bank Officer', M + 5, sigY);

    doc.line(W - M - 30, sigY - 4, W - M, sigY - 4);
    doc.text('Depositor Signature', W - M - 28, sigY);
  });

  return doc;
}

export function getBillFilename(bill) {
  const m = MONTH_NAMES[(bill.month || 1) - 1];
  return `Fee_Challan_${bill.student?.rollNumber || 'Unknown'}_${m}_${bill.year}.pdf`;
}
