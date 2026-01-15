// ============================================
// PDF DOCUMENT BUILDER - DATA-DRIVEN YAKLAŞIM
// jspdf-autotable ile tablo - Türkçe karakter desteği
// ============================================

import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import type { BalanceSheet } from '@/types/finance';
import type { IncomeStatementData, DetailedIncomeStatementData } from '@/types/reports';
import { downloadPdf } from '@/lib/pdf/core/pdfBlobHandling';
import { addOpenSansToJsPDF } from '@/lib/pdf/fonts';

// ============================================
// TİP TANIMLARI
// ============================================

export type PdfOrientation = 'portrait' | 'landscape';

export interface TableColumnStyle {
  halign?: 'left' | 'center' | 'right';
  cellWidth?: number | 'auto' | 'wrap';
  fontStyle?: 'normal' | 'bold' | 'italic';
}

export interface TableSectionOptions {
  showHead?: 'everyPage' | 'firstPage' | 'never';
  pageBreak?: 'auto' | 'avoid' | 'always';
  columnStyles?: Record<number, TableColumnStyle>;
  headerColor?: [number, number, number];
  headerTextColor?: [number, number, number];
  alternateRowColor?: [number, number, number];
  fontSize?: number;
  cellPadding?: number;
  minCellHeight?: number;
}

export interface TableSection {
  type: 'table';
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  options?: TableSectionOptions;
}

export interface ChartSection {
  type: 'chart';
  title?: string;
  element: HTMLElement;
  options?: { fitToPage?: boolean; maxHeight?: number };
}

export interface BalanceSheetSection {
  type: 'balance-sheet';
  data: BalanceSheet;
  year: number;
  formatAmount: (value: number) => string;
}

export interface IncomeStatementSection {
  type: 'income-statement';
  data: IncomeStatementData;
  year: number;
  formatAmount: (value: number) => string;
}

export interface DetailedIncomeSection {
  type: 'detailed-income';
  data: DetailedIncomeStatementData;
  formatAmount: (value: number) => string;
}

export interface TextSection {
  type: 'text';
  content: string;
  style?: 'title' | 'subtitle' | 'body' | 'caption';
  align?: 'left' | 'center' | 'right';
}

export interface SpacerSection {
  type: 'spacer';
  height: number; // mm
}

export interface PageBreakSection {
  type: 'page-break';
}

export type PdfSection =
  | TableSection
  | ChartSection
  | BalanceSheetSection
  | IncomeStatementSection
  | DetailedIncomeSection
  | TextSection
  | SpacerSection
  | PageBreakSection;

export interface PdfBuilderConfig {
  orientation: PdfOrientation;
  margin: number;
  fontSize: number;
  fontFamily?: string;
  headerColor?: [number, number, number];
  companyName?: string;
}

const DEFAULT_CONFIG: PdfBuilderConfig = {
  orientation: 'portrait',
  margin: 10,
  fontSize: 10,
  headerColor: [59, 130, 246], // Blue-500
};

// ============================================
// ANA BUILDER SINIFI
// ============================================

export class PdfDocumentBuilder {
  private pdf: jsPDF;
  private sections: PdfSection[] = [];
  private config: PdfBuilderConfig;
  private currentY: number;
  private fontLoaded: boolean = false;

  constructor(config: Partial<PdfBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pdf = new jsPDF({
      orientation: this.config.orientation,
      unit: 'mm',
      format: 'a4',
    });
    
    this.currentY = this.config.margin;
  }
  
  /**
   * Türkçe font desteği yükle - async
   */
  private async loadFont(): Promise<void> {
    if (this.fontLoaded) return;
    await addOpenSansToJsPDF(this.pdf);
    this.fontLoaded = true;
  }

  // ============================================
  // BUILDER METHODS (Fluent API)
  // ============================================

  /**
   * Kapak sayfası ekle
   */
  addCover(title: string, subtitle?: string, date?: string): this {
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // Şirket adı
    if (this.config.companyName) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text(this.config.companyName, centerX, 40, { align: 'center' });
    }

