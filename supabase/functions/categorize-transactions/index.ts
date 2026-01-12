import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 25;
const PARALLEL_BATCH_COUNT = 3; // 3 batch aynı anda işlenecek
const TIMEOUT_MS = 30000; // 30 second timeout per batch

interface CategoryResult {
  index: number;
  categoryCode: string;
  confidence: number;
}

// Process a single batch of transactions
async function processSingleBatch(
  batch: any[],
  startIdx: number,
  batchIndex: number,
  totalBatches: number,
  systemPrompt: string,
  apiKey: string
): Promise<{ batchIndex: number; results: CategoryResult[]; success: boolean }> {
  const txList = batch.map((t: any, idx: number) =>
    `${startIdx + idx}|${t.amount > 0 ? '+' : ''}${t.amount}|${t.description}|${t.counterparty || '-'}`
  ).join('\n');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `İŞLEMLER (${startIdx}-${startIdx + batch.length - 1}):\n${txList}\n\nHer işlem için kategori öner.` }
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

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error(`Batch ${batchIndex + 1}: Rate limit hit`);
        return { batchIndex, results: [], success: false };
      }
      if (response.status === 402) {
        console.error(`Batch ${batchIndex + 1}: Credit limit reached`);
        return { batchIndex, results: [], success: false };
      }
      const errorText = await response.text();
      console.error(`Batch ${batchIndex + 1} error:`, response.status, errorText);
      return { batchIndex, results: [], success: false };
    }

    const data = await response.json();
    
    // Extract tool call results
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (parsed.results && Array.isArray(parsed.results)) {
          console.log(`Batch ${batchIndex + 1}/${totalBatches}: Categorized ${parsed.results.length} transactions`);
          return { batchIndex, results: parsed.results, success: true };
        }
      } catch (parseError) {
        console.error(`Batch ${batchIndex + 1} parse error:`, parseError);
      }
    }

    return { batchIndex, results: [], success: false };

  } catch (batchError) {
    if (batchError instanceof Error && batchError.name === 'AbortError') {
      console.error(`Batch ${batchIndex + 1}: Timeout after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`Batch ${batchIndex + 1} failed:`, batchError);
    }
    return { batchIndex, results: [], success: false };
  }
}

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

    // Create all batches
    const batches: { batch: any[]; startIdx: number; batchIndex: number }[] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      batches.push({
        batch: transactions.slice(i, Math.min(i + BATCH_SIZE, transactions.length)),
        startIdx: i,
        batchIndex: batches.length
      });
    }

    const totalBatches = batches.length;
    console.log(`Starting parallel categorization: ${transactions.length} transactions in ${totalBatches} batches (${PARALLEL_BATCH_COUNT}x parallel)`);

    let allResults: CategoryResult[] = [];

    // Process batches in parallel groups
    for (let i = 0; i < batches.length; i += PARALLEL_BATCH_COUNT) {
      const parallelBatches = batches.slice(i, i + PARALLEL_BATCH_COUNT);
      
      console.log(`Processing parallel group: batches ${parallelBatches.map(b => b.batchIndex + 1).join(', ')} / ${totalBatches}`);

      // Process batches in parallel
      const parallelPromises = parallelBatches.map(({ batch, startIdx, batchIndex }) =>
        processSingleBatch(batch, startIdx, batchIndex, totalBatches, systemPrompt, LOVABLE_API_KEY)
      );

      const results = await Promise.all(parallelPromises);

      // Collect results
      for (const result of results) {
        if (result.success && result.results.length > 0) {
          allResults = [...allResults, ...result.results];
        }
      }

      // Rate limit protection: small delay between parallel groups
      if (i + PARALLEL_BATCH_COUNT < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`Categorization complete: ${allResults.length}/${transactions.length} transactions categorized (${PARALLEL_BATCH_COUNT}x parallel)`);

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