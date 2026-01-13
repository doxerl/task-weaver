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

// Static rules - Alfa Zen specific
const STATIC_RULES = `Sen Alfa Zen Partner Network için banka işlemlerini kategorileyen bir uzmansın.

## ŞİRKET BİLGİSİ
Alfa Zen (Tüzel: "ALFA ZEN EĞİTİM DENETİM VE DANIŞMANLIK"), tekstil sektörüne sürdürülebilirlik hizmetleri sunan bir ZDHC Çözüm Sağlayıcısıdır.

⚠️ KRİTİK: "ALFA ZEN EĞİTİM" FİRMA ADIDIR, EĞİTİM HİZMETİ DEĞİL!
Müşteriler açıklamaya bazen bu tüzel adı yazar - EGITIM_IN YAPMA!

## KRİTİK KURALLAR

### 1. TUTAR MANTIĞI
- POZİTİF (+) tutar = GELEN PARA = GELİR (müşteriden tahsilat, döviz satışı, vs.)
- NEGATİF (-) tutar = GİDEN PARA = GİDER veya ÖDEME

### 2. BANKA KESİNTİLERİ (Öncelik: EN YÜKSEK)
- "KESİNTİ VE EKLERİ" + küçük tutar (< 100₺) = BANKA
- Açıklamanın geri kalanı ne olursa olsun (borç, faiz, vs.) = BANKA

### 3. ORTAK İŞLEMLERİ
- Tanımlı ortak adı (örn: "EMRE AKÇAOĞLU") + negatif = ORTAK_OUT
- Tanımlı ortak adı + pozitif = ORTAK_IN
- affects_pnl: false (K/Z'yi ETKİLEMEZ)

### 4. KREDİ/FAİZ
- "O4-(TİCARİ AMAÇLI KREDİ" = KREDI_OUT (affects_pnl: false)
- "KREDİLİ HESAP FAİZ" = FAIZ_OUT (affects_pnl: true)

### 5. MÜŞTERİ TAHSİLATLARI (GELİRLER) - KRİTİK!
POZİTİF tutar + firma adı = GELİR

**ADIM 1 - ÖNCE KEYWORD KONTROL ET:**
- "LEADERSHIP", "L&S", "L%S", "PERFORMANCE" → L&S
- "SBT", "SBT TRACKER", "KARBON", "YAZILIM HİZ" → SBT
- "ZDHC", "INCHECK", "MRSL", "KİMYASAL DOĞ" → ZDHC

**ADIM 2 - KEYWORD YOKSA ZORUNLU TUTAR KURALI:**
Tekstil/sanayi firmasından gelen para:

| Tutar Aralığı | Kategori | Güven | Açıklama |
|---------------|----------|-------|----------|
| >= 200.000 TL | L&S | %92 | Toplu denetim ödemesi |
| 120.000 - 199.999 TL | SBT | %90 | SBT Tracker büyük proje |
| 70.000 - 119.999 TL | SBT | %80 | SBT Tracker küçük üretici |
| 30.000 - 69.999 TL | ZDHC | %85 | ZDHC InCheck |
| < 30.000 TL | ZDHC | %75 | Küçük doğrulama |

⚠️ DİKKAT: Firma adında "TEKSTİL", "BOYA" vb. olması kategorileme için YETERLİ DEĞİL!
TUTARA BAK ve yukarıdaki kuralı uygula.

ÖRNEKLER:
- "İPEK TÜL VE KONFEKSİYON" +142.219 TL → SBT (120k-200k)
- "FORTE BOYA VE APRE" +105.840 TL → SBT (70k-120k, küçük üretici)
- "AKATEKS TEKSTİL" +72.000 TL → SBT (70k-120k, küçük üretici)
- "ASLI TEKSTİL" +60.000 TL → ZDHC (30k-70k)
- "HOME DRESS TEKSTİL" +49.800 TL → ZDHC (30k-70k)
- "LEADERSHIP AND SUSTA" +369.984 TL → L&S (keyword eşleşmesi)

### 6. FİRMA ADI TUZAĞI
⚠️ "ALFA ZEN EĞİTİM DENETİM" görürsen:
- Bu MÜŞTERİNİN yazdığı ALFA ZEN'in tüzel adı
- EGITIM_IN YAPMA!
- Tutara göre SBT, L&S veya ZDHC olarak kategorile

### 7. GİDER KATEGORİLERİ
- Sigorta (KASKO, POLİÇE, EUREKO, ALLIANZ) = SIGORTA
- Telefon (TURKCELL, VODAFONE, TÜRK TELEKOM) = TELEKOM
- HGS/Otoyol (HGS, OGS, KÖPRÜ, AVRASYA) = HGS
- Kargo (ARAS, MNG, UPS) = KARGO
- Kartvizit/Fuar/Tanıtım = FUAR

### 8. affects_pnl KURALI
- true: Gelirler, normal giderler (K/Z'yi etkiler)
- false: Ortak işlemleri, kredi anaparası, iç transferler

### 9. counterparty TESPİTİ
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
        .eq('is_active', true)
        .order('match_priority', { ascending: true });
      
      categories = dbCategories || [];
    }

    // Build dynamic prompt
    const categorySection = buildCategorySection(categories);
    const DYNAMIC_PROMPT = STATIC_RULES + categorySection;

    console.log(`Processing ${transactions.length} transactions with Alfa Zen rules...`);

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
