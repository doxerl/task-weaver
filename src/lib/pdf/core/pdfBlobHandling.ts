// ============================================
// PDF BLOB İŞLEME MODÜLÜ
// PDF dosyası oluşturma, indirme, açma işlemleri
// ============================================

/**
 * Base64 encoded PDF verisinden Blob oluşturur
 */
export function createPdfBlob(base64Data: string): Blob {
  // Base64 prefix'ini kaldır
  const base64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
  
  // Base64'ü binary'e çevir
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * jsPDF document'ından blob oluşturur
 */
export function createBlobFromJsPdf(doc: any): Blob {
  return doc.output('blob');
}

/**
 * Standard download denemesi
 */
function tryStandardDownload(url: string, filename: string): boolean {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.cssText = 'display:none;position:absolute;left:-9999px;';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
    
    return true;
  } catch (e) {
    console.error('[PDF Download] Standard download hatası:', e);
    return false;
  }
}

/**
 * PDF'i dosya olarak indirir (gelişmiş versiyon)
 * Birden fazla yöntem dener
 */
export function downloadPdf(
  blob: Blob,
  filename: string,
  options?: {
    companyName?: string;
    date?: Date;
    addTimestamp?: boolean;
  }
): void {
  console.log('[PDF Download] Başlatılıyor...');
  console.log('[PDF Download] Blob boyutu:', blob.size, 'bytes');
  
  // Dosya adını oluştur
  let finalFilename = filename;
  
  if (options?.companyName) {
    finalFilename = `${options.companyName}_${finalFilename}`;
  }
  
  if (options?.addTimestamp) {
    const date = options?.date || new Date();
    const timestamp = date.toISOString().split('T')[0];
    finalFilename = finalFilename.replace('.pdf', `_${timestamp}.pdf`);
  }
  
  // .pdf uzantısını garantile
  if (!finalFilename.endsWith('.pdf')) {
    finalFilename += '.pdf';
  }
  
  console.log('[PDF Download] Dosya adı:', finalFilename);
  
  // Blob URL oluştur
  const url = URL.createObjectURL(blob);
  console.log('[PDF Download] Blob URL oluşturuldu');
  
  // Yöntem 1: Standard download link
  const success = tryStandardDownload(url, finalFilename);
  
  if (success) {
    console.log('[PDF Download] Standard download başarılı');
    // Cleanup - daha uzun timeout
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log('[PDF Download] Temizlik tamamlandı');
    }, 1000);
    return;
  }
  
  // Yöntem 2: navigator.msSaveBlob (IE/Edge legacy)
  if ('msSaveBlob' in navigator) {
    try {
      (navigator as any).msSaveBlob(blob, finalFilename);
      console.log('[PDF Download] msSaveBlob ile indirildi');
      URL.revokeObjectURL(url);
      return;
    } catch (e) {
      console.warn('[PDF Download] msSaveBlob hatası:', e);
    }
  }
  
  // Yöntem 3: Son çare - yeni sekmede aç
  console.log('[PDF Download] Fallback: Yeni sekmede açılıyor');
  window.open(url, '_blank');
  
  // Yeni sekmede açıldıysa URL'i daha uzun süre tut
  setTimeout(() => {
    URL.revokeObjectURL(url);
    console.log('[PDF Download] Temizlik tamamlandı (fallback)');
  }, 60000);
}

/**
 * PDF'i yeni sekmede açar
 */
export function openPdfInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  
  // URL'i bir süre sonra revoke et
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000); // 1 dakika
}

/**
 * PDF'i önizleme olarak gösterir (iframe)
 */
export function previewPdf(
  blob: Blob,
  container: HTMLElement
): () => void {
  const url = URL.createObjectURL(blob);
  
  // Iframe oluştur
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  
  // Container'a ekle
  container.innerHTML = '';
  container.appendChild(iframe);
  
  // Cleanup fonksiyonu döndür
  return () => {
    URL.revokeObjectURL(url);
    container.innerHTML = '';
  };
}

/**
 * PDF dosyasını blob olarak memory'de tutar
 * Birden fazla işlem için tekrar oluşturmayı önler
 */
export class PdfBlobCache {
  private cache: Map<string, { blob: Blob; timestamp: number }> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5 dakika
  
  set(key: string, blob: Blob): void {
    this.cache.set(key, {
      blob,
      timestamp: Date.now()
    });
    this.cleanup();
  }
  
  get(key: string): Blob | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Süresi dolmuş mu kontrol et
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.blob;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const pdfCache = new PdfBlobCache();

/**
 * Dosya boyutunu formatlar
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * PDF metadata'sını okur (basit versiyon)
 */
export function getPdfMetadata(blob: Blob): Promise<{ size: string; pages?: number }> {
  return new Promise((resolve) => {
    resolve({
      size: formatFileSize(blob.size),
      // Sayfa sayısı için tam PDF parsing gerekir
      // Bu basit versiyonda dahil değil
    });
  });
}