    // Ana başlık
    this.pdf.setFontSize(28);
    this.pdf.setTextColor(30, 30, 30);
    this.pdf.text(title, centerX, pageHeight / 2 - 10, { align: 'center' });

    // Alt başlık
    if (subtitle) {
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(80, 80, 80);
      this.pdf.text(subtitle, centerX, pageHeight / 2 + 5, { align: 'center' });
    }

    // Tarih
    if (date) {
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(120, 120, 120);
      this.pdf.text(date, centerX, pageHeight - 30, { align: 'center' });
    }

    // Yeni sayfa
    this.pdf.addPage();
    this.currentY = this.config.margin;

    return this;
  }

  /**
   * Tablo ekle
   */
  addTable(section: Omit<TableSection, 'type'>): this {
    this.sections.push({ type: 'table', ...section });
    return this;
  }

  /**
   * Grafik ekle (html2canvas ile yakalanacak)
   */
  addChart(section: Omit<ChartSection, 'type'>): this {
    this.sections.push({ type: 'chart', ...section });
    return this;
  }

  /**
   * Bilanço ekle (özel side-by-side layout)
   */
  addBalanceSheet(
    data: BalanceSheet,
    year: number,
    formatAmount: (value: number) => string
  ): this {
    this.sections.push({ type: 'balance-sheet', data, year, formatAmount });
    return this;
  }

  /**
   * Gelir tablosu ekle
   */
  addIncomeStatement(
    data: IncomeStatementData,
    year: number,
    formatAmount: (value: number) => string
  ): this {
    this.sections.push({ type: 'income-statement', data, year, formatAmount });
    return this;
  }

  /**
   * Detaylı gelir tablosu ekle
   */
  addDetailedIncomeStatement(
    data: DetailedIncomeStatementData,
    formatAmount: (value: number) => string
  ): this {
    this.sections.push({ type: 'detailed-income', data, formatAmount });
    return this;
  }

  /**
   * Metin ekle
   */
  addText(
    content: string,
    style: TextSection['style'] = 'body',
    align: TextSection['align'] = 'left'
  ): this {
    this.sections.push({ type: 'text', content, style, align });
    return this;
  }

  /**
   * Boşluk ekle
   */
  addSpacer(height: number): this {
    this.sections.push({ type: 'spacer', height });
    return this;
  }

  /**
   * Sayfa sonu ekle
   */
  addPageBreak(): this {
    this.sections.push({ type: 'page-break' });
    return this;
  }

  // ============================================
  // RENDER METHODS
  // ============================================

  /**
   * PDF oluştur ve indir
   */
  async build(filename: string): Promise<boolean> {
    console.log('[PdfBuilder] Building PDF with', this.sections.length, 'sections');

    try {
      // Türkçe font yükle
      await this.loadFont();
      
      for (const section of this.sections) {
        await this.renderSection(section);
      }

      // Footer ekle (sayfa numaraları)
      this.addPageNumbers();

      // PDF'i indir
      const blob = this.pdf.output('blob');
      
      if (blob.size < 100) {
        console.error('[PdfBuilder] Generated PDF is too small');
        return false;
      }

      downloadPdf(blob, filename);
      console.log('[PdfBuilder] PDF downloaded:', filename, blob.size, 'bytes');
      return true;
    } catch (error) {
      console.error('[PdfBuilder] Build error:', error);
      return false;
    }
  }

  /**
   * PDF blob'unu al (indirmeden)
   */
  async getBlob(): Promise<Blob> {
    for (const section of this.sections) {
      await this.renderSection(section);
    }
    this.addPageNumbers();
    return this.pdf.output('blob');
  }

  // ============================================
  // PRIVATE RENDER METHODS
  // ============================================

  private async renderSection(section: PdfSection): Promise<void> {
    switch (section.type) {
      case 'table':
        this.renderTable(section);
        break;
      case 'chart':
        await this.renderChart(section);
        break;
      case 'balance-sheet':
        this.renderBalanceSheet(section);
        break;
      case 'income-statement':
        this.renderIncomeStatement(section);
        break;
      case 'detailed-income':
        this.renderDetailedIncome(section);
        break;
      case 'text':
        this.renderText(section);
        break;
      case 'spacer':
        this.currentY += section.height;
        break;
      case 'page-break':
        this.pdf.addPage();
        this.currentY = this.config.margin;
        break;
    }
  }

  private renderTable(section: TableSection): void {
    const { title, headers, rows, options = {} } = section;
    const margin = this.config.margin;

    // Başlık varsa ekle
    if (title) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(30, 30, 30);
      this.pdf.text(title, margin, this.currentY + 5);
      this.currentY += 10;
    }

    // Tablo verilerini string'e çevir
    const preparedRows = rows.map(row => row.map(cell => String(cell)));

    // AutoTable ayarları - Roboto font ile Türkçe karakter desteği
    // rowPageBreak: 'avoid' satırların ortadan bölünmesini engeller
    const tableOptions: UserOptions = {
      head: [headers],
      body: preparedRows,
      startY: this.currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: options.fontSize || 9,
        cellPadding: options.cellPadding || 2,
        overflow: 'linebreak',
        minCellHeight: options.minCellHeight || 6,
        font: 'OpenSans', // Türkçe karakter desteği
      },
      headStyles: {
        fillColor: options.headerColor || this.config.headerColor || [59, 130, 246],
        textColor: options.headerTextColor || [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        font: 'OpenSans', // Türkçe karakter desteği
      },
      alternateRowStyles: options.alternateRowColor
        ? { fillColor: options.alternateRowColor }
        : { fillColor: [249, 250, 251] },
      showHead: options.showHead || 'everyPage',
      pageBreak: options.pageBreak || 'auto',
      rowPageBreak: 'avoid', // Satırları ortadan bölme - sayfa sonunda yeni sayfaya taşı
      columnStyles: this.convertColumnStyles(options.columnStyles),
      didDrawPage: () => {
        // Her sayfa sonunda footer için yer bırak
      },
    };

    autoTable(this.pdf, tableOptions);

    // currentY'yi güncelle
    // @ts-ignore - jspdf-autotable extends jsPDF
    this.currentY = this.pdf.lastAutoTable?.finalY || this.currentY + 20;
    this.currentY += 5; // Section arası boşluk
  }

  private async renderChart(section: ChartSection): Promise<void> {
    const { title, element, options = {} } = section;
    const margin = this.config.margin;
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    // Başlık
    if (title) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(30, 30, 30);
      this.pdf.text(title, margin, this.currentY + 5);
      this.currentY += 10;
    }

    try {
      // html2canvas ile yakala
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('[PdfBuilder] Chart canvas is empty');
        return;
      }

      // Boyutları hesapla
      let imgWidth = contentWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Max height kontrolü
      const maxHeight = options.maxHeight || pageHeight - margin * 2 - 20;
      if (imgHeight > maxHeight) {
        const scale = maxHeight / imgHeight;
        imgWidth *= scale;
        imgHeight = maxHeight;
      }

      // Sayfa sığma kontrolü
      if (this.currentY + imgHeight > pageHeight - margin) {
        this.pdf.addPage();
        this.currentY = margin;
      }

      // Görüntüyü JPEG olarak sıkıştır (daha küçük dosya boyutu)
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      this.pdf.addImage(imgData, 'JPEG', margin, this.currentY, imgWidth, imgHeight);
      this.currentY += imgHeight + 10;
    } catch (error) {
      console.error('[PdfBuilder] Chart render error:', error);
    }
  }

  private renderBalanceSheet(section: BalanceSheetSection): void {
    const { data, year, formatAmount } = section;
    const margin = this.config.margin;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Landscape modda yan yana: Aktif sol, Pasif sağ
    const isLandscape = this.config.orientation === 'landscape';
    const halfWidth = isLandscape ? (pageWidth - margin * 3) / 2 : pageWidth - margin * 2;

    // Başlık
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(30, 30, 30);
    this.pdf.text(`Bilanço - ${year}`, pageWidth / 2, this.currentY + 5, { align: 'center' });
    this.currentY += 15;

    // Aktif (Varlıklar) tablosu
    const assetRows = this.buildAssetRows(data, formatAmount);
    
    // Pasif (Kaynaklar) tablosu
    const liabilityRows = this.buildLiabilityRows(data, formatAmount);

    if (isLandscape) {
      // Yan yana layout
      const startY = this.currentY;

      // Sol: Aktif
      autoTable(this.pdf, {
        head: [['AKTİF (VARLIKLAR)', 'Tutar']],
        body: assetRows,
        startY: startY,
        margin: { left: margin, right: pageWidth / 2 + margin / 2 },
        tableWidth: halfWidth,
        theme: 'plain',
        showHead: 'everyPage',
        styles: { fontSize: 8, cellPadding: 1.5, font: 'OpenSans' },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'OpenSans',
        },
        columnStyles: {
          0: { cellWidth: halfWidth * 0.65 },
          1: { cellWidth: halfWidth * 0.35, halign: 'right' },
        },
        didParseCell: (data) => {
          // Total satırları bold
          const text = data.cell.raw as string;
          if (text && (text.includes('TOPLAM') || text.startsWith('I -') || text.startsWith('II -'))) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // Sağ: Pasif
      autoTable(this.pdf, {
        head: [['PASİF (KAYNAKLAR)', 'Tutar']],
        body: liabilityRows,
        startY: startY,
        margin: { left: pageWidth / 2 + margin / 2, right: margin },
        tableWidth: halfWidth,
        theme: 'plain',
        showHead: 'everyPage',
        styles: { fontSize: 8, cellPadding: 1.5, font: 'OpenSans' },
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'OpenSans',
        },
        columnStyles: {
          0: { cellWidth: halfWidth * 0.65 },
          1: { cellWidth: halfWidth * 0.35, halign: 'right' },
        },
        didParseCell: (data) => {
          const text = data.cell.raw as string;
          if (text && (text.includes('TOPLAM') || text.startsWith('I -') || text.startsWith('II -') || text.startsWith('III -'))) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // @ts-ignore
      const assetEndY = this.pdf.lastAutoTable?.finalY || startY + 100;
      this.currentY = assetEndY + 10;
    } else {
      // Üst üste layout (portrait)
      autoTable(this.pdf, {
        head: [['AKTİF (VARLIKLAR)', 'Tutar']],
        body: assetRows,
        startY: this.currentY,
        margin: { left: margin, right: margin },
        theme: 'plain',
        showHead: 'everyPage',
        styles: { fontSize: 9, cellPadding: 2, font: 'OpenSans' },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'OpenSans',
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right' },
        },
      });

      // @ts-ignore
      this.currentY = this.pdf.lastAutoTable?.finalY + 10;

      autoTable(this.pdf, {
        head: [['PASİF (KAYNAKLAR)', 'Tutar']],
        body: liabilityRows,
        startY: this.currentY,
        margin: { left: margin, right: margin },
        theme: 'plain',
        showHead: 'everyPage',
        styles: { fontSize: 9, cellPadding: 2, font: 'OpenSans' },
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'OpenSans',
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right' },
        },
      });

      // @ts-ignore
      this.currentY = this.pdf.lastAutoTable?.finalY + 10;
    }

    // Denge kontrolü
    if (!data.isBalanced) {
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(239, 68, 68);
      this.pdf.text(
        `⚠ Aktif-Pasif Farkı: ${formatAmount(data.difference)}`,
        pageWidth / 2,
        this.currentY,
        { align: 'center' }
      );
      this.currentY += 10;
    }
  }

  private renderIncomeStatement(section: IncomeStatementSection): void {
    const { data, year, formatAmount } = section;
    const margin = this.config.margin;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Başlık
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(30, 30, 30);
    this.pdf.text(`Gelir Tablosu - ${year}`, pageWidth / 2, this.currentY + 5, { align: 'center' });
    this.currentY += 15;

    const rows = this.buildIncomeStatementRows(data, formatAmount);

    autoTable(this.pdf, {
      head: [['Hesap', 'Tutar']],
      body: rows,
      startY: this.currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      showHead: 'everyPage',
      styles: { fontSize: 9, cellPadding: 2, font: 'OpenSans' },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        font: 'OpenSans',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 40 },
      },
      didParseCell: (data) => {
        const text = data.cell.raw as string;
        if (
          text &&
          (text.includes('BRÜT') ||
            text.includes('NET') ||
            text.includes('KAR') ||
            text.includes('TOPLAM'))
        ) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // @ts-ignore
    this.currentY = this.pdf.lastAutoTable?.finalY + 10;
  }

  private renderDetailedIncome(section: DetailedIncomeSection): void {
    const { data, formatAmount } = section;
    const margin = this.config.margin;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Başlık
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(30, 30, 30);
    this.pdf.text(
      `Detaylı Gelir Tablosu - ${data.year}`,
      pageWidth / 2,
      this.currentY + 5,
      { align: 'center' }
    );
    this.currentY += 15;

    const rows: string[][] = data.lines.map((line) => {
      const indent = '  '.repeat(line.depth || 0);
      const name = `${line.code ? line.code + ' - ' : ''}${indent}${line.name}`;
      const amount = line.totalAmount !== undefined ? formatAmount(line.totalAmount) : '';
      return [name, amount];
    });

    autoTable(this.pdf, {
      head: [['Hesap Kodu - Açıklama', 'Tutar']],
      body: rows,
      startY: this.currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      showHead: 'everyPage',
      styles: { fontSize: 8, cellPadding: 1.5, font: 'OpenSans' },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        font: 'OpenSans',
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 35 },
      },
      didParseCell: (data) => {
        const line = data.section === 'body' ? data.row.raw : null;
        if (line && Array.isArray(line)) {
          const text = line[0] as string;
          if (text && (text.includes('TOPLAM') || text.match(/^[A-Z] -/))) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [243, 244, 246];
          }
        }
      },
    });

    // @ts-ignore
    this.currentY = this.pdf.lastAutoTable?.finalY + 10;
  }

  private renderText(section: TextSection): void {
    const { content, style, align } = section;
    const margin = this.config.margin;
    const pageWidth = this.pdf.internal.pageSize.getWidth();

    // Stil ayarları
    switch (style) {
      case 'title':
        this.pdf.setFontSize(18);
        this.pdf.setTextColor(30, 30, 30);
        break;
      case 'subtitle':
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(60, 60, 60);
        break;
      case 'caption':
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(120, 120, 120);
        break;
      default:
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(50, 50, 50);
    }

    // Hizalama
    let x = margin;
    if (align === 'center') x = pageWidth / 2;
    else if (align === 'right') x = pageWidth - margin;

    this.pdf.text(content, x, this.currentY, { align: align || 'left' });
    this.currentY += style === 'title' ? 12 : style === 'subtitle' ? 10 : 6;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private buildAssetRows(data: BalanceSheet, formatAmount: (v: number) => string): string[][] {
    const rows: string[][] = [];
    const ca = data.currentAssets;
    const fa = data.fixedAssets;

    // I - DÖNEN VARLIKLAR
    rows.push(['I - DÖNEN VARLIKLAR', '']);
    rows.push(['  A - Hazır Değerler', '']);
    rows.push(['    100 - Kasa', formatAmount(ca.cash)]);
    rows.push(['    102 - Bankalar', formatAmount(ca.banks)]);
    rows.push(['  B - Ticari Alacaklar', '']);
    rows.push(['    120 - Alıcılar', formatAmount(ca.receivables)]);
    if (ca.partnerReceivables > 0) {
      rows.push(['    131 - Ortaklardan Alacaklar', formatAmount(ca.partnerReceivables)]);
    }
    rows.push(['  C - Diğer Alacaklar', '']);
    rows.push(['    191 - İndirilecek KDV', formatAmount(ca.vatReceivable)]);
    if (ca.otherVat && ca.otherVat > 0) {
      rows.push(['    192 - Diğer KDV', formatAmount(ca.otherVat)]);
    }
    if (ca.inventory > 0) {
      rows.push(['  D - Stoklar', '']);
      rows.push(['    153 - Ticari Mallar', formatAmount(ca.inventory)]);
    }
    rows.push(['  DÖNEN VARLIKLAR TOPLAMI', formatAmount(ca.total)]);

    // II - DURAN VARLIKLAR
    rows.push(['II - DURAN VARLIKLAR', '']);
    if (fa.equipment > 0) {
      rows.push(['    255 - Demirbaşlar', formatAmount(fa.equipment)]);
    }
    if (fa.vehicles > 0) {
      rows.push(['    254 - Taşıtlar', formatAmount(fa.vehicles)]);
    }
    if (fa.depreciation > 0) {
      rows.push(['    257 - Birikmiş Amortisman (-)', `(${formatAmount(fa.depreciation)})`]);
    }
    rows.push(['  DURAN VARLIKLAR TOPLAMI', formatAmount(fa.total)]);

    // AKTİF TOPLAMI
    rows.push(['AKTİF TOPLAMI', formatAmount(data.totalAssets)]);

    return rows;
  }

  private buildLiabilityRows(data: BalanceSheet, formatAmount: (v: number) => string): string[][] {
    const rows: string[][] = [];
    const stl = data.shortTermLiabilities;
    const ltl = data.longTermLiabilities;
    const eq = data.equity;

    // I - KISA VADELİ YABANCI KAYNAKLAR
    rows.push(['I - KISA VADELİ YABANCI KAYNAKLAR', '']);
    rows.push(['  A - Mali Borçlar', '']);
    if (stl.loanInstallments > 0) {
      rows.push(['    300 - Banka Kredileri', formatAmount(stl.loanInstallments)]);
    }
    rows.push(['  B - Ticari Borçlar', '']);
    rows.push(['    320 - Satıcılar', formatAmount(stl.payables)]);
    if (stl.partnerPayables > 0) {
      rows.push(['    331 - Ortaklara Borçlar', formatAmount(stl.partnerPayables)]);
    }
    rows.push(['  C - Diğer Borçlar', '']);
    if (stl.personnelPayables && stl.personnelPayables > 0) {
      rows.push(['    335 - Personele Borçlar', formatAmount(stl.personnelPayables)]);
    }
    rows.push(['  D - Ödenecek Vergi ve Fonlar', '']);
    rows.push(['    360 - Ödenecek Vergi', formatAmount(stl.taxPayable)]);
    rows.push(['    391 - Hesaplanan KDV', formatAmount(stl.vatPayable)]);
    if (stl.socialSecurityPayables && stl.socialSecurityPayables > 0) {
      rows.push(['    361 - Ödenecek SGK', formatAmount(stl.socialSecurityPayables)]);
    }
    if (stl.taxProvision && stl.taxProvision > 0) {
      rows.push(['    370 - Dönem Karı Vergi Karşılığı', formatAmount(stl.taxProvision)]);
    }
    rows.push(['  KISA VADELİ YABANCI KAYNAKLAR TOPLAMI', formatAmount(stl.total)]);

    // II - UZUN VADELİ YABANCI KAYNAKLAR
    rows.push(['II - UZUN VADELİ YABANCI KAYNAKLAR', '']);
    if (ltl.bankLoans > 0) {
      rows.push(['    400 - Banka Kredileri', formatAmount(ltl.bankLoans)]);
    }
    rows.push(['  UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI', formatAmount(ltl.total)]);

    // III - ÖZKAYNAKLAR
    rows.push(['III - ÖZKAYNAKLAR', '']);
    rows.push(['  A - Ödenmiş Sermaye', '']);
    rows.push(['    500 - Sermaye', formatAmount(eq.paidCapital)]);
    if (eq.unpaidCapital && eq.unpaidCapital > 0) {
      rows.push(['    501 - Ödenmemiş Sermaye (-)', `(${formatAmount(eq.unpaidCapital)})`]);
    }
    rows.push(['  B - Kar Yedekleri', '']);
    rows.push(['    570 - Geçmiş Yıllar Karları', formatAmount(eq.retainedEarnings)]);
    rows.push(['    590 - Dönem Net Karı', formatAmount(eq.currentProfit)]);
    rows.push(['  ÖZKAYNAKLAR TOPLAMI', formatAmount(eq.total)]);

    // PASİF TOPLAMI
    rows.push(['PASİF TOPLAMI', formatAmount(data.totalLiabilities)]);

    return rows;
  }

  private buildIncomeStatementRows(
    data: IncomeStatementData,
    formatAmount: (v: number) => string
  ): string[][] {
    return [
      ['A - BRÜT SATIŞLAR', formatAmount(data.grossSales.total)],
      ['    600 - Yurtiçi Satışlar', formatAmount(data.grossSales.yurtici)],
      ['    601 - Yurtdışı Satışlar', formatAmount(data.grossSales.yurtdisi)],
      ['    602 - Diğer Gelirler', formatAmount(data.grossSales.diger)],
      ['B - SATIŞ İNDİRİMLERİ (-)', `(${formatAmount(data.salesReturns)})`],
      ['C - NET SATIŞLAR', formatAmount(data.netSales)],
      ['D - SATIŞLARIN MALİYETİ (-)', `(${formatAmount(data.costOfSales)})`],
      ['BRÜT SATIŞ KARI', formatAmount(data.grossProfit)],
      ['E - FAALİYET GİDERLERİ (-)', `(${formatAmount(data.operatingExpenses.total)})`],
      ['    631 - Pazarlama Satış Dağıtım', `(${formatAmount(data.operatingExpenses.pazarlama)})`],
      ['    632 - Genel Yönetim Giderleri', `(${formatAmount(data.operatingExpenses.genelYonetim)})`],
      ['FAALİYET KARI (EBIT)', formatAmount(data.operatingProfit)],
      ['F - DİĞER FAALİYET GELİRLERİ', formatAmount(data.otherIncome.total)],
      ['G - DİĞER FAALİYET GİDERLERİ (-)', `(${formatAmount(data.otherExpenses.total)})`],
      ['H - FİNANSMAN GİDERLERİ (-)', `(${formatAmount(data.financeExpenses)})`],
      ['OLAĞAN KAR', formatAmount(data.ordinaryProfit)],
      ['I - OLAĞANDIŞI GELİRLER', formatAmount(data.extraordinaryIncome)],
      ['J - OLAĞANDIŞI GİDERLER (-)', `(${formatAmount(data.extraordinaryExpenses)})`],
      ['DÖNEM KARI (VERGİ ÖNCESİ)', formatAmount(data.preTaxProfit)],
      ['K - VERGİ KARŞILIĞI (-)', `(${formatAmount(data.taxExpense)})`],
      ['DÖNEM NET KARI', formatAmount(data.netProfit)],
    ];
  }

  private convertColumnStyles(
    styles?: Record<number, TableColumnStyle>
  ): Record<number, Partial<{ halign: 'left' | 'center' | 'right'; cellWidth: number | 'auto' | 'wrap'; fontStyle: 'normal' | 'bold' | 'italic' }>> | undefined {
    if (!styles) return undefined;
    const result: Record<number, any> = {};
    for (const [key, value] of Object.entries(styles)) {
      result[Number(key)] = value;
    }
    return result;
  }

  private addPageNumbers(): void {
    const pageCount = this.pdf.getNumberOfPages();
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.text(
        `Sayfa ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Portrait modda PDF builder oluştur
 */
export function createPortraitBuilder(config?: Partial<PdfBuilderConfig>): PdfDocumentBuilder {
  return new PdfDocumentBuilder({ ...config, orientation: 'portrait' });
}

/**
 * Landscape modda PDF builder oluştur
 */
export function createLandscapeBuilder(config?: Partial<PdfBuilderConfig>): PdfDocumentBuilder {
  return new PdfDocumentBuilder({ ...config, orientation: 'landscape' });
}
