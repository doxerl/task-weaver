import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface TrialBalanceAccount {
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[];
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
Mizan dosyasındaki TÜM SATIRLARI AYRI AYRI çıkar ve parse_mizan fonksiyonunu çağır.

⚠️ KRİTİK: HER SATIRI AYRI BİR HESAP OLARAK DÖNDÜR! TOPLAMA/ÖZETLEME!

## MİZAN YAPISI
- Ana Hesap Kodu: 3 haneli (100, 102, 320, 600, 632, vb.)
- Alt Hesap Kodu: 3+ haneli, boşluk veya nokta ile ayrılmış
  Örnekler: 320 001, 320 1 006, 320.001, 120.01.001
- Hesap Adı: Türkçe (Kasa, Bankalar, firma/kişi isimleri vb.)
- Borç: Dönem içi borç toplamı
- Alacak: Dönem içi alacak toplamı
- Borç Bakiye: Borç - Alacak (pozitifse)
- Alacak Bakiye: Alacak - Borç (pozitifse)

## ALT HESAPLAR (MUAVİN) - EN ÖNEMLİ KISIM!
PDF'de şöyle satırlar göreceksin:
\`\`\`
320        SATICILAR              120.136,66    4.199.153,84
320 001    METRO GROSMARKET        81.251,05       86.271,21
320 1 006  RADSAN GRUP                    0      650.400,00
320 1 007  DOĞRU GRUP                     0      209.400,00
\`\`\`

BU ÖRNEKTEKİ 4 SATIRIN HEPSİNİ AYRI AYRI DÖNDÜR:
1. code: "320", name: "SATICILAR", parentCode: null
2. code: "320 001", name: "METRO GROSMARKET", parentCode: "320"
3. code: "320 1 006", name: "RADSAN GRUP", parentCode: "320"
4. code: "320 1 007", name: "DOĞRU GRUP", parentCode: "320"

## SAYISAL FORMAT
Türk formatı: 1.234.567,89 (nokta binlik, virgül ondalık)
Tüm sayıları standart ondalık formata çevir (1234567.89)
Boş/eksik değerler = 0

## ZORUNLU KURALLAR
1. PDF'deki HER SATIRI ayrı bir hesap olarak döndür
2. Alt hesap kodlarını OLDUĞU GİBİ döndür (boşlukları koru)
3. Alt hesaplar için parentCode alanını DOLDURABİLİRSİN (ilk 3 hane)
4. ASLA özetleme veya gruplama yapma
5. Firma/kişi isimlerini tam olarak yaz`;

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
            code: { type: 'string', description: 'Hesap kodu (örn: 100, 320.01, 120.001.001)' },
            name: { type: 'string', description: 'Hesap adı veya firma/kişi adı' },
            debit: { type: 'number', description: 'Borç tutarı (standart ondalık format)' },
            credit: { type: 'number', description: 'Alacak tutarı (standart ondalık format)' },
            debitBalance: { type: 'number', description: 'Borç bakiyesi' },
            creditBalance: { type: 'number', description: 'Alacak bakiyesi' },
            parentCode: { type: 'string', description: 'Ana hesap kodu (alt hesaplar için, örn: 320.01 için "320")' }
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
  // Accept 3-digit codes and sub-account codes with dots or spaces
  // Examples: 100, 320.001, 320 001, 320.1.006, 320 1 006
  // Updated regex to handle multiple spaces between segments: \s+ instead of \s
  return /^\d{3}([\.\s]+\d+)*$/.test(trimmed);
}

function normalizeAccountCode(code: string): string {
  // Normalize account code: convert spaces to dots for consistent storage
  // "320 1 006" → "320.1.006"
  // "320 001" → "320.001"
  return code.trim().replace(/\s+/g, '.');
}

function getBaseAccountCode(code: string): string {
  // Get first 3 digits as base account code
  // Works for both "320.001" and "320 001" formats
  return code.trim().split(/[\.\s]+/)[0].substring(0, 3);
}

