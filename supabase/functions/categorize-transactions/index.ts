import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 25;
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

const SYSTEM_PROMPT = `Sen bir Türk şirketi için uzman finansal işlem kategorileme asistanısın.

═══════════════════════════════════════════════════════════════════
⚠️ KRİTİK KURALLAR:
═══════════════════════════════════════════════════════════════════
1. HER İŞLEM MUTLAKA KATEGORİLENMELİ - Atlama yok
2. Şüpheli işlemlerde en yakın kategoriyi seç + confidence düşür
3. Tool calling ile categorize_transactions fonksiyonunu kullan
4. Batch'teki TÜM işlemleri tek seferde kategorile

═══════════════════════════════════════════════════════════════════
KATEGORİ TÜRLERİ VE BİLANÇO ETKİSİ:
═══════════════════════════════════════════════════════════════════

| TÜR        | affects_pnl | balance_impact      | Açıklama              |
|------------|-------------|---------------------|----------------------|
| INCOME     | true        | equity_increase     | Gelir → Özsermaye ↑  |
| EXPENSE    | true        | equity_decrease     | Gider → Özsermaye ↓  |
| PARTNER    | false       | asset/liability     | Ortak cari hesabı    |
| INVESTMENT | false       | asset_increase      | Duran varlık alımı   |
| FINANCING  | false       | liability_increase  | Kredi/Leasing        |
| EXCLUDED   | false       | none                | Hesaplama dışı       |

═══════════════════════════════════════════════════════════════════
GELİR KATEGORİLERİ (INCOME) - POZİTİF TUTARLAR:
═══════════════════════════════════════════════════════════════════

| KOD       | Anahtar Kelimeler                                    |
|-----------|-----------------------------------------------------|
| SBT       | SBT, KARBON, TRACKER, CARBON, AYAK İZİ, EMİSYON    |
| L&S       | LEADERSHIP, DENETİM, AUDIT, L&S, ASSESSMENT         |
| DANIS     | DANIŞMANLIK, CONSULTING, MÜŞAVIR, CONSULTANCY      |
| ZDHC      | ZDHC, INCHECK, MRSL, GATEWAY, KİMYASAL             |
| MASRAF    | MASRAF İADE, EXPENSE REFUND, MASRAF GERİ           |
| BAYI      | BAYİ, KOMİSYON GELİR, DISTRIBUT, DEALER            |
| EGITIM_IN | EĞİTİM, SEMİNER, TRAINING, WORKSHOP, KURS          |
| RAPOR     | RAPOR, REPORT, BELGE, SERTİFİKA, DOKÜMAN           |
| FAIZ_IN   | FAİZ GELİRİ, INTEREST INCOME, MEVDUAT FAİZ         |
| KIRA_IN   | KİRA GELİR, RENT INCOME, KİRA TAHSİL               |
| DOVIZ_IN  | DÖVİZ SAT, FX SELL, USD SAT, EUR SAT, DÖVİZ GELİR  |
| DIGER_IN  | (Yukarıdakilere uymayan diğer pozitif işlemler)    |

═══════════════════════════════════════════════════════════════════
GİDER KATEGORİLERİ (EXPENSE) - NEGATİF TUTARLAR:
═══════════════════════════════════════════════════════════════════

| KOD       | Anahtar Kelimeler                                    |
|-----------|-----------------------------------------------------|
| SEYAHAT   | UÇAK, OTEL, HOTEL, BOOKING, THY, PEGASUS, KONAKLAMA, SANTA TUR, TRANSFERİ |
| FUAR      | FUAR, STAND, REKLAM, ADVERTISING, GOOGLE ADS, META, KARTVİZİT, PATENT, MARKA |
| HGS       | HGS, OGS, YAKIT, PETROL, SHELL, BP, OPET, BENZİN, MOTORİN, OTOPARK, KÖPRÜ |
| SIGORTA   | SİGORTA, KASKO, TRAFİK, ALLIANZ, AXA, ANADOLU SİGORTA, POLİÇE |
| TELEKOM   | TURKCELL, VODAFONE, TÜRK TELEKOM, TURK TELEKOM, INTERNET FATURA |
| BANKA     | KOMİSYON, MASRAF, EFT MASRAF, HAVALE MASRAF, KART AİDAT, HESAP İŞLETİM |
| OFIS      | KIRTASİYE, OFİS, OFFICE, TONER, KAĞIT, DOSYA, POSTA |
| YEMEK     | YEMEK, RESTAURANT, CAFE, STARBUCKS, GETİR, YEMEKSEPETİ, İKRAM, CATERING |
| PERSONEL  | MAAŞ, BORDRO, SGK, SSK, PRİM, PERSONEL, İŞÇİ, ÇALIŞAN |
| YAZILIM   | YAZILIM, SOFTWARE, ADOBE, MICROSOFT, GOOGLE WORKSPACE, ZOOM, AWS, SUBSCRIPTION |
| MUHASEBE  | MUHASEBE, MALİ MÜŞAVİR, YMM, SMMM, BEYANNAME, DEFTER |
| HUKUK     | AVUKAT, HUKUK, NOTER, DAVA, MAHKEME, VEKİL |
| VERGI     | VERGİ, KDV, GEÇİCİ VERGİ, STOPAJ, MTV, DAMGA, VERGİ DAİRESİ, GİB |
| KIRA_OUT  | KİRA, RENT, KİRA ÖDEME, OFİS KİRA, DEPO KİRA |
| KARGO     | KARGO, NAKLİYE, ARAS, MNG, YURTIÇI, UPS, DHL, FEDEX, PTT |
| HARICI    | HARİCİ DANIŞMAN, DIŞ HİZMET, YÖNLENDİRME, SUB-CONTRACT, TAŞERON |
| IADE      | İADE, REFUND, RETURN, İPTAL, GERİ ÖDEME |
| DOVIZ_OUT | DÖVİZ AL, FX BUY, USD AL, EUR AL, DÖVİZ ALIŞ |
| KREDI_OUT | KREDİ TAKSİT, LOAN PAYMENT, KREDİ ÖDEME, TAKSİT, BANKA KREDİ TAKSİT |
| DIGER_OUT | (Yukarıdakilere uymayan diğer negatif işlemler) |

═══════════════════════════════════════════════════════════════════
ORTAK CARİ (PARTNER) - KAR/ZARAR ETKİLEMEZ:
═══════════════════════════════════════════════════════════════════

| KOD       | Yön     | balance_impact     | Anahtar Kelimeler          |
|-----------|---------|--------------------|-----------------------------|
| ORTAK_OUT | Negatif | liability_increase | ORTAK, NAKİT ÇEKİM (ortak), ŞAHSİ, KİŞİSEL HARCAMA |
| ORTAK_IN  | Pozitif | asset_increase     | ORTAK YATIRMA, SERMAYE, ORTAK KATKISI |

⚠️ ORTAK TESPİTİ: Açıklamada şirket sahibinin adı varsa + ATM/NAKİT → ORTAK_OUT

═══════════════════════════════════════════════════════════════════
YATIRIM (INVESTMENT) - GİDER DEĞİL, AKTİF ARTIŞ:
═══════════════════════════════════════════════════════════════════

| KOD     | Anahtar Kelimeler                                      |
|---------|-------------------------------------------------------|
| EKIPMAN | EKİPMAN, MAKİNE, CİHAZ, BİLGİSAYAR, LAPTOP, SERVER, MOBİLYA, DEMİRBAŞ |
| ARAC    | ARAÇ, OTOMOBİL, TOGG, BMW, MERCEDES, VOLKSWAGEN, ARABA, TAŞIT |

⚠️ >50.000 TL tutarlı alımlar genellikle yatırımdır

═══════════════════════════════════════════════════════════════════
FİNANSMAN (FINANCING) - KAR/ZARAR ETKİLEMEZ:
═══════════════════════════════════════════════════════════════════

| KOD      | Yön     | Anahtar Kelimeler                           |
|----------|---------|---------------------------------------------|
| KREDI_IN | Pozitif | KREDİ KULLANIM, LOAN DISBURSEMENT, TİCARİ KREDİ (giriş) |
| LEASING  | Negatif | LEASING, KİRALAMA, FİNANSAL KİRALAMA       |
| FAIZ_OUT | Negatif | FAİZ GİDERİ, INTEREST EXPENSE, KREDİ FAİZ  |

═══════════════════════════════════════════════════════════════════
HARİÇ (EXCLUDED) - BİLANÇO ETKİSİ YOK:
═══════════════════════════════════════════════════════════════════

| KOD         | Anahtar Kelimeler                                   |
|-------------|-----------------------------------------------------|
| IC_TRANSFER | HESAPLAR ARASI, VİRMAN, İÇ TRANSFER, KENDİ HESABIMA |
| NAKIT_CEKME | ATM, NAKİT ÇEKİM, BANKAMATİK (ortak değilse)       |
| EXCLUDED    | HATA DÜZELTME, TEST, İPTAL, TERS KAYIT             |

═══════════════════════════════════════════════════════════════════
KATEGORİLEME KARAR AĞACI:
═══════════════════════════════════════════════════════════════════

1. TUTAR POZİTİF (+) Mİ?
   ├─ Müşteriden tahsilat? → INCOME (SBT, L&S, DANIS, vb.)
   ├─ Ortaktan para? → ORTAK_IN (PARTNER)
   ├─ Kredi kullanımı? → KREDI_IN (FINANCING)
   ├─ Faiz geliri? → FAIZ_IN (INCOME)
   └─ Belirsiz? → DIGER_IN (INCOME)

2. TUTAR NEGATİF (-) Mİ?
   ├─ Fatura/hizmet ödemesi? → İlgili EXPENSE kategorisi
   ├─ Ortağa ödeme/çekim? → ORTAK_OUT (PARTNER)
   ├─ Araç/Ekipman (>50K)? → ARAC/EKIPMAN (INVESTMENT)
   ├─ Kredi taksiti? → KREDI_OUT (EXPENSE)
   ├─ İç transfer/virman? → IC_TRANSFER (EXCLUDED)
   └─ Belirsiz? → DIGER_OUT (EXPENSE)

3. ÖZEL DURUMLAR:
   ├─ "VİRMAN" + aynı tutar giriş/çıkış → IC_TRANSFER
   ├─ ATM + ortak ismi → ORTAK_OUT
   ├─ FAİZ + pozitif → FAIZ_IN
   ├─ FAİZ + negatif → FAIZ_OUT
   └─ KOMİSYON/MASRAF (düşük tutar) → BANKA

═══════════════════════════════════════════════════════════════════
CONFIDENCE SKORU KRİTERLERİ:
═══════════════════════════════════════════════════════════════════

1.0 → Kesin eşleşme (anahtar kelime + tutar yönü tutarlı)
0.9 → Çok yüksek güven (açıklama net, belirsizlik yok)
0.8 → Yüksek güven (muhtemelen doğru)
0.7 → Orta-yüksek güven (küçük belirsizlik)
0.6 → Orta güven (birkaç kategori olabilir)
0.5 → Düşük-orta güven (tahmin ağırlıklı)
0.4 → Düşük güven (manuel kontrol önerilir)
<0.4 → Çok düşük (kesinlikle kontrol gerek)

═══════════════════════════════════════════════════════════════════
COUNTERPARTY (KARŞI TARAF) ÇIKARIMI:
═══════════════════════════════════════════════════════════════════

EFT/HAVALE açıklamalarından karşı taraf ismini çıkar:
- "EFT GÖNDERİM-AHMET YILMAZ" → counterparty: "AHMET YILMAZ"
- "GELEN EFT-ABC LTD.ŞTİ." → counterparty: "ABC LTD.ŞTİ."
- "FAST GÖNDERİM/MEHMET KAYA" → counterparty: "MEHMET KAYA"
- IBAN'dan sonra gelen isim
- "ALICI:", "GÖNDERİCİ:" sonrası

Bulunamazsa → counterparty: null

Batch'teki TÜM işlemleri kategorile!`;

