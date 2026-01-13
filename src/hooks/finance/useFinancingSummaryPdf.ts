import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PartnerSummary {
  deposits: number;
  withdrawals: number;
  balance: number;
}

interface FinancingSummary {
  creditIn: number;
  creditOut: number;
  leasingOut: number;
  interestPaid: number;
  remainingDebt: number;
}

interface InvestmentSummary {
  vehicles: number;
  equipment: number;
  fixtures: number;
  totalInvestment: number;
}

interface FixedExpense {
  id: string;
  expense_name: string;
  expense_type: string;
  monthly_amount: number | null;
  total_amount: number | null;
  installment_months: number | null;
  installments_paid: number | null;
  is_active: boolean | null;
}

interface FinancingSummaryPdfData {
  partnerSummary: PartnerSummary;
  financingSummary: FinancingSummary;
  investmentSummary: InvestmentSummary;
  fixedExpenses: FixedExpense[];
}

interface PdfOptions {
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

export function useFinancingSummaryPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async (
    data: FinancingSummaryPdfData,
    year: number,
    options: PdfOptions = {}
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

      // ===== BAŞLIK =====
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('FINANSMAN RAPORU'), pageWidth / 2, y, { align: 'center' });
      
      y += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${year}`, pageWidth / 2, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(normalizeText(`Olusturma: ${new Date().toLocaleDateString('tr-TR')}`), pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      
      // ===== ORTAK CARİ HESABI =====
      y += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('ORTAK CARI HESABI'), 15, y);
      
      y += 5;
      const partnerData = [
        [normalizeText('Ortaktan Tahsilat'), fmt(data.partnerSummary.deposits)],
        [normalizeText('Ortaga Odeme'), fmt(data.partnerSummary.withdrawals)],
        [normalizeText('Net Bakiye'), fmt(data.partnerSummary.balance)],
      ];
      
      (doc as any).autoTable({
        startY: y,
        body: partnerData,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', cellWidth: 60 },
        },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 10 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === 2) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [240, 240, 240];
          }
          // Color coding for balance
          if (cellData.row.index === 2 && cellData.column.index === 1) {
            if (data.partnerSummary.balance >= 0) {
              cellData.cell.styles.textColor = [0, 128, 0];
            } else {
              cellData.cell.styles.textColor = [200, 50, 50];
            }
          }
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;
      
      // ===== KREDİ / LEASİNG =====
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('KREDI / LEASING'), 15, y);
      
      y += 5;
      const financingData = [
        [normalizeText('Kredi Kullanimi'), fmt(data.financingSummary.creditIn)],
        [normalizeText('Kredi Odeme'), fmt(data.financingSummary.creditOut)],
        [normalizeText('Leasing Odeme'), fmt(data.financingSummary.leasingOut)],
        [normalizeText('Faiz Gideri'), fmt(data.financingSummary.interestPaid)],
        [normalizeText('Kalan Borc'), fmt(data.financingSummary.remainingDebt)],
      ];
      
      (doc as any).autoTable({
        startY: y,
        body: financingData,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', cellWidth: 60 },
        },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 10 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === 4) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [255, 240, 240];
          }
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;
      
      // ===== YATIRIMLAR =====
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText('YATIRIMLAR'), 15, y);
      
      y += 5;
      const investmentData = [
        [normalizeText('Tasit Alimlari'), fmt(data.investmentSummary.vehicles)],
        [normalizeText('Demirbaslar'), fmt(data.investmentSummary.fixtures)],
        [normalizeText('Ekipman'), fmt(data.investmentSummary.equipment)],
        [normalizeText('Toplam Yatirim'), fmt(data.investmentSummary.totalInvestment)],
      ];
      
      (doc as any).autoTable({
        startY: y,
        body: investmentData,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', cellWidth: 60 },
        },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 10 },
        didParseCell: (cellData: any) => {
          if (cellData.row.index === 3) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [240, 248, 255];
          }
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;
      
      // ===== SABİT GİDERLER =====
      const activeExpenses = data.fixedExpenses.filter(e => e.is_active);
      
      if (activeExpenses.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeText('SABIT GIDERLER'), 15, y);
        
        y += 5;
        const expenseData = activeExpenses.map(e => [
          normalizeText(e.expense_name),
          normalizeText(e.expense_type === 'monthly' ? 'Aylik' : 'Taksitli'),
          e.expense_type === 'monthly' 
            ? fmt(e.monthly_amount || 0) 
            : `${e.installments_paid || 0}/${e.installment_months || 0}`,
          e.expense_type === 'monthly'
            ? fmt((e.monthly_amount || 0) * 12)
            : fmt(e.total_amount || 0),
        ]);
        
        // Toplam satırı
        const totalMonthly = activeExpenses
          .filter(e => e.expense_type === 'monthly')
          .reduce((sum, e) => sum + (e.monthly_amount || 0), 0);
        
        expenseData.push([
          normalizeText('TOPLAM (Aylik)'),
          '',
          fmt(totalMonthly),
          fmt(totalMonthly * 12),
        ]);
        
        (doc as any).autoTable({
          startY: y,
          head: [[normalizeText('Gider'), normalizeText('Tip'), normalizeText('Aylik/Taksit'), normalizeText('Yillik/Toplam')]],
          body: expenseData,
          theme: 'grid',
          headStyles: { fillColor: [100, 100, 100], halign: 'left' },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { halign: 'center', cellWidth: 35 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 50 },
          },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 9 },
          didParseCell: (cellData: any) => {
            if (cellData.row.index === expenseData.length - 1) {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.fillColor = [240, 240, 240];
            }
          },
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
      const filename = `Finansman_Raporu_${year}_${currency}.pdf`;
      doc.save(filename);
      
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating };
}
