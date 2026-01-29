import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface IncomeStatementAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[];
}

interface ParseResult {
  accounts: IncomeStatementAccount[];
  mappedData: Record<string, number>;
  detectedFormat: string;
  totalRows: number;
  warnings: string[];
}

// Account code mapping for income statement
const INCOME_STATEMENT_ACCOUNT_MAP: Record<string, string> = {
  '600': 'gross_sales_domestic',
  '601': 'gross_sales_export',
  '602': 'gross_sales_other',
  '610': 'sales_returns',
  '611': 'sales_discounts',
  '620': 'cost_of_goods_sold',
  '621': 'cost_of_merchandise_sold',
  '622': 'cost_of_services_sold',
  '630': 'rd_expenses',
  '631': 'marketing_expenses',
  '632': 'general_admin_expenses',
  '640': 'dividend_income',
  '642': 'interest_income',
  '643': 'commission_income',
  '646': 'fx_gain',
  '647': 'revaluation_gain',
  '649': 'other_income',
  '653': 'commission_expenses',
  '654': 'provisions_expense',
  '656': 'fx_loss',
  '657': 'revaluation_loss',
  '659': 'other_expenses',
  '660': 'short_term_finance_exp',
  '661': 'long_term_finance_exp',
  '671': 'prior_period_income',
  '679': 'other_extraordinary_income',
  '681': 'prior_period_expenses',
  '689': 'other_extraordinary_exp',
  '691': 'corporate_tax',
  '692': 'deferred_tax_expense',
};

// AI Prompt for parsing Turkish income statement (Gelir Tablosu)
const INCOME_STATEMENT_PARSE_PROMPT = `Sen bir Türk muhasebe uzmanısın. 
PDF formatındaki gelir tablosu veya mizan dosyalarından 6xx hesaplarını parse ediyorsun.

## GÖREV
Dosyadaki 6xx serisi hesapları (gelir/gider hesapları) çıkar ve parse_income_statement fonksiyonunu çağır.
ALT HESAPLARI DA AYRI AYRI ÇIKAR!

## HESAP KODLARI VE ANLAMI
- 600: Yurtiçi Satışlar (Alacak = Gelir)
- 601: Yurtdışı Satışlar (Alacak = Gelir)
- 602: Diğer Gelirler (Alacak = Gelir)
- 610: Satıştan İadeler (Borç = Gider)
- 611: Satış İskontoları (Borç = Gider)
- 620: Satılan Mamul Maliyeti (Borç = Gider)
- 621: Satılan Ticari Mal Maliyeti (Borç = Gider)
- 622: Satılan Hizmet Maliyeti (Borç = Gider)
- 630: Ar-Ge Giderleri (Borç = Gider)
- 631: Pazarlama Satış Dağıtım (Borç = Gider)
- 632: Genel Yönetim Giderleri (Borç = Gider)
- 640: İştiraklerden Temettü (Alacak = Gelir)
- 642: Faiz Gelirleri (Alacak = Gelir)
- 643: Komisyon Gelirleri (Alacak = Gelir)
- 646: Kambiyo Karları (Alacak = Gelir)
- 647: Reeskont Faiz Gelirleri (Alacak = Gelir)
- 649: Diğer Olağan Gelirler (Alacak = Gelir)
- 653: Komisyon Giderleri (Borç = Gider)
- 654: Karşılık Giderleri (Borç = Gider)
- 656: Kambiyo Zararları (Borç = Gider)
- 657: Reeskont Faiz Giderleri (Borç = Gider)
- 659: Diğer Olağan Giderler (Borç = Gider)
- 660: Kısa Vadeli Borçlanma Gideri (Borç = Gider)
- 661: Uzun Vadeli Borçlanma Gideri (Borç = Gider)
- 671: Önceki Dönem Gelir/Karları (Alacak = Gelir)
- 679: Diğer Olağandışı Gelirler (Alacak = Gelir)
- 681: Önceki Dönem Gider/Zararları (Borç = Gider)
- 689: Diğer Olağandışı Giderler (Borç = Gider)
- 691: Dönem Karı Vergi Karşılığı (Borç = Gider)
- 692: Ertelenmiş Vergi Gideri (Borç = Gider)

## ALT HESAPLAR (Muavin) - ÇOK ÖNEMLİ!
- 3+ haneli kodlar alt hesaplardır (600.01, 632.001, 621.01.001)
- Alt hesap isimleri genellikle firma/kişi isimleridir
- HER ALT HESABI AYRI AYRI PARSE ET, ANA HESABA TOPLAMA!
- parentCode alanına ana hesap kodunu yaz (örn: 632.01 için parentCode: "632")

## SAYISAL FORMAT
Türk formatı: 1.234.567,89 (nokta binlik, virgül ondalık)
Tüm sayıları standart ondalık formata çevir (1234567.89)
Boş/eksik değerler = 0

## BALANCE (BAKİYE) HESAPLAMA
- Borç > Alacak ise: debitBalance = Borç - Alacak, creditBalance = 0
- Alacak > Borç ise: debitBalance = 0, creditBalance = Alacak - Borç

## ÖNEMLİ
- Hem 3 haneli ana hesapları hem de alt hesapları parse et
- Alt hesaplar için parentCode belirt
- Toplam satırlarını ATLAMA`;

