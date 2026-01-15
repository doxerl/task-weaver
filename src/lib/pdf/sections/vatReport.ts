// ============================================
// KDV RAPORU BÖLÜM RENDERER
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { VatCalculations } from '@/hooks/finance/useVatCalculations';
import { tr, getMonthName } from '../pdfUtils';
import { PDF_COLORS } from '../pdfTypes';

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ============================================
// KDV RAPORU PDF
// ============================================

export function renderVatReport(
  doc: jsPDF,
  vatData: VatCalculations,
  year: number,
  formatFn: (n: number) => string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // ===== KAPAK SAYFASI =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('KDV RAPORU'), pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`${year}`, pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  const today = new Date().toLocaleDateString('tr-TR');
  doc.text(tr(`Hazirlanma Tarihi: ${today}`), pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  
  // ===== ÖZET BÖLÜMÜ =====
  y += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('OZET'), 15, y);
  
  y += 5;
  const summaryData = [
    [tr('Hesaplanan KDV (Borc)'), formatFn(vatData.totalCalculatedVat)],
    [tr('Indirilecek KDV (Alacak)'), formatFn(vatData.totalDeductibleVat)],
    [
      vatData.netVatPayable >= 0 
        ? tr('Net KDV Borcu') 
        : tr('Net KDV Alacagi'),
      formatFn(Math.abs(vatData.netVatPayable))
    ],
  ];
  
  autoTable(doc, {
    startY: y,
    head: [[tr('Aciklama'), tr('Tutar')]],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.gray, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right', cellWidth: 60 },
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== KAYNAK BAZLI DAĞILIM =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('KAYNAK BAZLI DAGILIM'), 15, y);
  
  y += 5;
  const sourceData = [
    [
      tr('Faturalar'),
      `${vatData.bySource.receipts.count} belge`,
      formatFn(vatData.receiptCalculatedVat),
      formatFn(vatData.receiptDeductibleVat),
    ],
    [
      tr('Banka Islemleri'),
      `${vatData.bySource.bank.count} islem`,
      formatFn(vatData.bankCalculatedVat),
      formatFn(vatData.bankDeductibleVat),
    ],
    [
      tr('TOPLAM'),
      '',
      formatFn(vatData.totalCalculatedVat),
      formatFn(vatData.totalDeductibleVat),
    ],
  ];
  
  autoTable(doc, {
    startY: y,
    head: [[tr('Kaynak'), tr('Adet'), tr('Hesaplanan'), tr('Indirilecek')]],
    body: sourceData,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.gray, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'right', cellWidth: 45 },
      3: { halign: 'right', cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 },
    didParseCell: (data: any) => {
      if (data.row.index === sourceData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== AYLIK KDV DETAYI =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('AYLIK KDV DETAYI'), 15, y);
  
  y += 5;
  const monthlyData: any[] = [];
  let totalCalc = 0, totalDed = 0;
  
  for (let month = 1; month <= 12; month++) {
    const data = vatData.byMonth[month];
    if (data && (data.calculatedVat !== 0 || data.deductibleVat !== 0)) {
      monthlyData.push([
        tr(MONTH_NAMES[month - 1]),
        formatFn(data.calculatedVat),
        formatFn(data.deductibleVat),
        formatFn(data.netVat),
      ]);
      totalCalc += data.calculatedVat;
      totalDed += data.deductibleVat;
    }
  }
  
  // Toplam satırı
  monthlyData.push([
    tr('TOPLAM'),
    formatFn(totalCalc),
    formatFn(totalDed),
    formatFn(totalCalc - totalDed),
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [[tr('Ay'), tr('Hesaplanan'), tr('Indirilecek'), tr('Net KDV')]],
    body: monthlyData,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.gray, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 45 },
      3: { halign: 'right', cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 },
    didParseCell: (data: any) => {
      if (data.row.index === monthlyData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
      // Net KDV negatifse mavi, pozitifse kırmızı
      if (data.column.index === 3 && data.row.index < monthlyData.length - 1) {
        const monthData = vatData.byMonth[data.row.index + 1];
        if (monthData && monthData.netVat < 0) {
          data.cell.styles.textColor = [0, 100, 200];
        } else if (monthData && monthData.netVat > 0) {
          data.cell.styles.textColor = [200, 50, 50];
        }
      }
    },
  });
  
  y = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== KDV ORAN DAĞILIMI =====
  // Yeni sayfa gerekli mi kontrol et
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('KDV ORAN DAGILIMI (Faturalar)'), 15, y);
  
  y += 5;
  const rateData: any[] = [];
  const vatRates = [20, 10, 1, 0];
  
  for (const rate of vatRates) {
    const data = vatData.byVatRate[rate];
    if (data && (data.calculatedVat !== 0 || data.deductibleVat !== 0)) {
      rateData.push([
        rate === 0 ? tr('Diger') : `%${rate}`,
        `${data.issuedCount} / ${data.receivedCount}`,
        formatFn(data.calculatedVat),
        formatFn(data.deductibleVat),
      ]);
    }
  }
  
  if (rateData.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [[tr('KDV Orani'), tr('Kesilen/Alinan'), tr('Hesaplanan'), tr('Indirilecek')]],
      body: rateData,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.gray, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 50 },
        3: { halign: 'right', cellWidth: 50 },
      },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 10 },
    });
  }
}
