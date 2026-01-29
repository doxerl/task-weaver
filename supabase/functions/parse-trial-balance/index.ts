import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import pdfParse from "https://esm.sh/pdf-parse@1.1.1";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrialBalanceAccount {
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface ParseResult {
  accounts: Record<string, TrialBalanceAccount>;
  detectedFormat: string;
  totalRows: number;
  warnings: string[];
}

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // Handle Turkish number format (1.234,56 -> 1234.56)
  const str = String(value)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function detectColumnIndices(headers: any[]): { code: number; name: number; debit: number; credit: number; debitBal: number; creditBal: number } | null {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  // Common Turkish mizan column names
  const codePatterns = ['hesap kodu', 'hesap no', 'kod', 'hesap', 'account code'];
  const namePatterns = ['hesap adı', 'hesap adi', 'açıklama', 'aciklama', 'account name'];
  const debitPatterns = ['borç', 'borc', 'debit'];
  const creditPatterns = ['alacak', 'credit'];
  const debitBalPatterns = ['borç bakiye', 'borc bakiye', 'borç bak', 'debit balance'];
  const creditBalPatterns = ['alacak bakiye', 'alacak bak', 'credit balance'];

  const findIndex = (patterns: string[]) => {
    for (const pattern of patterns) {
      const idx = lowerHeaders.findIndex(h => h.includes(pattern));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const codeIdx = findIndex(codePatterns);
  const nameIdx = findIndex(namePatterns);
  const debitIdx = findIndex(debitPatterns);
  const creditIdx = findIndex(creditPatterns);
  
  // For balance columns, try specific patterns first
  let debitBalIdx = findIndex(debitBalPatterns);
  let creditBalIdx = findIndex(creditBalPatterns);

  // If balance columns not found, they might be the last two numeric columns
  if (debitBalIdx === -1 && creditBalIdx === -1) {
    // Try to find columns after the main debit/credit
    if (debitIdx !== -1 && creditIdx !== -1) {
      // Look for additional columns after credit
      const afterCredit = lowerHeaders.slice(creditIdx + 1);
      if (afterCredit.length >= 2) {
        debitBalIdx = creditIdx + 1;
        creditBalIdx = creditIdx + 2;
      }
    }
  }

  if (codeIdx === -1 || debitIdx === -1) {
    return null;
  }

  return {
    code: codeIdx,
    name: nameIdx !== -1 ? nameIdx : codeIdx + 1,
    debit: debitIdx,
    credit: creditIdx !== -1 ? creditIdx : debitIdx + 1,
    debitBal: debitBalIdx !== -1 ? debitBalIdx : -1,
    creditBal: creditBalIdx !== -1 ? creditBalIdx : -1,
  };
}

function isValidAccountCode(code: string): boolean {
  // Valid account codes: 1xx-9xx (3 digits) or more specific like 100.01
  const trimmed = code.trim();
  return /^\d{3}(\.\d{2})?$/.test(trimmed) || /^\d{3}$/.test(trimmed);
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const accounts: Record<string, TrialBalanceAccount> = {};
  const warnings: string[] = [];
  let detectedFormat = 'unknown';

  if (data.length < 2) {
    return { accounts, detectedFormat, totalRows: 0, warnings: ['Dosya boş veya geçersiz'] };
  }

  // Find header row (usually first non-empty row)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i] && data[i].length > 3) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = data[headerRowIdx];
  const columns = detectColumnIndices(headers);

  if (!columns) {
    // Try alternative: assume standard format
    // Column order: Code, Name, Debit, Credit, DebitBalance, CreditBalance
    detectedFormat = 'assumed_standard';
    warnings.push('Kolon başlıkları otomatik algılanamadı, standart format varsayıldı');
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const code = String(row[0] || '').trim();
      if (!isValidAccountCode(code)) continue;

      const baseCode = code.split('.')[0];
      
      accounts[baseCode] = {
        name: String(row[1] || ''),
        debit: parseNumber(row[2]),
        credit: parseNumber(row[3]),
        debitBalance: parseNumber(row[4] || row[2]),
        creditBalance: parseNumber(row[5] || row[3]),
      };
    }
  } else {
    detectedFormat = 'detected_columns';
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const code = String(row[columns.code] || '').trim();
      if (!isValidAccountCode(code)) continue;

      const baseCode = code.split('.')[0];
      const debit = parseNumber(row[columns.debit]);
      const credit = parseNumber(row[columns.credit]);
      
      // Calculate balance if not provided
      let debitBalance = columns.debitBal !== -1 ? parseNumber(row[columns.debitBal]) : 0;
      let creditBalance = columns.creditBal !== -1 ? parseNumber(row[columns.creditBal]) : 0;
      
      // If balance columns not found, calculate from debit/credit
      if (columns.debitBal === -1 && columns.creditBal === -1) {
        if (debit > credit) {
          debitBalance = debit - credit;
          creditBalance = 0;
        } else {
          debitBalance = 0;
          creditBalance = credit - debit;
        }
      }

      // Merge with existing if same base code
      if (accounts[baseCode]) {
        accounts[baseCode].debit += debit;
        accounts[baseCode].credit += credit;
        accounts[baseCode].debitBalance += debitBalance;
        accounts[baseCode].creditBalance += creditBalance;
      } else {
        accounts[baseCode] = {
          name: String(row[columns.name] || ''),
          debit,
          credit,
          debitBalance,
          creditBalance,
        };
      }
    }
  }

  return {
    accounts,
    detectedFormat,
    totalRows: Object.keys(accounts).length,
    warnings,
  };
}

async function parsePDF(buffer: ArrayBuffer): Promise<ParseResult> {
  const accounts: Record<string, TrialBalanceAccount> = {};
  const warnings: string[] = [];

  try {
    // Use pdf-parse to extract text from PDF
    const pdfData = await pdfParse(Buffer.from(new Uint8Array(buffer)));
    const fullText = pdfData.text || '';

    // Parse text to extract account data
    // Pattern: 3-digit code, account name, numeric values
    // Example: "100 Kasa 5.000,00 3.000,00 2.000,00 0,00"
    const lines = fullText.split('\n');
    
    // Turkish number regex: matches formats like 1.234,56 or 1234,56 or 0,00
    const numberPattern = /[\d.,]+/g;
    
    for (const line of lines) {
      // Look for lines starting with 3-digit account code
      const match = line.match(/^\s*(\d{3})\s+(.+)/);
      if (!match) continue;

      const code = match[1];
      const rest = match[2];

      // Extract all numbers from the rest of the line
      const numbers: number[] = [];
      const numberMatches = rest.match(numberPattern) || [];
      
      for (const numStr of numberMatches) {
        // Check if it looks like a Turkish formatted number
        if (numStr.includes(',') || numStr.includes('.')) {
          const parsed = parseNumber(numStr);
          if (!isNaN(parsed)) {
            numbers.push(parsed);
          }
        }
      }

      // We need at least 2 numbers (debit, credit)
      if (numbers.length < 2) continue;

      // Extract account name (text before the first number)
      const nameMatch = rest.match(/^([^\d]+)/);
      const name = nameMatch ? nameMatch[1].trim() : '';

      // Determine debit, credit, and balances based on number count
      let debit = 0, credit = 0, debitBalance = 0, creditBalance = 0;
      
      if (numbers.length >= 4) {
        // Full format: Debit, Credit, DebitBalance, CreditBalance
        debit = numbers[0];
        credit = numbers[1];
        debitBalance = numbers[2];
        creditBalance = numbers[3];
      } else if (numbers.length >= 2) {
        // Minimal format: Debit, Credit
        debit = numbers[0];
        credit = numbers[1];
        // Calculate balances
        if (debit > credit) {
          debitBalance = debit - credit;
        } else {
          creditBalance = credit - debit;
        }
      }

      // Merge with existing if same code
      if (accounts[code]) {
        accounts[code].debit += debit;
        accounts[code].credit += credit;
        accounts[code].debitBalance += debitBalance;
        accounts[code].creditBalance += creditBalance;
      } else {
        accounts[code] = {
          name,
          debit,
          credit,
          debitBalance,
          creditBalance,
        };
      }
    }

    if (Object.keys(accounts).length === 0) {
      warnings.push('PDF dosyasından hesap verisi çıkarılamadı. Lütfen Excel formatını deneyin.');
    }

  } catch (error) {
    console.error('PDF parsing error:', error);
    warnings.push('PDF okuma hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
  }

  return {
    accounts,
    detectedFormat: 'pdf_text_extraction',
    totalRows: Object.keys(accounts).length,
    warnings,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isPDF && !isExcel) {
      throw new Error('Desteklenen formatlar: Excel (.xlsx, .xls) veya PDF');
    }

    const buffer = await file.arrayBuffer();
    const result = isPDF ? await parsePDF(buffer) : await parseExcel(buffer);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        accounts: {},
        totalRows: 0,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
