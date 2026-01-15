// ============================================
// MERKEZI PDF ENGINE - YARDIMCI FONKSİYONLAR
// ============================================

import jsPDF from 'jspdf';
import { PDF_COLORS } from './pdfTypes';

export { PDF_COLORS };
import { PDF_COLORS } from './pdfTypes';

// ============================================
// TÜRKÇE KARAKTER NORMALİZASYONU
// ============================================

const TURKISH_CHAR_MAP: Record<string, string> = {
  'İ': 'I', 'ı': 'i',
  'Ğ': 'G', 'ğ': 'g',
  'Ü': 'U', 'ü': 'u',
  'Ş': 'S', 'ş': 's',
  'Ö': 'O', 'ö': 'o',
  'Ç': 'C', 'ç': 'c',
};

/**
 * Türkçe karakterleri PDF uyumlu ASCII karakterlere dönüştürür
 * Tüm PDF fonksiyonlarında kullanılmalıdır
 */
export function tr(text: string): string {
  if (!text) return '';
  return text.replace(/[İıĞğÜüŞşÖöÇç]/g, char => TURKISH_CHAR_MAP[char] || char);
}

// Alias for backward compatibility
export const normalizeTurkish = tr;
export const normalizeText = tr;

// ============================================
// PARA BİRİMİ FORMATLAMA
// ============================================

/**
 * Tutarı para birimi formatına dönüştürür
 */
export function formatCurrency(
  value: number,
  currency: 'TRY' | 'USD' = 'TRY',
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string {
  const { 
    minimumFractionDigits = 2, 
    maximumFractionDigits = 2,
    showSymbol = true 
  } = options || {};
  
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
  
  return formatted;
}

/**
 * PDF için basit tutar formatı (sembol olmadan)
 */
export function formatAmount(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * USD formatı
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * TRY formatı
 */
export function formatTRY(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Yüzde formatı
 */
export function formatPercent(value: number, showSign: boolean = true): string {
  const prefix = showSign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Negatif değerler için parantezli format
 */
export function formatWithParens(value: number, formatter: (v: number) => string): string {
  if (value < 0) {
    return `(${formatter(Math.abs(value))})`;
  }
  return formatter(value);
}

// ============================================
// SAYFA NUMARASI
// ============================================

/**
 * Tüm sayfalara sayfa numarası ekler
 */
export function addPageNumbers(doc: jsPDF, format: string = 'Sayfa {current}/{total}'): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    
    const text = format
      .replace('{current}', String(i))
      .replace('{total}', String(pageCount));
    
    doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
}

// ============================================
// BÖLÜM BAŞLIKLARI
// ============================================

/**
 * Renkli başlık bandı ekler
 */
export function addSectionHeader(
  doc: jsPDF,
  title: string,
  color: [number, number, number] = PDF_COLORS.primary
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Renkli bant
  doc.setFillColor(...color);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Başlık metni
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(tr(title), pageWidth / 2, 17, { align: 'center' });
}

/**
 * Alt başlık ekler
 */
export function addSubHeader(
  doc: jsPDF,
  title: string,
  yPos: number,
  options?: {
    fontSize?: number;
    color?: [number, number, number];
  }
): void {
  const { fontSize = 12, color = PDF_COLORS.black } = options || {};
  
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(tr(title), 15, yPos);
}

// ============================================
// KAPAK SAYFASI
// ============================================

/**
 * Standart kapak sayfası oluşturur
 */
export function createCoverPage(
  doc: jsPDF,
  options: {
    title: string;
    subtitle?: string;
    year?: number;
    date?: string;
    currency?: 'TRY' | 'USD';
    yearlyAverageRate?: number;
    tableOfContents?: string[];
    companyName?: string;
  }
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { 
    title, 
    subtitle, 
    year, 
    date,
    currency = 'TRY',
    yearlyAverageRate,
    tableOfContents,
    companyName 
  } = options;
  
  // Mavi başlık bandı
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // Şirket adı
  if (companyName) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(tr(companyName.toUpperCase()), pageWidth / 2, 25, { align: 'center' });
  }
  
  // Ana başlık
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(tr(title), pageWidth / 2, companyName ? 45 : 40, { align: 'center' });
  
  // Alt başlık
  if (subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(tr(subtitle), pageWidth / 2, companyName ? 58 : 55, { align: 'center' });
  }
  
  // Dönem bilgisi
  if (year) {
    doc.setFontSize(12);
    doc.text(`${year}`, pageWidth / 2, 70, { align: 'center' });
  }
  
  // Tarih ve kur bilgisi
  let yPos = 100;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const displayDate = date || new Date().toLocaleDateString('tr-TR');
  doc.text(tr(`Hazirlanma Tarihi: ${displayDate}`), 15, yPos);
  yPos += 8;
  
  if (currency === 'USD' && yearlyAverageRate) {
    doc.text(tr(`Para Birimi: USD (Yillik Ort. Kur: ${yearlyAverageRate.toFixed(2)} TL/USD)`), 15, yPos);
    yPos += 8;
  }
  
  // İçindekiler
  if (tableOfContents && tableOfContents.length > 0) {
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(tr('ICINDEKILER'), 15, yPos);
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    tableOfContents.forEach((item, index) => {
      doc.text(tr(`${index + 1}. ${item}`), 20, yPos);
      yPos += 8;
    });
  }
}

// ============================================
// TARİH FORMATLAMA
// ============================================

export const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const MONTH_NAMES_SHORT_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

/**
 * Ay adını döndürür
 */
export function getMonthName(month: number, short: boolean = false): string {
  const names = short ? MONTH_NAMES_SHORT_TR : MONTH_NAMES_TR;
  return names[month - 1] || '';
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

/**
 * Yeni sayfa gerekli mi kontrol eder
 */
export function needsNewPage(doc: jsPDF, currentY: number, requiredSpace: number): boolean {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  return currentY + requiredSpace > pageHeight - margin;
}

/**
 * Metni belirli genişliğe sığdırmak için böler
 */
export function splitTextToWidth(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(tr(text), maxWidth);
}

/**
 * Renk tonunu açar/koyulaştırır
 */
export function adjustColor(
  color: [number, number, number],
  amount: number
): [number, number, number] {
  return color.map(c => Math.max(0, Math.min(255, c + amount))) as [number, number, number];
}
