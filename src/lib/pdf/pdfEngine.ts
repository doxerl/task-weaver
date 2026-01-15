// ============================================
// MERKEZI PDF ENGINE
// Tüm PDF oluşturma işlemlerini yöneten ana sınıf
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PdfEngineConfig, 
  PdfDocument, 
  PdfSection,
  PDF_COLORS,
  BalanceSheetData,
  VatReportData,
  SimulationData,
} from './pdfTypes';
import { tr, formatCurrency, formatAmount, addPageNumbers, createCoverPage } from './pdfUtils';
import { renderSinglePageBalanceSheet, renderDetailedBalanceSheet } from './sections/balanceSheet';
import { renderIncomeStatement, renderDetailedIncomeStatement } from './sections/incomeStatement';
import { renderVatReport } from './sections/vatReport';
import { renderSimulation } from './sections/simulation';

export class PdfEngine {
  private doc: jsPDF;
  private config: PdfEngineConfig;
  private currentY: number = 20;

  constructor(config: Partial<PdfEngineConfig> = {}) {
    this.config = {
      orientation: config.orientation || 'portrait',
      format: config.format || 'a4',
      currency: config.currency || 'TRY',
      language: config.language || 'tr',
      companyName: config.companyName,
      yearlyAverageRate: config.yearlyAverageRate,
      year: config.year || new Date().getFullYear(),
    };

    this.doc = new jsPDF({
      orientation: this.config.orientation,
      unit: 'mm',
      format: this.config.format,
    });
  }

  // Getter for jsPDF document
  getDoc(): jsPDF {
    return this.doc;
  }

  getConfig(): PdfEngineConfig {
    return this.config;
  }

  getPageWidth(): number {
    return this.doc.internal.pageSize.getWidth();
  }

  getPageHeight(): number {
    return this.doc.internal.pageSize.getHeight();
  }

  getYear(): number {
    return this.config.year || new Date().getFullYear();
  }

  // Türkçe karakter normalizasyonu - TEK NOKTA
  tr(text: string): string {
    return tr(text);
  }

  // Para birimi formatı - TEK NOKTA
  formatAmount(value: number, showSymbol: boolean = false): string {
    const { currency, yearlyAverageRate } = this.config;
    const displayValue = currency === 'USD' && yearlyAverageRate 
      ? value / yearlyAverageRate 
      : value;
    
    if (showSymbol) {
      return formatCurrency(displayValue, currency);
    }
    return formatAmount(displayValue);
  }

  // Yeni sayfa ekle
  addPage(orientation?: 'portrait' | 'landscape'): void {
    this.doc.addPage(this.config.format, orientation || this.config.orientation);
    this.currentY = 20;
  }

  // Sayfa numaralarını ekle
  addPageNumbers(): void {
    addPageNumbers(this.doc, 'Sayfa {current}/{total}');
  }

  // Kapak sayfası oluştur
  renderCover(title: string, subtitle?: string, tableOfContents?: string[]): void {
    createCoverPage(this.doc, {
      title,
      subtitle,
      year: this.config.year,
      currency: this.config.currency,
      yearlyAverageRate: this.config.yearlyAverageRate || undefined,
      companyName: this.config.companyName,
      tableOfContents,
    });
  }

  // Bilanço render et
  renderBalanceSheet(data: BalanceSheetData, year: number, layout: 'single' | 'detailed' = 'single'): void {
    if (layout === 'single') {
      renderSinglePageBalanceSheet(this.doc, data, year, (n) => this.formatAmount(n));
    } else {
      renderDetailedBalanceSheet(this.doc, data, year, (n) => this.formatAmount(n));
    }
  }

  // Gelir tablosu render et
  renderIncomeStatement(data: any, lines: any[], year: number, detailed: boolean = false): void {
    const formatFn = (n: number) => this.formatAmount(n);
    if (detailed) {
      renderDetailedIncomeStatement(this.doc, data, formatFn, {
        currency: this.config.currency,
        yearlyAverageRate: this.config.yearlyAverageRate || undefined,
      });
    } else {
      renderIncomeStatement(this.doc, data, lines, year, formatFn, {
        currency: this.config.currency,
        yearlyAverageRate: this.config.yearlyAverageRate || undefined,
      });
    }
  }

