import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Detaylı kural bazlı prompt - örnek bazlı
const SYSTEM_PROMPT = `Sen Türk bankacılık işlemlerini kategorileyen bir uzmansın.

## KRİTİK KURALLAR

### 1. TUTAR MANTIĞI
- POZİTİF (+) tutar = GELEN PARA = GELİR (müşteriden tahsilat, döviz satışı, vs.)
- NEGATİF (-) tutar = GİDEN PARA = GİDER veya ÖDEME

### 2. ORTAK İŞLEMLERİ (EMRE AKÇAOĞLU)
- "borç" + "EMRE AKÇAOĞLU" + NEGATİF = ORTAK_OUT (categoryType: PARTNER, affects_pnl: false)
- Örnek: "CEP ŞUBE-HVL-borç -EMRE AKÇAOĞLU" -50.000₺ → ORTAK_OUT
- NOT: Ortağa yapılan ödemeler K/Z'yi ETKİLEMEZ

### 3. BANKA KESİNTİLERİ
- "KESİNTİ VE EKLERİ" + küçük tutar (genelde -6,39₺ veya -12,80₺) = BANKA
- Bunlar EFT/havale masraflarıdır
- Örnek: "KESİNTİ VE EKLERİ-borç Faiz / Komisyon" -6,39₺ → BANKA

### 4. MÜŞTERİ TAHSİLATLARI (GELİRLER)
- POZİTİF tutar + firma adı (TEKSTİL, SANAYİ, LTD, A.Ş.) = GELİR
- Açıklamada "EF" + referans = müşteriden gelen EFT
- Örnek: "EF1876110 FORTE BOYA VE APRE TEKSTİL" +105.840₺ → L&S veya DANIS
- Örnek: "INT-HVL-emre performance - LEADERSHIP" +369.984₺ → L&S

### 5. HGS/OTOYOL
- "HGS Hesaptan Bakiye Yükleme" = HGS (categoryType: EXPENSE)
- "HGS Hesaptan" ile başlayan her şey = HGS
- Örnek: "HGS Hesaptan Bakiye Yükleme Gebze İzmir" -795₺ → HGS

### 6. TELEKOM
- "TRKCLL" veya "TURKCELL" = TELEKOM
- Örnek: "TRKCLL 5314214216" -391,50₺ → TELEKOM

### 7. SİGORTA
- "Eureko", "KASKO", "Poliçe", "Prim" = SIGORTA
- Örnek: "Eureko-KASKO Poliçesi Prim Tahsilatı" -2.904₺ → SIGORTA

### 8. KREDİ
- "KREDİ TAHS", "TİCARİ AMAÇLI KREDİ" = KREDI_OUT (affects_pnl: false, sadece anapara)
- "KREDİLİ HESAP FAİZ TAHSİLATI" = FAIZ_OUT (affects_pnl: true)
- Örnek: "O4-(TİCARİ AMAÇLI KREDİ TAHS.)" -41.262₺ → KREDI_OUT

### 9. DÖVİZ
- "DÖVİZ SATIŞ" + POZİTİF TL = DOVIZ_IN (döviz sattık, TL aldık)
- Örnek: "Mobil DÖVİZ SATIŞ EUR:47.597" +10.471₺ → DOVIZ_IN

### 10. OFİS GİDERLERİ
- "KARTVİZİT BASIMI BEDELİ" (büyük tutar, ör: -1.080₺) = OFIS
- NOT: Bunun yanındaki "KESİNTİ VE EKLERİ" (-6,39₺) ayrı BANKA kesintisidir

### 11. DANIŞMANLIK GİDERİ
- "DANIŞMANLIK HİZMET BEDELİ" + NEGATİF + kişi adı = DANIS_OUT
- Örnek: "CEP ŞUBE-HVL-DANIŞMANLIK HİZMET BEDELİ -AKIN TAŞKIRAN" -18.840₺ → DANIS_OUT

## KATEGORİ KODLARI
GELİR: SBT, L&S, DANIS, ZDHC, MASRAF, BAYI, EGITIM_IN, RAPOR, FAIZ_IN, KIRA_IN, DOVIZ_IN, DIGER_IN
GİDER: SEYAHAT, FUAR, HGS, SIGORTA, TELEKOM, BANKA, OFIS, YEMEK, PERSONEL, YAZILIM, MUHASEBE, HUKUK, VERGI, KIRA_OUT, KARGO, HARICI, IADE, DOVIZ_OUT, KREDI_OUT, DIGER_OUT, DANIS_OUT
ORTAK: ORTAK_OUT, ORTAK_IN
FİNANSMAN: KREDI_IN, LEASING, FAIZ_OUT
HARİÇ: IC_TRANSFER, NAKIT_CEKME, EXCLUDED

## affects_pnl KURALI
- true: Gelirler, normal giderler (K/Z'yi etkiler)
- false: Ortak işlemleri, kredi anaparası, iç transferler (bilanço hareketi)

## counterparty TESPİTİ
- Açıklamadaki firma/kişi adını yaz
- "EMRE AKÇAOĞLU" ise = "EMRE AKÇAOĞLU"
- "FORTE BOYA" ise = "FORTE BOYA VE APRE TEKSTİL"
- Tespit edilemezse = null`;

// Process a single batch
async function processSingleBatch(
  batch: any[],
  startIdx: number,
  batchIndex: number,
  totalBatches: number,
  apiKey: string
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
          { role: 'system', content: SYSTEM_PROMPT },
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
    const { transactions } = await req.json();
    
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

    console.log(`Processing ${transactions.length} transactions...`);

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
        processSingleBatch(batch, (g + idx) * BATCH_SIZE, g + idx, batches.length, LOVABLE_API_KEY)
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
