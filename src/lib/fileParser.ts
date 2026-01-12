import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
 * Parse PDF file and extract text content
 */
export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let content = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    content += pageText + '\n\n';
  }
  
  return content.trim();
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
      // Fallback to text for unknown types
      return file.text();
  }
}
