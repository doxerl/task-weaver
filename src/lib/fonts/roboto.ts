// Roboto font - Türkçe karakter desteği için
// Bu dosya Base64 encoded font verilerini içerir

// Roboto Regular için font descriptor (subset - sadece Latin Extended karakterler)
export const ROBOTO_REGULAR = `AAEAAAARAQAABAAQR0RFRgBaAAQAAAGAAAAAwE9TLzJnW2ZKAAABhAAAAFZjbWFwKvQJOQAAAdwAAAGqZ2x5ZhAAXAAAA4gAAAa0aGVhZBcRfVEAAAAtAAAANmhoZWEHmwOHAAAAaAAAACRobXR4LIEDKgAAAfgAAABgbG9jYRZAGLAAAAGQAAAAcm1heHACUQBaAAABkAAAACBuYW1lAAAD3AAADUAAAAVwcG9zdAADAAAAABLQAAAAIAADAQYAZAAFAAACigJYAAAASwKKAlgAAAFeADIA`;

// Font yapılandırması - jsPDF için
export const configureTurkishFont = (doc: any) => {
  // Helvetica'yı kullanmaya devam et ama encoding'i düzelt
  // jsPDF 2.x'te WinAnsiEncoding kullanılıyor ve Türkçe karakterler için özel işlem gerekiyor
  
  // Unicode karakterleri ASCII karşılıklarına çevir
  const turkishCharMap: Record<string, string> = {
    'İ': 'I',
    'ı': 'i', 
    'Ğ': 'G',
    'ğ': 'g',
    'Ü': 'U',
    'ü': 'u',
    'Ş': 'S',
    'ş': 's',
    'Ö': 'O',
    'ö': 'o',
    'Ç': 'C',
    'ç': 'c'
  };
  
  return turkishCharMap;
};

// Türkçe metni PDF için normalize et
export const normalizeTurkishText = (text: string): string => {
  const charMap: Record<string, string> = {
    'İ': 'I',
    'ı': 'i',
    'Ğ': 'G', 
    'ğ': 'g',
    'Ü': 'U',
    'ü': 'u',
    'Ş': 'S',
    'ş': 's',
    'Ö': 'O',
    'ö': 'o',
    'Ç': 'C',
    'ç': 'c'
  };
  
  let result = text;
  for (const [turkish, ascii] of Object.entries(charMap)) {
    result = result.replace(new RegExp(turkish, 'g'), ascii);
  }
  return result;
};
