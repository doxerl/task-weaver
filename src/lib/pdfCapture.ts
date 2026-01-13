// PDF oluşturma için yardımcı fonksiyonlar
// html2canvas'ı dinamik olarak yükleyerek TypeScript compiler sorunlarını önler

import jsPDF from 'jspdf';

export interface ScreenshotPdfOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  scale?: number;
  onProgress?: (stage: string) => void;
  waitTime?: number;
}

/**
 * HTML elementini ekran görüntüsü alarak PDF'e dönüştürür
 * Ekrandaki görünümü birebir yakalar - Türkçe karakterler sorunsuz
 */
export async function captureElementToPdf(
  element: HTMLElement,
  options: ScreenshotPdfOptions
): Promise<boolean> {
  const { 
    filename, 
    orientation = 'portrait', 
    margin = 10, 
    scale = 2,
    waitTime = 800 
  } = options;
  
  try {
    options.onProgress?.('Sayfa hazırlanıyor...');
    
    // Render tamamlanmasını bekle
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    options.onProgress?.('Ekran yakalanıyor...');
    
    // html2canvas'ı dinamik olarak import et
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    // html2canvas ile yakala
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
    
    options.onProgress?.('PDF oluşturuluyor...');
    
    // PDF boyutları (A4)
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Canvas'ı PNG'ye çevir
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // İlk sayfa
    let heightLeft = imgHeight;
    let position = margin;
    let pageNumber = 1;
    
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);
    
    // Ek sayfalar (içerik uzunsa)
    while (heightLeft > 0) {
      position = -(pageNumber * (pageHeight - margin * 2)) + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
      pageNumber++;
    }
    
    options.onProgress?.('İndiriliyor...');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    return false;
  }
}
