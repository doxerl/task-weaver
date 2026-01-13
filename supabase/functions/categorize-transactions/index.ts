import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 30;
const PARALLEL_BATCH_COUNT = 3;
const TIMEOUT_MS = 30000;

interface CategoryResult {
  index: number;
  categoryCode: string;
  categoryType: string;
  confidence: number;
  reasoning: string;
  counterparty: string | null;
  affects_pnl: boolean;
  balance_impact: string;
}

// Static rules that don't change
const STATIC_RULES = `Sen Türk bankacılık işlemlerini kategorileyen bir uzmansın.

## KRİTİK KURALLAR

### 1. TUTAR MANTIĞI
- POZİTİF (+) tutar = GELEN PARA = GELİR (müşteriden tahsilat, döviz satışı, vs.)
- NEGATİF (-) tutar = GİDEN PARA = GİDER veya ÖDEME

### 2. ORTAK İŞLEMLERİ
- "borç" + kişi adı + NEGATİF = ORTAK_OUT (categoryType: PARTNER, affects_pnl: false)
- Ortağa yapılan ödemeler K/Z'yi ETKİLEMEZ

### 3. BANKA KESİNTİLERİ
- "KESİNTİ VE EKLERİ" + küçük tutar (genelde < 100₺) = BANKA
- Bunlar EFT/havale masraflarıdır

### 4. MÜŞTERİ TAHSİLATLARI (GELİRLER)
POZİTİF tutar + firma adı = GELİR

**ÖNCE İÇERİK KONTROL ET:**
- "LEADERSHIP" veya "L&S" veya "L%S" geçiyorsa → L&S

**SONRA TUTAR KONTROL ET:**
- Tutar > 125.000 TL → SBT
- Tutar < 75.000 TL → ZDHC
- Tutar 75.000 - 125.000 TL arası → DANIS

### 5. MÜŞTERİ İADESİ
- "İADE" geçiyorsa + NEGATİF tutar = IADE
- Örnek: "CEP ŞUBE-EFT İADE" -111.665₺ → IADE

### 6. affects_pnl KURALI
- true: Gelirler, normal giderler (K/Z'yi etkiler)
- false: Ortak işlemleri, kredi anaparası, iç transferler

### 7. counterparty TESPİTİ
- Açıklamadaki firma/kişi adını yaz
- Tespit edilemezse = null

ÖNEMLİ: Bu işlemler kural/keyword ile eşleşmedi. Dikkatli analiz et!`;

// Build dynamic category section from database
function buildCategorySection(categories: any[]): string {
  const grouped: Record<string, any[]> = {
    INCOME: [],
    EXPENSE: [],
    PARTNER: [],
    FINANCING: [],
    INVESTMENT: [],
    EXCLUDED: []
  };
  
  for (const cat of categories) {
    if (grouped[cat.type]) {
      grouped[cat.type].push(cat);
    }
  }
  
  const lines = ['\n## KATEGORİ KODLARI (VERİTABANINDAN)'];
  
  for (const [type, cats] of Object.entries(grouped)) {
    if (cats.length > 0) {
      const codes = cats.map(c => c.code).join(', ');
      const typeLabels: Record<string, string> = {
        INCOME: 'GELİR',
        EXPENSE: 'GİDER', 
        PARTNER: 'ORTAK',
        FINANCING: 'FİNANSMAN',
        INVESTMENT: 'YATIRIM',
        EXCLUDED: 'HARİÇ'
      };
      lines.push(`${typeLabels[type] || type}: ${codes}`);
    }
  }
  
  // Add keyword hints for categories that have them
  lines.push('\n## KEYWORD İPUÇLARI (eşleşmemiş işlemler için referans)');
  const catsWithKeywords = categories.filter(c => c.keywords?.length > 0);
  for (const cat of catsWithKeywords.slice(0, 15)) { // Limit to avoid token overflow
    const hints = cat.keywords.slice(0, 5).join(', ');
    lines.push(`- ${cat.code}: ${hints}...`);
  }
  
  return lines.join('\n');
}

