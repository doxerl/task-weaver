import * as XLSX from 'xlsx';

/**
 * Parse XLSX/XLS file and extract content as text with row numbers
 * Each row is prefixed with [ROW X] for AI tracking
 */
export async function parseXLSX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  
  let fullText = '';
  
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    fullText += `=== SAYFA ${sheetIndex + 1}: ${sheetName} ===\n`;
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      const rowNum = row + 1;
      const rowData: string[] = [];
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        
        if (cell) {
          // Format dates as DD.MM.YYYY
          if (cell.t === 'd' && cell.v instanceof Date) {
            const d = cell.v;
            rowData.push(`${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`);
          } else {
            rowData.push(String(cell.v || '').trim());
          }
        } else {
          rowData.push('');
        }
      }
      
      const rowText = rowData.join('\t');
      if (rowText.trim()) {
        fullText += `[ROW ${rowNum}]\t${rowText}\n`;
      }
    }
  });
  
  return fullText.trim();
}

/**
 * Parse PDF file - extract text using basic approach
 * Note: For complex PDFs, XLSX format is recommended
 * WARNING: Basic PDF parsing may miss some content. Use XLSX for best results.
 */
export async function parsePDF(file: File): Promise<string> {
  console.warn('PDF parsing basit modda çalışıyor. En iyi sonuç için XLSX formatını kullanın.');
  
  // Try to read as text (works for some PDFs with embedded text)
  const text = await file.text();
  
  // Check if we got readable content
  if (text && !text.startsWith('%PDF') && text.length > 100) {
    return text;
  }
  
  // For binary PDFs, extract what we can
  // Remove binary garbage and keep printable characters
  const cleanText = text
    .replace(/[^\x20-\x7E\n\r\t\u00C0-\u017F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanText.length < 50) {
    throw new Error('PDF dosyasından metin çıkarılamadı. Lütfen XLSX formatını kullanın.');
  }
  
  return cleanText;
}

/**
 * Parse file based on its type
 */
export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseXLSX(file);
    case 'pdf':
      return parsePDF(file);
    default:
      return file.text();
  }
}