function isSubAccount(code: string): boolean {
  // Sub-accounts have separators (dots or spaces) after the main code
  // "320 001" or "320.001" are sub-accounts, "320" is not
  return /[\.\s]/.test(code.trim());
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const accounts: Record<string, TrialBalanceAccount> = {};
  const subAccountsTemp: Record<string, SubAccount[]> = {};
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

      const baseCode = getBaseAccountCode(code);
      const name = String(row[1] || '');
      const debit = parseNumber(row[2]);
      const credit = parseNumber(row[3]);
      let debitBalance = parseNumber(row[4] || 0);
      let creditBalance = parseNumber(row[5] || 0);
      
      if (debitBalance === 0 && creditBalance === 0) {
        if (debit > credit) {
          debitBalance = debit - credit;
        } else {
          creditBalance = credit - debit;
        }
      }
      
      if (isSubAccount(code)) {
        // This is a sub-account - normalize code for consistent storage
        const normalizedCode = normalizeAccountCode(code);
        if (!subAccountsTemp[baseCode]) {
          subAccountsTemp[baseCode] = [];
        }
        subAccountsTemp[baseCode].push({
          code: normalizedCode,
          name,
          debit,
          credit,
          debitBalance,
          creditBalance,
        });
        // Alt hesap değerleri ana hesaba EKLENMEZ - AI zaten toplam değerleri döndürüyor
      } else {
        // This is a main account - use its own values (don't aggregate)
        accounts[baseCode] = {
          name,
          debit,
          credit,
          debitBalance,
          creditBalance,
        };
      }
    }
  } else {
    detectedFormat = 'detected_columns';
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const code = String(row[columns.code] || '').trim();
      if (!isValidAccountCode(code)) continue;

      const baseCode = getBaseAccountCode(code);
      const name = String(row[columns.name] || '');
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

      if (isSubAccount(code)) {
        // This is a sub-account - normalize code for consistent storage
        const normalizedCode = normalizeAccountCode(code);
        if (!subAccountsTemp[baseCode]) {
          subAccountsTemp[baseCode] = [];
        }
        subAccountsTemp[baseCode].push({
          code: normalizedCode,
          name,
          debit,
          credit,
          debitBalance,
          creditBalance,
        });
        // Alt hesap değerleri ana hesaba EKLENMEZ - AI zaten toplam değerleri döndürüyor
      } else {
        // This is a main account - use its own values
        accounts[baseCode] = {
          name,
          debit,
          credit,
          debitBalance,
          creditBalance,
        };
      }
    }
  }

  // Attach sub-accounts to main accounts
  for (const baseCode of Object.keys(subAccountsTemp)) {
    if (accounts[baseCode]) {
      accounts[baseCode].subAccounts = subAccountsTemp[baseCode];
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
        // tool_choice removed - Gemini will auto-select based on prompt
        temperature: 0.1,
        max_tokens: 16000,
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

    // Extract accounts from AI response - support multiple tool calls and various formats
    let parsedArgs: { accounts: any[]; metadata?: { period?: string; company?: string } } | null = null;
    
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const allAccounts: any[] = [];
    
    // Process ALL tool calls (AI might call once per account)
    for (const tc of toolCalls) {
      if (tc.function?.arguments) {
        try {
          const args = JSON.parse(tc.function.arguments);
          
          // Handle different response formats
          if (Array.isArray(args)) {
            // Direct array of accounts
            allAccounts.push(...args);
          } else if (args.accounts && Array.isArray(args.accounts)) {
            // Standard format with accounts array
            allAccounts.push(...args.accounts);
            // Capture metadata from first valid response
            if (!parsedArgs?.metadata && args.metadata) {
              parsedArgs = { accounts: [], metadata: args.metadata };
            }
          } else if (args.code) {
            // Single account object
            allAccounts.push(args);
          }
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e);
        }
      }
    }
    
    if (allAccounts.length > 0) {
      parsedArgs = { 
        accounts: allAccounts, 
        metadata: parsedArgs?.metadata 
      };
    }
    
    // Fallback: try to extract JSON from text content if tool call failed
    if (!parsedArgs || parsedArgs.accounts.length === 0) {
      const textContent = data.choices?.[0]?.message?.content;
      if (textContent) {
        console.log('Tool calls empty or failed, trying to parse text content as JSON');
        try {
          // Try to find JSON array or object with accounts in the response
          const jsonMatch = textContent.match(/\{[\s\S]*"accounts"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.accounts) {
              parsedArgs = parsed;
            }
          } else {
            // Try to find a direct array
            const arrayMatch = textContent.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
              const parsed = JSON.parse(arrayMatch[0]);
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
                parsedArgs = { accounts: parsed };
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse text content as JSON:', e);
        }
      }
    }
    
    if (!parsedArgs || !parsedArgs.accounts || parsedArgs.accounts.length === 0) {
      console.error('Could not extract accounts from AI response:', JSON.stringify(data));
      return {
        accounts: {},
        detectedFormat: 'ai_parse_failed',
        totalRows: 0,
        warnings: ['AI yanıtı beklenmedik formatta. Lütfen Excel formatını kullanın.'],
      };
    }
    
    console.log(`Successfully extracted ${parsedArgs.accounts.length} accounts from AI response`);
    const aiAccounts = parsedArgs.accounts;

    // Convert AI response to our format with sub-account support
    const accounts: Record<string, TrialBalanceAccount> = {};
    const subAccountsTemp: Record<string, SubAccount[]> = {};
    
    for (const acc of aiAccounts) {
      const code = String(acc.code || '').trim();
      if (!isValidAccountCode(code)) continue;
      
      const baseCode = getBaseAccountCode(code);
      const debit = acc.debit || 0;
      const credit = acc.credit || 0;
      const debitBalance = acc.debitBalance || 0;
      const creditBalance = acc.creditBalance || 0;

      if (isSubAccount(code)) {
        // This is a sub-account - normalize code for consistent storage
        const normalizedCode = normalizeAccountCode(code);
        if (!subAccountsTemp[baseCode]) {
          subAccountsTemp[baseCode] = [];
        }
        subAccountsTemp[baseCode].push({
          code: normalizedCode,
          name: acc.name || '',
          debit,
          credit,
          debitBalance,
          creditBalance,
        });
        // Alt hesap değerleri ana hesaba EKLENMEZ - AI zaten toplam değerleri döndürüyor
      } else {
        // This is a main account (3-digit code)
        if (accounts[baseCode]) {
          accounts[baseCode].name = acc.name || accounts[baseCode].name;
          accounts[baseCode].debit += debit;
          accounts[baseCode].credit += credit;
          accounts[baseCode].debitBalance += debitBalance;
          accounts[baseCode].creditBalance += creditBalance;
        } else {
          accounts[baseCode] = {
            name: acc.name || '',
            debit,
            credit,
            debitBalance,
            creditBalance,
          };
        }
      }
    }

    // Attach sub-accounts to main accounts
    for (const baseCode of Object.keys(subAccountsTemp)) {
      if (accounts[baseCode]) {
        accounts[baseCode].subAccounts = subAccountsTemp[baseCode];
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