// Function schema for structured output
const PARSE_FUNCTION_SCHEMA = {
  name: 'parse_income_statement',
  description: 'Gelir tablosu hesaplarını yapılandırılmış formatta döndür',
  parameters: {
    type: 'object',
    properties: {
      accounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Hesap kodu (örn: 600, 632.01, 621.001)' },
            name: { type: 'string', description: 'Hesap adı veya firma/kişi adı' },
            debit: { type: 'number', description: 'Borç tutarı (standart ondalık format)' },
            credit: { type: 'number', description: 'Alacak tutarı (standart ondalık format)' },
            debitBalance: { type: 'number', description: 'Borç bakiyesi (Borç > Alacak ise: Borç - Alacak, değilse 0)' },
            creditBalance: { type: 'number', description: 'Alacak bakiyesi (Alacak > Borç ise: Alacak - Borç, değilse 0)' },
            parentCode: { type: 'string', description: 'Ana hesap kodu (alt hesaplar için, örn: 632.01 için "632")' }
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

function isIncomeStatementAccount(code: string): boolean {
  const trimmed = code.trim();
  // Check if it's a 6xx account (income statement accounts), including sub-accounts
  return /^6\d{2}(\.\d+)*$/.test(trimmed);
}

function getBaseAccountCode(code: string): string {
  return code.split('.')[0].substring(0, 3);
}

function isSubAccount(code: string): boolean {
  return code.includes('.');
}

function mapAccountsToFields(accounts: IncomeStatementAccount[]): Record<string, number> {
  const mappedData: Record<string, number> = {};
  
  for (const account of accounts) {
    const baseCode = getBaseAccountCode(account.code);
    const fieldName = INCOME_STATEMENT_ACCOUNT_MAP[baseCode];
    
    if (fieldName) {
      // Use the balance for the mapped value
      // For income accounts (600, 601, 602, 64x, 67x), use credit - debit
      // For expense accounts, use debit - credit
      const isIncomeAccount = ['600', '601', '602'].includes(baseCode) || 
                              baseCode.startsWith('64') || 
                              baseCode.startsWith('67');
      
      const value = isIncomeAccount ? account.credit : account.debit;
      
      if (mappedData[fieldName]) {
        mappedData[fieldName] += value;
      } else {
        mappedData[fieldName] = value;
      }
    }
  }
  
  return mappedData;
}

function detectColumnIndices(headers: any[]): { code: number; name: number; debit: number; credit: number } | null {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const codePatterns = ['hesap kodu', 'hesap no', 'kod', 'hesap', 'account code'];
  const namePatterns = ['hesap adı', 'hesap adi', 'açıklama', 'aciklama', 'account name'];
  const debitPatterns = ['borç', 'borc', 'debit'];
  const creditPatterns = ['alacak', 'credit'];

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

  if (codeIdx === -1 || debitIdx === -1) {
    return null;
  }

  return {
    code: codeIdx,
    name: nameIdx !== -1 ? nameIdx : codeIdx + 1,
    debit: debitIdx,
    credit: creditIdx !== -1 ? creditIdx : debitIdx + 1,
  };
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const accounts: IncomeStatementAccount[] = [];
  const warnings: string[] = [];
  let detectedFormat = 'unknown';

  if (data.length < 2) {
    return { accounts, mappedData: {}, detectedFormat, totalRows: 0, warnings: ['Dosya boş veya geçersiz'] };
  }

  // Find header row
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i] && data[i].length > 3) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = data[headerRowIdx];
  const columns = detectColumnIndices(headers);

  // Storage for main accounts and sub-accounts
  const accountAggregator: Record<string, IncomeStatementAccount> = {};
  const subAccountsTemp: Record<string, SubAccount[]> = {};

  const processRow = (code: string, name: string, debit: number, credit: number) => {
    if (!isIncomeStatementAccount(code)) return;

    const baseCode = getBaseAccountCode(code);
    let debitBalance = 0;
    let creditBalance = 0;
    
    if (debit > credit) {
      debitBalance = debit - credit;
    } else {
      creditBalance = credit - debit;
    }

    if (isSubAccount(code)) {
      // This is a sub-account
      if (!subAccountsTemp[baseCode]) {
        subAccountsTemp[baseCode] = [];
      }
      subAccountsTemp[baseCode].push({
        code,
        name,
        debit,
        credit,
        debitBalance,
        creditBalance,
      });

      // Also aggregate to main account
      if (accountAggregator[baseCode]) {
        accountAggregator[baseCode].debit += debit;
        accountAggregator[baseCode].credit += credit;
      } else {
        accountAggregator[baseCode] = {
          code: baseCode,
          name: '',
          debit,
          credit,
          debitBalance: 0,
          creditBalance: 0,
        };
      }
    } else {
      // This is a main account
      if (accountAggregator[baseCode]) {
        accountAggregator[baseCode].name = name;
        accountAggregator[baseCode].debit += debit;
        accountAggregator[baseCode].credit += credit;
      } else {
        accountAggregator[baseCode] = {
          code: baseCode,
          name,
          debit,
          credit,
          debitBalance: 0,
          creditBalance: 0,
        };
      }
    }
  };

  if (!columns) {
    detectedFormat = 'assumed_standard';
    warnings.push('Kolon başlıkları otomatik algılanamadı, standart format varsayıldı');
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const code = String(row[0] || '').trim();
      const name = String(row[1] || '');
      const debit = parseNumber(row[2]);
      const credit = parseNumber(row[3]);
      
      processRow(code, name, debit, credit);
    }
  } else {
    detectedFormat = 'detected_columns';
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) continue;

      const code = String(row[columns.code] || '').trim();
      const name = String(row[columns.name] || '');
      const debit = parseNumber(row[columns.debit]);
      const credit = parseNumber(row[columns.credit]);

      processRow(code, name, debit, credit);
    }
  }

  // Calculate balances and convert to array
  for (const baseCode of Object.keys(accountAggregator)) {
    const acc = accountAggregator[baseCode];
    if (acc.debit > acc.credit) {
      acc.debitBalance = acc.debit - acc.credit;
      acc.creditBalance = 0;
    } else {
      acc.debitBalance = 0;
      acc.creditBalance = acc.credit - acc.debit;
    }
    
    // Attach sub-accounts if any
    if (subAccountsTemp[baseCode]) {
      acc.subAccounts = subAccountsTemp[baseCode];
    }
    
    accounts.push(acc);
  }

  const mappedData = mapAccountsToFields(accounts);

  return {
    accounts,
    mappedData,
    detectedFormat,
    totalRows: accounts.length,
    warnings,
  };
}

