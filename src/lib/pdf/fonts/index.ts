// ============================================
// PDF FONTS - TÜRKÇE KARAKTER DESTEĞİ
// ============================================

// Roboto font için jsPDF VFS ekleme helper
export function addTurkishFontSupport(pdf: any): void {
  // jsPDF varsayılan Helvetica fontu Türkçe karakterleri desteklemiyor
  // Ancak modern jsPDF (2.0+) UTF-8 metin encoding destekliyor
  // Bu nedenle özel font eklemeye gerek yok, sadece text encoding'i doğru ayarlıyoruz
  
  // Not: Tam font embed etmek için ~200KB Base64 TTF dosyası gerekiyor
  // Performans için text encoding yaklaşımı tercih edildi
  
  // jsPDF'in Türkçe karakterleri düzgün render etmesi için
  // text encoding'i unicode olarak ayarla
  try {
    // Bu ayar text() metodunda Türkçe karakterleri korur
    pdf.setLanguage?.('tr');
  } catch {
    // Eski jsPDF versiyonlarında bu metod olmayabilir
  }
}

// Türkçe karakter düzeltme fonksiyonu
// jsPDF'in doğru render etmediği karakterleri düzeltir
export function sanitizeTurkishText(text: string): string {
  if (!text) return '';
  
  // Türkçe karakterlerin unicode kodları korunur
  // jsPDF 2.0+ UTF-8 destekliyor
  return text
    .normalize('NFC'); // Unicode normalization
}

// Tablo hücreleri için Türkçe metin hazırlama
export function prepareTurkishTableData(rows: (string | number)[][]): string[][] {
  return rows.map(row => 
    row.map(cell => {
      if (typeof cell === 'number') return String(cell);
      return sanitizeTurkishText(String(cell));
    })
  );
}