  // KDV raporu render et
  renderVatReport(data: VatReportData, year: number, formatAmountFn?: (n: number) => string): void {
    const formatFn = formatAmountFn || ((n: number) => this.formatAmount(n));
    renderVatReport(this.doc, data, year, formatFn);
  }

  // Simülasyon raporu render et
  renderSimulation(data: SimulationData, companyName?: string): void {
    renderSimulation(this.doc, data, companyName || this.config.companyName || 'Sirket');
  }

  // Genel tablo render et
  renderTable(options: {
    head: string[][];
    body: (string | number)[][];
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: Record<string, unknown>;
    bodyStyles?: Record<string, unknown>;
    columnStyles?: Record<string, unknown>;
    margin?: { left?: number; right?: number };
    tableWidth?: number | 'auto' | 'wrap';
  }): number {
    const { head, body, startY = this.currentY, theme = 'striped', headStyles, bodyStyles, columnStyles, ...rest } = options;
    
    autoTable(this.doc, {
      head,
      body: body.map(row => row.map(cell => 
        typeof cell === 'string' ? this.tr(cell) : cell
      )),
      startY,
      theme,
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        ...headStyles,
      },
      bodyStyles,
      columnStyles,
      ...rest,
    });

    // Return final Y position
    return (this.doc as any).lastAutoTable?.finalY || startY + 50;
  }

  // Metin ekle
  addText(text: string, x: number, y: number, options?: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  }): void {
    const { fontSize = 10, fontStyle = 'normal', color = PDF_COLORS.black, align = 'left' } = options || {};
    
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', fontStyle);
    this.doc.setTextColor(...color);
    this.doc.text(this.tr(text), x, y, { align });
  }

  // Kaydet
  save(filename: string): void {
    this.addPageNumbers();
    this.doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }

  // Blob olarak döndür
  getBlob(): Blob {
    this.addPageNumbers();
    return this.doc.output('blob');
  }
}

// Document builder - fluent API
export function createPdfDocument(config?: Partial<PdfEngineConfig>): PdfEngine {
  return new PdfEngine(config);
}

// Document'tan PDF oluştur
export async function generatePdfFromDocument(document: PdfDocument): Promise<Blob> {
  const engine = new PdfEngine(document.config);
  
  for (const section of document.sections) {
    switch (section.type) {
      case 'cover':
        engine.renderCover(
          section.data.title, 
          section.data.subtitle,
          section.data.tableOfContents
        );
        break;
        
      case 'balance-sheet':
      case 'balance-sheet-single':
        if (section.newPage) engine.addPage('landscape');
        const bsLayout = section.options?.layout === 'detailed' ? 'detailed' : 'single';
        engine.renderBalanceSheet(section.data, section.options?.year || engine.getYear(), bsLayout);
        break;
        
      case 'income-statement':
        if (section.newPage) engine.addPage();
        engine.renderIncomeStatement(section.data.statement, section.data.lines, section.data.year, false);
        break;
        
      case 'detailed-income-statement':
        if (section.newPage) engine.addPage();
        // Handle detailed income statement
        break;
        
      case 'vat-report':
        if (section.newPage) engine.addPage();
        engine.renderVatReport(section.data, section.options?.year || engine.getYear());
        break;
        
      case 'simulation':
        if (section.newPage) engine.addPage();
        engine.renderSimulation({
          ...section.data,
          baseYear: 2025,
          targetYear: 2026,
        });
        break;
        
      case 'table':
        engine.renderTable({
          head: [section.data.headers],
          body: section.data.rows,
          headStyles: section.data.headerColor ? { fillColor: section.data.headerColor } : undefined,
        });
        break;
    }
  }
  
  return engine.getBlob();
}