async function parsePDFWithAI(buffer: ArrayBuffer): Promise<ParseResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const warnings: string[] = [];

  if (!LOVABLE_API_KEY) {
    return {
      accounts: [],
      mappedData: {},
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

    console.log('Sending PDF to AI for income statement parsing, size:', uint8Array.length);

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
          { role: 'system', content: INCOME_STATEMENT_PARSE_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Bu dosyadaki 6xx hesaplarını (gelir tablosu hesapları) parse et ve parse_income_statement fonksiyonunu çağır.' },
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
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return {
          accounts: [],
          mappedData: {},
          detectedFormat: 'error',
          totalRows: 0,
          warnings: ['AI servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin veya Excel formatını kullanın.'],
        };
      }
      
      if (response.status === 402) {
        return {
          accounts: [],
          mappedData: {},
          detectedFormat: 'error',
          totalRows: 0,
          warnings: ['AI kredisi yetersiz. Lütfen Excel formatını kullanın.'],
        };
      }
      
      return {
        accounts: [],
        mappedData: {},
        detectedFormat: 'error',
        totalRows: 0,
        warnings: [`AI servisi hatası: ${response.status}. Lütfen Excel formatını kullanın.`],
      };
    }

    const data = await response.json();
    console.log('AI response received for income statement');

    // Extract accounts from AI response - check for tool calls first
    let parsedArgs: { accounts: any[]; metadata?: { period?: string; company?: string } } | null = null;
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function?.name === 'parse_income_statement') {
      // Tool call worked - parse the arguments
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }
    
    // Fallback: try to extract JSON from text content if tool call failed
    if (!parsedArgs) {
      const textContent = data.choices?.[0]?.message?.content;
      if (textContent) {
        console.log('Tool call failed, trying to parse text content as JSON');
        try {
          // Try to find JSON in the response
          const jsonMatch = textContent.match(/\{[\s\S]*"accounts"[\s\S]*\}/);
          if (jsonMatch) {
            parsedArgs = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse text content as JSON:', e);
        }
      }
    }
    
    if (!parsedArgs || !parsedArgs.accounts) {
      console.error('Could not extract accounts from AI response:', JSON.stringify(data));
      return {
        accounts: [],
        mappedData: {},
        detectedFormat: 'ai_parse_failed',
        totalRows: 0,
        warnings: ['AI yanıtı beklenmedik formatta. Lütfen Excel formatını kullanın.'],
      };
    }
    const aiAccounts = parsedArgs.accounts || [];

    // Convert AI response to our format with sub-account support
    const accountAggregator: Record<string, IncomeStatementAccount> = {};
    const subAccountsTemp: Record<string, SubAccount[]> = {};
    
    for (const acc of aiAccounts) {
      const code = String(acc.code || '').trim();
      if (!isIncomeStatementAccount(code)) continue;
      
      const baseCode = getBaseAccountCode(code);
      const debit = acc.debit || 0;
      const credit = acc.credit || 0;
      let debitBalance = 0;
      let creditBalance = 0;
      
      if (debit > credit) {
        debitBalance = debit - credit;
      } else {
        creditBalance = credit - debit;
      }

      if (isSubAccount(code)) {
        // This is a sub-account
        if (!subAccountsTemp[baseCode]) {
          subAccountsTemp[baseCode] = [];
        }
        subAccountsTemp[baseCode].push({
          code,
          name: acc.name || '',
          debit,
          credit,
          debitBalance,
          creditBalance,
        });
        
        // Aggregate to main account
        if (accountAggregator[baseCode]) {
          accountAggregator[baseCode].debit += debit;
          accountAggregator[baseCode].credit += credit;
        } else {
          accountAggregator[baseCode] = {
            code: baseCode,
            name: '',
            debit,
            credit,
            debitBalance: 0,
            creditBalance: 0,
          };
        }
      } else {
        // Main account
        if (accountAggregator[baseCode]) {
          accountAggregator[baseCode].name = acc.name || accountAggregator[baseCode].name;
          accountAggregator[baseCode].debit += debit;
          accountAggregator[baseCode].credit += credit;
        } else {
          accountAggregator[baseCode] = {
            code: baseCode,
            name: acc.name || '',
            debit,
            credit,
            debitBalance: 0,
            creditBalance: 0,
          };
        }
      }
    }

    // Recalculate balances and attach sub-accounts
    const accounts: IncomeStatementAccount[] = [];
    for (const baseCode of Object.keys(accountAggregator)) {
      const acc = accountAggregator[baseCode];
      if (acc.debit > acc.credit) {
        acc.debitBalance = acc.debit - acc.credit;
        acc.creditBalance = 0;
      } else {
        acc.debitBalance = 0;
        acc.creditBalance = acc.credit - acc.debit;
      }
      
      // Attach sub-accounts if any
      if (subAccountsTemp[baseCode]) {
        acc.subAccounts = subAccountsTemp[baseCode];
      }
      
      accounts.push(acc);
    }

    if (accounts.length === 0) {
      warnings.push('Dosyadan gelir tablosu hesabı çıkarılamadı. Dosyanın 6xx hesapları içerdiğinden emin olun.');
    }

    // Add metadata info if available
    if (parsedArgs.metadata?.period) {
      warnings.push(`Dönem: ${parsedArgs.metadata.period}`);
    }
    if (parsedArgs.metadata?.company) {
      warnings.push(`Şirket: ${parsedArgs.metadata.company}`);
    }

    const mappedData = mapAccountsToFields(accounts);

    return {
      accounts,
      mappedData,
      detectedFormat: 'ai_parsed',
      totalRows: accounts.length,
      warnings,
    };

  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      accounts: [],
      mappedData: {},
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
        accounts: [],
        mappedData: {},
        totalRows: 0,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
