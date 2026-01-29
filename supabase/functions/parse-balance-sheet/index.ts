// Parse balance sheet PDF/Excel files using Lovable AI Gateway (Gemini)

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare content based on file type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isExcel = file.type.includes('spreadsheet') || 
                    file.type.includes('excel') ||
                    file.name.toLowerCase().endsWith('.xlsx') || 
                    file.name.toLowerCase().endsWith('.xls');

    // Determine MIME type for Gemini
    let mimeType = 'application/pdf';
    if (isExcel) {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        mimeType = 'application/vnd.ms-excel';
      }
    }

    const systemPrompt = `Sen bir Türk muhasebe uzmanısın. Bilanço belgelerini analiz edip hesap bilgilerini çıkarıyorsun.

Türkiye Tekdüzen Hesap Planı'na göre bilanço hesaplarını parse et:

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

ÖNEMLİ KURALLAR - NEGATİF BAKİYE İŞLEME:

1. PARANTEZ İÇİNDEKİ DEĞERLER NEGATİFTİR:
   - "(257.862,53)" şeklinde parantez içi değer = NEGATİF bakiye
   - Türk muhasebe sisteminde parantez = negatif anlamına gelir

2. AKTİF HESAPLARDA (1xx-2xx):
   - Normal durum: debitBalance'ta pozitif değer
   - 257 Birikmiş Amortisman: creditBalance'ta pozitif değer (aktiften düşer)

3. PASİF HESAPLARDA (3xx-4xx) NEGATİF BAKİYE:
   - Eğer parantez içinde veya negatif gösteriliyorsa = karşı taraf fazla
   - Örnek: 331 Ortaklara Borçlar: (257.862,53) → Bu aslında ortaklardan ALACAK demek
   - Bu durumda: debitBalance: 257862.53, creditBalance: 0 olarak kaydet

4. ÖZKAYNAKLAR (5xx) ÖZEL KURALLAR:
   - 500 Sermaye: creditBalance'ta pozitif
   - 501 Ödenmemiş Sermaye: debitBalance'ta pozitif (sermayeden düşer)
   - 540 Yasal Yedekler: creditBalance'ta pozitif
   - 570 Geçmiş Yıllar Karları: creditBalance'ta pozitif
   - 580 Geçmiş Yıllar Zararları: debitBalance'ta pozitif (parantez içinde yazılır)
   - 590 Dönem Net Karı: creditBalance'ta pozitif
   - 591 Dönem Net Zararı: debitBalance'ta pozitif (parantez içinde yazılır)

5. BİLANÇO DENGESİ:
   - Toplam Aktif = Toplam Pasif + Toplam Özkaynaklar
   - Negatif bakiyeli hesapları doğru işlersen bilanço dengede olmalı`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: file.name,
              file_data: `data:${mimeType};base64,${base64Content}`
            }
          },
          {
            type: 'text',
            text: 'Bu bilanço belgesindeki tüm hesapları parse_balance_sheet fonksiyonunu kullanarak çıkar.'
          }
        ]
      }
    ];

    console.log('Calling Lovable AI Gateway for balance sheet parsing...');

    // Call Lovable AI Gateway with Gemini
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
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
        ]
      }),
    });

    // Handle rate limits and errors
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'AI servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI kredisi yetersiz. Lütfen hesabınıza kredi ekleyin.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received, processing tool calls...');

    // Process tool calls - support multiple formats
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    const allAccounts: BalanceSheetAccount[] = [];

    for (const tc of toolCalls) {
      if (tc.function?.arguments) {
        try {
          const args = typeof tc.function.arguments === 'string' 
            ? JSON.parse(tc.function.arguments) 
            : tc.function.arguments;
          
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

    // Calculate totals for verification with correct negative value handling
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    for (const account of allAccounts) {
      const code = account.code.split('.')[0];
      
      if (code.startsWith('1') || code.startsWith('2')) {
        // AKTIF hesaplar: Net bakiye = debit - credit
        if (code === '257') {
          // Birikmiş amortisman - creditBalance'ta pozitif olarak gösterilir, aktiften düşer
          totalAssets -= Math.abs(account.creditBalance || account.debitBalance || 0);
        } else {
          // Normal aktif hesaplar
          totalAssets += (account.debitBalance || 0) - (account.creditBalance || 0);
        }
      } else if (code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
        // PASİF + ÖZKAYNAKLAR: Net bakiye = credit - debit
        // Negatif bakiyeli hesaplar (331 negatif, 501, 580, 591) otomatik olarak düşer
        const netBalance = (account.creditBalance || 0) - (account.debitBalance || 0);
        totalLiabilities += netBalance;
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