// Process a single batch of transactions
async function processSingleBatch(
  batch: any[],
  startIdx: number,
  batchIndex: number,
  totalBatches: number,
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `İŞLEMLER (${startIdx}-${startIdx + batch.length - 1}):\n${txList}\n\nHer işlem için kategori öner.` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_transactions',
              description: 'Banka işlemlerini kategorile ve bilanço etkisini belirle',
              parameters: {
                type: 'object',
                properties: {
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        index: { 
                          type: 'number',
                          description: 'İşlemin batch içindeki sırası (0-indexed)'
                        },
                        categoryCode: { 
                          type: 'string',
                          description: 'Kategori kodu',
                          enum: [
                            // INCOME
                            'SBT', 'L&S', 'DANIS', 'ZDHC', 'MASRAF', 'BAYI', 'EGITIM_IN', 'RAPOR', 'FAIZ_IN', 'KIRA_IN', 'DOVIZ_IN', 'DIGER_IN',
                            // EXPENSE
                            'SEYAHAT', 'FUAR', 'HGS', 'SIGORTA', 'TELEKOM', 'BANKA', 'OFIS', 'YEMEK', 'PERSONEL', 'YAZILIM', 'MUHASEBE', 'HUKUK', 'VERGI', 'KIRA_OUT', 'KARGO', 'HARICI', 'IADE', 'DOVIZ_OUT', 'KREDI_OUT', 'DIGER_OUT',
                            // PARTNER
                            'ORTAK_OUT', 'ORTAK_IN',
                            // INVESTMENT
                            'EKIPMAN', 'ARAC',
                            // FINANCING
                            'KREDI_IN', 'LEASING', 'FAIZ_OUT',
                            // EXCLUDED
                            'IC_TRANSFER', 'NAKIT_CEKME', 'EXCLUDED'
                          ]
                        },
                        categoryType: {
                          type: 'string',
                          description: 'Kategori türü',
                          enum: ['INCOME', 'EXPENSE', 'PARTNER', 'INVESTMENT', 'FINANCING', 'EXCLUDED']
                        },
                        confidence: { 
                          type: 'number',
                          description: 'Güven skoru (0.0 - 1.0)',
                          minimum: 0,
                          maximum: 1
                        },
                        reasoning: { 
                          type: 'string',
                          description: 'Kategori seçim gerekçesi (max 50 karakter)',
                          maxLength: 50
                        },
                        counterparty: { 
                          type: ['string', 'null'],
                          description: 'Karşı taraf ismi (tespit edildiyse)'
                        },
                        affects_pnl: { 
                          type: 'boolean',
                          description: 'Kar/Zarar hesabını etkiler mi?'
                        },
                        balance_impact: { 
                          type: 'string',
                          description: 'Bilanço etkisi türü',
                          enum: ['equity_increase', 'equity_decrease', 'asset_increase', 'liability_increase', 'none']
                        }
                      },
                      required: ['index', 'categoryCode', 'categoryType', 'confidence', 'reasoning', 'affects_pnl', 'balance_impact'],
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
        processSingleBatch(batch, startIdx, batchIndex, totalBatches, LOVABLE_API_KEY)
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
