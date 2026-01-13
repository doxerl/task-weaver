import * as XLSX from 'xlsx';

export interface ParsedFileResult {
  content: string;        // Data rows with [ROW X] prefix
  headerRow: string;      // First row (header) without [ROW] prefix
  dataRowCount: number;   // Number of data rows (excluding header)
  totalRowCount: number;  // Total rows including header
}

/**
 * Parse XLSX/XLS file and extract content as text with row numbers
 * Each row is prefixed with [ROW X] for AI tracking
 * Returns header separately for correct batch processing
 */
export async function parseXLSX(file: File): Promise<ParsedFileResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  
  let headerRow = '';
  let fullText = '';
  let dataRowCount = 0;
  let totalRowCount = 0;
  
  // Only process the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  for (let row = range.s.r; row <= range.e.r; row++) {
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
    
    // Skip completely empty rows
    if (!rowText.trim()) {
      continue;
    }
    
    totalRowCount++;
    
    // First non-empty row is the header
    if (row === range.s.r) {
      headerRow = rowText;
    } else {
      // Data rows: use Excel row number (1-indexed) for tracking
      const excelRowNum = row + 1; // Excel uses 1-indexed rows
      fullText += `[ROW ${excelRowNum}]\t${rowText}\n`;
      dataRowCount++;
    }
  }
  
  console.log(`📊 Excel parse: ${totalRowCount} total rows, ${dataRowCount} data rows, header: "${headerRow.substring(0, 50)}..."`);
  
  return {
    content: fullText.trim(),
    headerRow,
    dataRowCount,
    totalRowCount
  };
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
 * Returns ParsedFileResult for Excel files, string for others
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseXLSX(file);
    case 'pdf': {
      const text = await parsePDF(file);
      const lines = text.split('\n').filter(l => l.trim());
      return {
        content: text,
        headerRow: lines[0] || '',
        dataRowCount: lines.length > 0 ? lines.length - 1 : 0,
        totalRowCount: lines.length
      };
    }
    default: {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      return {
        content: text,
        headerRow: lines[0] || '',
        dataRowCount: lines.length > 0 ? lines.length - 1 : 0,
        totalRowCount: lines.length
      };
    }
  }
}
