import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

// AI Prompt for parsing Turkish trial balance (Mizan)
const MIZAN_PARSE_PROMPT = `Sen bir Türk muhasebe uzmanısın. 
PDF formatındaki mizan (trial balance) dosyalarını parse ediyorsun.

## GÖREV
Mizan dosyasındaki tüm hesapları çıkar ve parse_mizan fonksiyonunu çağır.

## MİZAN YAPISI
- Hesap Kodu: 3 haneli (100, 102, 600, 632, vb.)
- Hesap Adı: Türkçe (Kasa, Bankalar, Yurtiçi Satışlar, vb.)
- Borç: Dönem içi borç toplamı
- Alacak: Dönem içi alacak toplamı  
- Borç Bakiye: Borç - Alacak (pozitifse)
- Alacak Bakiye: Alacak - Borç (pozitifse)

## SAYISAL FORMAT
Türk formatı: 1.234.567,89 (nokta binlik, virgül ondalık)
Tüm sayıları standart ondalık formata çevir (1234567.89)
Boş/eksik değerler = 0

## ÖNEMLİ HESAP KODLARI
- 1xx-2xx: Aktifler (varlıklar)
- 3xx-4xx: Pasifler (borçlar)
- 5xx: Özkaynaklar
- 6xx: Gelir/Gider hesapları

## ÖNEMLİ
- Sadece 3 haneli hesap kodlarını al (100, 102, 320, 600, vb.)
- Alt hesapları (100.01, 102.001 gibi) ana hesaba topla
- Toplam satırlarını ATLAMA`;

// Function schema for structured output
const PARSE_FUNCTION_SCHEMA = {
  name: 'parse_mizan',
  description: 'Mizan hesaplarını yapılandırılmış formatta döndür',
  parameters: {
    type: 'object',
    properties: {
      accounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '3 haneli hesap kodu (örn: 100, 600)' },
            name: { type: 'string', description: 'Hesap adı' },
            debit: { type: 'number', description: 'Borç tutarı (standart ondalık format)' },
            credit: { type: 'number', description: 'Alacak tutarı (standart ondalık format)' },
            debitBalance: { type: 'number', description: 'Borç bakiyesi' },
            creditBalance: { type: 'number', description: 'Alacak bakiyesi' }
          },
          required: ['code', 'name', 'debit', 'credit', 'debitBalance', 'creditBalance']
        }
      },
      metadata: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Dönem bilgisi (varsa)' },
          company: { type: 'string', description: 'Şirket adı (varsa)' }
        }
      }
    },
    required: ['accounts']
  }
};

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
  
  let debitBalIdx = findIndex(debitBalPatterns);
  let creditBalIdx = findIndex(creditBalPatterns);

  if (debitBalIdx === -1 && creditBalIdx === -1) {
    if (debitIdx !== -1 && creditIdx !== -1) {
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
      
      let debitBalance = columns.debitBal !== -1 ? parseNumber(row[columns.debitBal]) : 0;
      let creditBalance = columns.creditBal !== -1 ? parseNumber(row[columns.creditBal]) : 0;
      
      if (columns.debitBal === -1 && columns.creditBal === -1) {
        if (debit > credit) {
          debitBalance = debit - credit;
          creditBalance = 0;
        } else {
          debitBalance = 0;
          creditBalance = credit - debit;
        }
      }

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

async function parsePDFWithAI(buffer: ArrayBuffer): Promise<ParseResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const warnings: string[] = [];

  if (!LOVABLE_API_KEY) {
    return {
      accounts: {},
      detectedFormat: 'error',
      totalRows: 0,
      warnings: ['AI API anahtarı yapılandırılmamış. Lütfen Excel formatını kullanın.'],
    };
  }

  try {
    // Convert PDF to base64
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64PDF = btoa(binary);

    console.log('Sending PDF to AI for parsing, size:', uint8Array.length);

    // Call Lovable AI Gateway with vision model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: MIZAN_PARSE_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Bu PDF mizan dosyasını parse et ve parse_mizan fonksiyonunu çağır.' },
              { 
                type: 'image_url', 
                image_url: { url: `data:application/pdf;base64,${base64PDF}` }
              }
            ]
          }
        ],
        tools: [{ type: 'function', function: PARSE_FUNCTION_SCHEMA }],
        tool_choice: { type: 'function', function: { name: 'parse_mizan' } },
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return {
          accounts: {},
          detectedFormat: 'error',
          totalRows: 0,
          warnings: ['AI servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin veya Excel formatını kullanın.'],
        };
      }
      
      return {
        accounts: {},
        detectedFormat: 'error',
        totalRows: 0,
        warnings: [`AI servisi hatası: ${response.status}. Lütfen Excel formatını kullanın.`],
      };
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract accounts from AI response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function?.name !== 'parse_mizan') {
      console.error('Unexpected AI response format:', JSON.stringify(data));
      return {
        accounts: {},
        detectedFormat: 'ai_parse_failed',
        totalRows: 0,
        warnings: ['AI yanıtı beklenmedik formatta. Lütfen Excel formatını kullanın.'],
      };
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const aiAccounts = parsedArgs.accounts || [];

    // Convert AI response to our format
    const accounts: Record<string, TrialBalanceAccount> = {};
    
    for (const acc of aiAccounts) {
      const code = String(acc.code || '').trim();
      // Only accept 3-digit codes
      if (!/^\d{3}$/.test(code)) continue;

      if (accounts[code]) {
        // Merge if duplicate
        accounts[code].debit += acc.debit || 0;
        accounts[code].credit += acc.credit || 0;
        accounts[code].debitBalance += acc.debitBalance || 0;
        accounts[code].creditBalance += acc.creditBalance || 0;
      } else {
        accounts[code] = {
          name: acc.name || '',
          debit: acc.debit || 0,
          credit: acc.credit || 0,
          debitBalance: acc.debitBalance || 0,
          creditBalance: acc.creditBalance || 0,
        };
      }
    }

    if (Object.keys(accounts).length === 0) {
      warnings.push('PDF dosyasından hesap çıkarılamadı. Dosyanın mizan formatında olduğundan emin olun.');
    }

    // Add metadata info if available
    if (parsedArgs.metadata?.period) {
      warnings.push(`Dönem: ${parsedArgs.metadata.period}`);
    }
    if (parsedArgs.metadata?.company) {
      warnings.push(`Şirket: ${parsedArgs.metadata.company}`);
    }

    return {
      accounts,
      detectedFormat: 'ai_parsed',
      totalRows: Object.keys(accounts).length,
      warnings,
    };

  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      accounts: {},
      detectedFormat: 'error',
      totalRows: 0,
      warnings: [`PDF işleme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Lütfen Excel formatını kullanın.`],
    };
  }
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
    const result = isPDF ? await parsePDFWithAI(buffer) : await parseExcel(buffer);

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
