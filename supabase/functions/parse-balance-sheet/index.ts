// Parse balance sheet PDF/Excel files using OpenAI

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceSheetAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: {
    code: string;
    name: string;
    debit: number;
    credit: number;
    debitBalance: number;
    creditBalance: number;
  }[];
}

interface ParsedBalanceSheet {
  accounts: BalanceSheetAccount[];
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Dosya yüklenemedi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing balance sheet file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Prepare content based on file type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isExcel = file.type.includes('spreadsheet') || 
                    file.type.includes('excel') ||
                    file.name.toLowerCase().endsWith('.xlsx') || 
                    file.name.toLowerCase().endsWith('.xls');

    let messages: any[] = [];
    
    if (isPDF) {
      // For PDF, use vision model
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Content}`,
                detail: 'high'
              }
            },
            {
              type: 'text',
              text: `Bu Türkiye Tekdüzen Hesap Planı'na göre hazırlanmış bir BİLANÇO (Balance Sheet) belgesidir.

Lütfen bu belgeden tüm bilanço hesaplarını çıkar:

1. AKTİF (VARLIKLAR) - 1xx ve 2xx kodları:
   - 1xx: Dönen Varlıklar (Kasa, Banka, Alacaklar, KDV, Stok vb.)
   - 2xx: Duran Varlıklar (Taşıtlar, Demirbaşlar, Amortisman vb.)

2. PASİF (KAYNAKLAR) - 3xx, 4xx ve 5xx kodları:
   - 3xx: Kısa Vadeli Borçlar (Banka Kredisi, Satıcılar, SGK, Vergi vb.)
   - 4xx: Uzun Vadeli Borçlar
   - 5xx: Özkaynaklar (Sermaye, Kârlar vb.)

Her hesap için:
- code: Hesap kodu (örn: "100", "320.001")
- name: Hesap adı
- debit: Borç sütunu değeri
- credit: Alacak sütunu değeri
- debitBalance: Borç bakiyesi
- creditBalance: Alacak bakiyesi

Alt hesapları olan ana hesaplar için (örn: 320 Satıcılar altında 320.001 Firma A), subAccounts dizisi kullan.

ÖNEMLİ: Aktif hesaplarda (1xx-2xx) değer genelde borç bakiyesinde, Pasif hesaplarda (3xx-5xx) alacak bakiyesinde olur.
257 Birikmiş Amortisman ve 501 Ödenmemiş Sermaye negatif/düşürücü hesaplardır.`
            }
          ]
        }
      ];
    } else if (isExcel) {
      // For Excel, we need to send as text
      messages = [
        {
          role: 'user',
          content: `Bu bir Excel formatında BİLANÇO belgesidir. Base64 içeriği: ${base64Content.substring(0, 5000)}...

Lütfen bu belgeden bilanço hesaplarını çıkar. Her hesap için code, name, debit, credit, debitBalance, creditBalance değerlerini ver.`
        }
      ];
    } else {
      return new Response(
        JSON.stringify({ error: 'Desteklenmeyen dosya formatı. PDF veya Excel dosyası yükleyin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling OpenAI API for balance sheet parsing...');

    // Call OpenAI API with function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 16000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'parse_balance_sheet',
              description: 'Bilanço hesaplarını çıkar ve yapılandırılmış formatta döndür',
              parameters: {
                type: 'object',
                properties: {
                  accounts: {
                    type: 'array',
                    description: 'Bilanço hesapları listesi',
                    items: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', description: 'Hesap kodu (örn: 100, 320.001)' },
                        name: { type: 'string', description: 'Hesap adı' },
                        debit: { type: 'number', description: 'Borç sütunu değeri' },
                        credit: { type: 'number', description: 'Alacak sütunu değeri' },
                        debitBalance: { type: 'number', description: 'Borç bakiyesi' },
                        creditBalance: { type: 'number', description: 'Alacak bakiyesi' },
                        subAccounts: {
                          type: 'array',
                          description: 'Alt hesaplar (varsa)',
                          items: {
                            type: 'object',
                            properties: {
                              code: { type: 'string' },
                              name: { type: 'string' },
                              debit: { type: 'number' },
                              credit: { type: 'number' },
                              debitBalance: { type: 'number' },
                              creditBalance: { type: 'number' }
                            },
                            required: ['code', 'name', 'debit', 'credit', 'debitBalance', 'creditBalance']
                          }
                        }
                      },
                      required: ['code', 'name', 'debit', 'credit', 'debitBalance', 'creditBalance']
                    }
                  }
                },
                required: ['accounts']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'parse_balance_sheet' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received, processing tool calls...');

    // Process tool calls - support multiple formats
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const allAccounts: BalanceSheetAccount[] = [];

    for (const tc of toolCalls) {
      if (tc.function?.arguments) {
        try {
          const args = JSON.parse(tc.function.arguments);
          
          // Handle different response formats
          if (Array.isArray(args)) {
            allAccounts.push(...args);
          } else if (args.accounts && Array.isArray(args.accounts)) {
            allAccounts.push(...args.accounts);
          } else if (args.code) {
            // Single account returned
            allAccounts.push(args);
          }
        } catch (parseError) {
          console.error('Error parsing tool call arguments:', parseError);
        }
      }
    }

    // Fallback: try to extract from text content if no tool calls
    if (allAccounts.length === 0) {
      const textContent = data.choices?.[0]?.message?.content;
      if (textContent) {
        console.log('No tool calls, trying to extract from text content...');
        // Try to find JSON in the text
        const jsonMatch = textContent.match(/\[[\s\S]*\]|\{[\s\S]*"accounts"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              allAccounts.push(...parsed);
            } else if (parsed.accounts) {
              allAccounts.push(...parsed.accounts);
            }
          } catch (e) {
            console.error('Failed to parse JSON from text:', e);
          }
        }
      }
    }

    console.log(`Parsed ${allAccounts.length} balance sheet accounts`);

    // Calculate totals for verification
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    for (const account of allAccounts) {
      const code = account.code.split('.')[0];
      const value = account.debitBalance - account.creditBalance;
      
      if (code.startsWith('1') || code.startsWith('2')) {
        // Assets - use debit balance (except 257 which is contra)
        if (code === '257') {
          totalAssets -= Math.abs(account.debitBalance || account.creditBalance);
        } else {
          totalAssets += account.debitBalance || 0;
        }
      } else if (code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
        // Liabilities + Equity - use credit balance (except 501 which is contra)
        if (code === '501') {
          totalLiabilities -= Math.abs(account.creditBalance || account.debitBalance);
        } else {
          totalLiabilities += account.creditBalance || 0;
        }
      }
    }

    const result: ParsedBalanceSheet = {
      accounts: allAccounts,
    };

    console.log('Balance sheet parsing complete. Total Assets:', totalAssets, 'Total Liabilities:', totalLiabilities);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        summary: {
          accountCount: allAccounts.length,
          totalAssets,
          totalLiabilities,
          isBalanced: Math.abs(totalAssets - totalLiabilities) < 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing balance sheet:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Bilanço parse edilirken hata oluştu',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
