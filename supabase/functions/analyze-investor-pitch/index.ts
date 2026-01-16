import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen, Silikon Vadisi standartlarında çalışan, VC (Venture Capital) odaklı bir "Yatırım Stratejisti ve CFO"sun.
Görevin, iki senaryoyu analiz ederek yatırımcıya şu hikayeyi satmaktır:
"Yatırım almazsak (Senaryo A) yerimizde sayarız veya batarız, yatırım alırsak (Senaryo B) şu çarpanla büyürüz."

Analiz Kuralları:

1. SERMAYE İHTİYACI (CAPITAL CALL):
   - Senaryo B'nin gerçekleşmesi için tam olarak ne kadar nakit girişi gerektiğini net söyle
   - Bu paranın nereye harcanacağını (Burn Rate) ve ne zaman tükeneceğini (Runway) analiz et
   - "Ölüm Vadisi" (Valley of Death) noktasını tespit et

2. BÜYÜME HİKAYESİ (THE GROWTH STORY):
   - Senaryo A (Negatif/Baz): "Yatırımsızlık Maliyeti"ni vurgula (Pazar payı kaybı, yetenek kaybı)
   - Senaryo B (Pozitif/Yatırım): "Sermaye Verimliliği"ni vurgula. Yatırılan her 1$'ın ne kadar ciro getireceğini söyle

3. ÇEYREKSEL KIRILMA (QUARTERLY BREAKDOWN):
   - Yatırımın hangi çeyrekte hesaba girmesi gerektiğini (Cash Injection Timing) belirle
   - Gecikirse ne olur?

4. EXIT STRATEJİSİ (THE EXIT PLAN):
   - 3. Yıl ve 5. Yıl için tahmini şirket değerlemesini hesapla
   - Yatırımcının parasını kaça katlayacağını (MOIC) söyle
   - Potansiyel alıcıları (teknoloji devleri, yerel holdingler, Private Equity) tahminsel olarak isimlendir
   - "3. Yılda Seri B mi?" yoksa "5. Yılda Stratejik Satış mı?" analiz et

5. ÇIKTI FORMATI:
   - Kesinlikle yatırımcı dili kullan (Burn Rate, Runway, CAC, LTV, ROI, MOIC)
   - Duygusal değil, matematiksel konuş
   - Türkçe ve profesyonel dilde yaz`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarioA, scenarioB, metrics, capitalNeeds, dealConfig, projections } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `İki finansal senaryoyu yatırımcı perspektifinden analiz et:

SENARYO A: ${scenarioA.name} (Mevcut/Muhafazakar)
- Toplam Gelir: $${metrics.scenarioA.totalRevenue?.toLocaleString() || 0}
- Net Kâr: $${metrics.scenarioA.netProfit?.toLocaleString() || 0}
- Sermaye İhtiyacı: ${capitalNeeds.scenarioA.selfSustaining ? 'Kendi kendini finanse ediyor' : '$' + capitalNeeds.scenarioA.requiredInvestment?.toLocaleString()}
- Kritik Çeyrek: ${capitalNeeds.scenarioA.criticalQuarter}

SENARYO B: ${scenarioB.name} (Büyüme/Agresif)
- Toplam Gelir: $${metrics.scenarioB.totalRevenue?.toLocaleString() || 0}
- Net Kâr: $${metrics.scenarioB.netProfit?.toLocaleString() || 0}
- Sermaye İhtiyacı: $${capitalNeeds.scenarioB.requiredInvestment?.toLocaleString() || 0}
- Kritik Çeyrek: ${capitalNeeds.scenarioB.criticalQuarter}
- Aylık Burn Rate: $${capitalNeeds.scenarioB.burnRateMonthly?.toLocaleString() || 0}

YATIRIM ANLAŞMASI:
- Talep Edilen Yatırım: $${dealConfig.investmentAmount?.toLocaleString()}
- Teklif Edilen Hisse: %${dealConfig.equityPercentage}
- Şirket Değerlemesi (Post-Money): $${dealConfig.postMoneyValuation?.toLocaleString()}
- Sektör Çarpanı: ${dealConfig.sectorMultiple}x

PROJEKSİYONLAR:
- 1. Yıl Büyüme Hızı: %${((projections.growthRate || 0) * 100).toFixed(1)}
- 3. Yıl Tahmini Ciro: $${projections.year3?.revenue?.toLocaleString() || 0}
- 3. Yıl Değerleme: $${projections.year3?.companyValuation?.toLocaleString() || 0}
- 3. Yıl MOIC: ${projections.moic3Year?.toFixed(1) || 0}x
- 5. Yıl Tahmini Ciro: $${projections.year5?.revenue?.toLocaleString() || 0}
- 5. Yıl Değerleme: $${projections.year5?.companyValuation?.toLocaleString() || 0}
- 5. Yıl MOIC: ${projections.moic5Year?.toFixed(1) || 0}x

YATIRIMCI SORUSU:
"Neden Senaryo A ile devam etmeyip, Senaryo B için bana $${dealConfig.investmentAmount?.toLocaleString()} yatırım yapayım? 
Paramı ne zaman ve kaç katı olarak geri alırım? Bu şirketi kim satın alabilir?"

Bu soruya ikna edici, rakamlı bir cevap ver.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_investor_analysis",
            description: "Yatırımcı odaklı senaryo analizi üret",
            parameters: {
              type: "object",
              properties: {
                capital_story: { 
                  type: "string", 
                  description: "Sermaye hikayesi özeti - neden bu yatırım gerekli, para nereye harcanacak (2-3 cümle)" 
                },
                opportunity_cost: { 
                  type: "string", 
                  description: "Yatırımsızlık maliyeti analizi - yatırım almazsak masada bırakacağımız değer (rakamlarla)" 
                },
                investor_roi: { 
                  type: "string", 
                  description: "Yatırımcı getiri analizi - MOIC, payback period, sermaye verimliliği (rakamlarla)" 
                },
                exit_narrative: { 
                  type: "string", 
                  description: "Çıkış senaryosu anlatısı - 3 yıl vs 5 yıl, hangi strateji daha mantıklı" 
                },
                potential_acquirers: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Potansiyel alıcı şirketler veya fon türleri (3-5 adet spesifik isim)" 
                },
                risk_factors: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Yatırımcı için ana risk faktörleri (3-5 adet)" 
                },
                capital_efficiency: { 
                  type: "number", 
                  description: "Her 1$ yatırımın getirdiği ciro (örn: 5.2)" 
                },
                payback_months: { 
                  type: "integer", 
                  description: "Tahmini geri ödeme süresi (ay)" 
                },
                burn_multiple: { 
                  type: "number", 
                  description: "Burn Multiple = Net Burn / Net New ARR" 
                },
                recommended_exit: { 
                  type: "string", 
                  enum: ["series_b", "strategic_sale", "ipo", "hold"],
                  description: "Önerilen çıkış stratejisi" 
                }
              },
              required: ["capital_story", "opportunity_cost", "investor_roi", "exit_narrative", "potential_acquirers", "capital_efficiency", "recommended_exit"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_investor_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("analyze-investor-pitch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
