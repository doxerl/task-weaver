import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50;

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

    let allResults: any[] = [];
    const totalBatches = Math.ceil(transactions.length / BATCH_SIZE);

    console.log(`Starting categorization: ${transactions.length} transactions in ${totalBatches} batches`);

    // Process transactions in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, transactions.length);
      const batch = transactions.slice(startIdx, endIdx);

      // Build transaction list for this batch
      const txList = batch.map((t: any, idx: number) =>
        `${startIdx + idx}|${t.amount > 0 ? '+' : ''}${t.amount}|${t.description}|${t.counterparty || '-'}`
      ).join('\n');

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `İŞLEMLER (${startIdx}-${endIdx - 1}):\n${txList}\n\nHer işlem için kategori öner.` }
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
            console.error(`Batch ${batchIndex + 1}: Rate limit hit, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Skip this batch but continue with others
          }
          if (response.status === 402) {
            console.error(`Batch ${batchIndex + 1}: Credit limit reached`);
            break; // Stop processing
          }
          const errorText = await response.text();
          console.error(`Batch ${batchIndex + 1} error:`, response.status, errorText);
          continue; // Skip failed batch but continue with others
        }

        const data = await response.json();
        
        // Extract tool call results
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (parsed.results && Array.isArray(parsed.results)) {
              allResults = [...allResults, ...parsed.results];
              console.log(`Batch ${batchIndex + 1}/${totalBatches}: Categorized ${parsed.results.length} transactions`);
            }
          } catch (parseError) {
            console.error(`Batch ${batchIndex + 1} parse error:`, parseError);
          }
        }

        // Rate limit protection: wait between batches
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (batchError) {
        console.error(`Batch ${batchIndex + 1} failed:`, batchError);
        // Continue with next batch
      }
    }

    console.log(`Categorization complete: ${allResults.length}/${transactions.length} transactions categorized`);

    return new Response(JSON.stringify({ results: allResults }), {
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