// Process a single batch
async function processSingleBatch(
  batch: any[],
  startIdx: number,
  batchIndex: number,
  totalBatches: number,
  apiKey: string,
  systemPrompt: string
): Promise<{ batchIndex: number; results: CategoryResult[]; success: boolean }> {
  const txList = batch.map((t: any, idx: number) => {
    const txIndex = t.index !== undefined ? t.index : startIdx + idx;
    return `${txIndex}|${t.amount > 0 ? '+' : ''}${t.amount}|${t.description}|${t.counterparty || '-'}`;
  }).join('\n');

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
          { role: 'user', content: `Kategorile:\n${txList}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'categorize_transactions',
            description: 'Kategorileme sonuçları',
            parameters: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number' },
                      categoryCode: { type: 'string' },
                      categoryType: { type: 'string', enum: ['INCOME', 'EXPENSE', 'PARTNER', 'INVESTMENT', 'FINANCING', 'EXCLUDED'] },
                      confidence: { type: 'number' },
                      reasoning: { type: 'string' },
                      counterparty: { type: 'string' },
                      affects_pnl: { type: 'boolean' },
                      balance_impact: { type: 'string', enum: ['equity_increase', 'equity_decrease', 'liability_increase', 'liability_decrease', 'asset_increase', 'none'] }
                    },
                    required: ['index', 'categoryCode', 'categoryType', 'confidence', 'reasoning', 'affects_pnl', 'balance_impact']
                  }
                }
              },
              required: ['results']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'categorize_transactions' } },
        temperature: 0.1,
        max_tokens: 8000
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Batch ${batchIndex + 1} failed with status ${response.status}`);
      return { batchIndex, results: [], success: false };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error(`Batch ${batchIndex + 1}: No tool call response`);
      return { batchIndex, results: [], success: false };
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`Batch ${batchIndex + 1}/${totalBatches}: ${parsed.results?.length || 0} results`);
    
    return { batchIndex, results: parsed.results || [], success: true };
  } catch (error) {
    console.error(`Batch ${batchIndex + 1} error:`, error);
    return { batchIndex, results: [], success: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories: providedCategories } = await req.json();
    
    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ results: [], stats: { total: 0, categorized: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use provided categories or fetch from DB
    let categories = providedCategories;
    if (!categories || categories.length === 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: dbCategories } = await supabase
        .from('transaction_categories')
        .select('code, name, type, keywords')
        .eq('is_active', true);
      
      categories = dbCategories || [];
    }

    // Build dynamic prompt
    const categorySection = buildCategorySection(categories);
    const DYNAMIC_PROMPT = STATIC_RULES + categorySection;

    console.log(`Processing ${transactions.length} transactions with dynamic prompt...`);

    // Split into batches
    const batches: any[][] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      batches.push(transactions.slice(i, i + BATCH_SIZE));
    }

    // Process in parallel groups
    const allResults: CategoryResult[] = [];
    
    for (let g = 0; g < batches.length; g += PARALLEL_BATCH_COUNT) {
      const groupBatches = batches.slice(g, g + PARALLEL_BATCH_COUNT);
      const promises = groupBatches.map((batch, idx) => 
        processSingleBatch(batch, (g + idx) * BATCH_SIZE, g + idx, batches.length, LOVABLE_API_KEY, DYNAMIC_PROMPT)
      );
      
      const groupResults = await Promise.all(promises);
      
      for (const result of groupResults) {
        if (result.success && result.results.length > 0) {
          allResults.push(...result.results);
        }
      }
    }

    console.log(`Completed: ${allResults.length}/${transactions.length} categorized`);

    return new Response(
      JSON.stringify({
        results: allResults,
        stats: {
          total: transactions.length,
          categorized: allResults.length,
          lowConfidence: allResults.filter(r => r.confidence < 0.7).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Categorization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Kategorilendirme hatası';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});