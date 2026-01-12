import * as XLSX from 'xlsx';

/**
 * Parse XLSX/XLS file and extract content as text
 */
export async function parseXLSX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  let content = '';
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Extract as CSV format (tab-separated for better AI parsing)
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t', RS: '\n' });
    content += csv + '\n\n';
  });
  
  return content.trim();
}

/**
 * Parse PDF file - extract text using basic approach
 * Note: For complex PDFs, XLSX format is recommended
 */
export async function parsePDF(file: File): Promise<string> {
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
