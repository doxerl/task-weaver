import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build category list for prompt
    const categoryList = categories.map((c: any) => 
      `${c.code}: ${c.name} [${c.type}] - Keywords: ${c.keywords?.join(', ') || '-'}, Vendors: ${c.vendor_patterns?.join(', ') || '-'}`
    ).join('\n');

    // Build transaction list
    const txList = transactions.map((t: any, i: number) =>
      `${i}|${t.amount > 0 ? '+' : ''}${t.amount}|${t.description}|${t.counterparty || '-'}`
    ).join('\n');

    const systemPrompt = `Sen Türk banka işlemleri kategorize uzmanısın.

KATEGORİLER:
${categoryList}

ÖZEL KURALLAR (öncelikli):
1. Pozitif tutar (+) → Gelir (INCOME) kategorileri
2. Negatif tutar (-) → Gider (EXPENSE) kategorileri
3. "EMRE AKÇAOĞLU" veya benzer kişi adı + negatif → ORTAK_OUT
4. "EMRE AKÇAOĞLU" veya benzer kişi adı + pozitif → ORTAK_IN
5. "KREDİ" + pozitif → KREDI_IN (Financing)
6. "KREDİ" + negatif → KREDI_OUT
7. "DÖVİZ SATIŞ" → DOVIZ_IN
8. "DÖVİZ ALIŞ" → DOVIZ_OUT
9. "VİRMAN", "HAVALE EFT GELEN" → genellikle EXCLUDED
10. "KESİNTİ VE EKLERİ", "MASRAF" → BANKA
11. "HGS", "OGS" → ULASIM

EŞLEŞME ÖNCELİĞİ:
1. vendor_patterns ile tam eşleşme
2. keywords ile kısmi eşleşme
3. Tutar işaretine göre tip belirleme

Her işlem için en uygun kategori kodunu ve güven skorunu (0.0-1.0) belirle.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `İŞLEMLER:\n${txList}\n\nHer işlem için kategori öner.` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_transactions',
              description: 'Her banka işlemi için kategori kodu ve güven skoru döndür',
              parameters: {
                type: 'object',
                properties: {
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        index: { type: 'number', description: 'İşlem index numarası' },
                        categoryCode: { type: 'string', description: 'Kategori kodu (örn: SBT, DANIS, ORTAK_OUT)' },
                        confidence: { type: 'number', description: 'Güven skoru 0.0-1.0 arası' }
                      },
                      required: ['index', 'categoryCode', 'confidence'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['results'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_transactions' } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit aşıldı, lütfen biraz bekleyin.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Kredi yetersiz, lütfen hesabınızı kontrol edin.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('AI kategorilendirme hatası');
    }

    const data = await response.json();
    
    // Extract tool call results
    let results: any[] = [];
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        results = parsed.results || [];
      } catch (parseError) {
        console.error('Tool call parse error:', parseError);
      }
    }

    console.log(`Categorized ${results.length} transactions`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('categorize-transactions error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
