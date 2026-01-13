import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { VatCalculations } from './useVatCalculations';

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

interface VatReportPdfOptions {
  currency?: string;
  formatAmount?: (value: number) => string;
  yearlyAverageRate?: number;
}

// Türkçe karakterleri normalize et
const normalizeText = (text: string): string => {
  const charMap: Record<string, string> = {
    'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I',
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[şŞıİğĞüÜöÖçÇ]/g, char => charMap[char] || char);
};

export function useVatReportPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async (
    vatData: VatCalculations,
    year: number,
    options: VatReportPdfOptions = {}
  ) => {
    setIsGenerating(true);
    
    try {
      const { currency = 'TRY', formatAmount } = options;
      
      const fmt = (value: number): string => {
        if (formatAmount) return formatAmount(value);
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        }).format(value);
      };
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // ===== KAPAK SAYFASI =====
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('KDV RAPORU'), pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${year}`, pageWidth / 2, y, { align: 'center' });
      
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(100);
      const today = new Date().toLocaleDateString('tr-TR');
      doc.text(normalizeText(`Hazirlanma Tarihi: ${today}`), pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      
      // ===== ÖZET BÖLÜMÜ =====
      y += 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('OZET'), 15, y);
      
      y += 5;
      const summaryData = [
        [normalizeText('Hesaplanan KDV (Borc)'), fmt(vatData.totalCalculatedVat)],
        [normalizeText('Indirilecek KDV (Alacak)'), fmt(vatData.totalDeductibleVat)],
        [
          vatData.netVatPayable >= 0 
            ? normalizeText('Net KDV Borcu') 
            : normalizeText('Net KDV Alacagi'),
          fmt(Math.abs(vatData.netVatPayable))
        ],
      ];
      
      (doc as any).autoTable({
        startY: y,
        head: [[normalizeText('Aciklama'), normalizeText('Tutar')]],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], halign: 'left' },
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
      doc.text(normalizeText('KAYNAK BAZLI DAGILIM'), 15, y);
      
      y += 5;
      const sourceData = [
        [
          normalizeText('Faturalar'),
          `${vatData.bySource.receipts.count} belge`,
          fmt(vatData.receiptCalculatedVat),
          fmt(vatData.receiptDeductibleVat),
        ],
        [
          normalizeText('Banka Islemleri'),
          `${vatData.bySource.bank.count} islem`,
          fmt(vatData.bankCalculatedVat),
          fmt(vatData.bankDeductibleVat),
        ],
        [
          normalizeText('TOPLAM'),
          '',
          fmt(vatData.totalCalculatedVat),
          fmt(vatData.totalDeductibleVat),
        ],
      ];
      
      (doc as any).autoTable({
        startY: y,
        head: [[normalizeText('Kaynak'), normalizeText('Adet'), normalizeText('Hesaplanan'), normalizeText('Indirilecek')]],
        body: sourceData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], halign: 'left' },
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
      doc.text(normalizeText('AYLIK KDV DETAYI'), 15, y);
      
      y += 5;
      const monthlyData: any[] = [];
      let totalCalc = 0, totalDed = 0;
      
      for (let month = 1; month <= 12; month++) {
        const data = vatData.byMonth[month];
        if (data && (data.calculatedVat !== 0 || data.deductibleVat !== 0)) {
          monthlyData.push([
            MONTH_NAMES[month - 1],
            fmt(data.calculatedVat),
            fmt(data.deductibleVat),
            fmt(data.netVat),
          ]);
          totalCalc += data.calculatedVat;
          totalDed += data.deductibleVat;
        }
      }
      
      // Toplam satırı
      monthlyData.push([
        normalizeText('TOPLAM'),
        fmt(totalCalc),
        fmt(totalDed),
        fmt(totalCalc - totalDed),
      ]);
      
      (doc as any).autoTable({
        startY: y,
        head: [[normalizeText('Ay'), normalizeText('Hesaplanan'), normalizeText('Indirilecek'), normalizeText('Net KDV')]],
        body: monthlyData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], halign: 'left' },
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
      // Check if we need a new page
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('KDV ORAN DAGILIMI (Faturalar)'), 15, y);
      
      y += 5;
      const rateData: any[] = [];
      const vatRates = [20, 10, 1, 0];
      
      for (const rate of vatRates) {
        const data = vatData.byVatRate[rate];
        if (data && (data.calculatedVat !== 0 || data.deductibleVat !== 0)) {
          rateData.push([
            rate === 0 ? normalizeText('Diger') : `%${rate}`,
            `${data.issuedCount} / ${data.receivedCount}`,
            fmt(data.calculatedVat),
            fmt(data.deductibleVat),
          ]);
        }
      }
      
      if (rateData.length > 0) {
        (doc as any).autoTable({
          startY: y,
          head: [[normalizeText('KDV Orani'), normalizeText('Kesilen/Alinan'), normalizeText('Hesaplanan'), normalizeText('Indirilecek')]],
          body: rateData,
          theme: 'grid',
          headStyles: { fillColor: [100, 100, 100], halign: 'left' },
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
      
      // ===== FOOTER =====
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Sayfa ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Save
      const filename = `KDV_Raporu_${year}_${currency}.pdf`;
      doc.save(filename);
      
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating };
}
