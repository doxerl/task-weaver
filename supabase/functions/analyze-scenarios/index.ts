import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen, 20 yıllık deneyime sahip, Fortune 500 şirketlerine ve yüksek büyüme potansiyelli startup'lara danışmanlık yapan bir "Lead Financial Strategist & Data Scientist"sin. Görevin, sana verilen iki farklı finansal senaryoyu (A ve B) matematiksel, stratejik ve operasyonel açılardan "ameliyat eder gibi" analiz etmek ve karar vericilere net, uygulanabilir, veriye dayalı yol haritaları sunmaktır.

Analiz Kuralları:
1. Derinlemesine Matematiksel Analiz: Sadece "Senaryo B daha kârlı" deme. Neden ve Ne zaman kârlı olduğunu açıkla. Örnek: "Senaryo B, Q3'te yapılan pazarlama yatırımı nedeniyle Q4'te %15 daha yüksek kârlılığa ulaşıyor, ancak ilk 6 ay nakit akışı A'ya göre %20 daha riskli."
2. Risk & Fırsat Matrisi: Her senaryo için "Görünmeyen Riskleri" (Hidden Risks) tespit et. Örn: "Senaryo B'de kâr marjı %5'in altına düşüyor, bu da operasyonel hatalara tolerans bırakmıyor."
3. Mevsimsellik ve Zamanlama: Hangi çeyrek "Ölüm Vadisi" (Valley of Death) olabilir? Nakit akışının en kritik olduğu noktayı bul.
4. Aksiyon Odaklı Öneriler: Genel geçer tavsiyeler ("Giderleri azalt") VERME. Spesifik ol: "Senaryo B'yi seçerseniz, Q2'deki nakit açığını kapatmak için Q1 sonunda 50K ek finansman veya tedarikçi vadesi uzatımı planlayın."
5. Çapraz Korelasyon: Gelir artışının gider artışına oranını (Operating Leverage) analiz et.

Dil: Profesyonel Türkçe, finansal terimlere hakim ama anlaşılır.
Tavır: Objektif, analitik, yönlendirici ama dikte etmeyen.
Rakamsal hassasiyet: Tüm analizlerde verilen rakamları kullan, yaklaşık değerler verme.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarioA, scenarioB, metrics, quarterly } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `İki finansal senaryoyu derinlemesine analiz et:

SENARYO A: ${scenarioA.name} (Hedef Yıl: ${scenarioA.targetYear})
- Toplam Gelir: $${metrics.scenarioA.totalRevenue.toLocaleString()}
- Toplam Gider: $${metrics.scenarioA.totalExpenses.toLocaleString()}
- Net Kâr: $${metrics.scenarioA.netProfit.toLocaleString()}
- Kâr Marjı: %${metrics.scenarioA.profitMargin.toFixed(1)}
- Çeyreklik Net Kâr: Q1=$${quarterly.scenarioA.q1.toLocaleString()}, Q2=$${quarterly.scenarioA.q2.toLocaleString()}, Q3=$${quarterly.scenarioA.q3.toLocaleString()}, Q4=$${quarterly.scenarioA.q4.toLocaleString()}

SENARYO B: ${scenarioB.name} (Hedef Yıl: ${scenarioB.targetYear})
- Toplam Gelir: $${metrics.scenarioB.totalRevenue.toLocaleString()}
- Toplam Gider: $${metrics.scenarioB.totalExpenses.toLocaleString()}
- Net Kâr: $${metrics.scenarioB.netProfit.toLocaleString()}
- Kâr Marjı: %${metrics.scenarioB.profitMargin.toFixed(1)}
- Çeyreklik Net Kâr: Q1=$${quarterly.scenarioB.q1.toLocaleString()}, Q2=$${quarterly.scenarioB.q2.toLocaleString()}, Q3=$${quarterly.scenarioB.q3.toLocaleString()}, Q4=$${quarterly.scenarioB.q4.toLocaleString()}

FARKLAR:
- Gelir Farkı: $${metrics.differences.revenue.toLocaleString()} (%${metrics.differences.revenuePercent})
- Gider Farkı: $${metrics.differences.expenses.toLocaleString()} (%${metrics.differences.expensesPercent})
- Kâr Farkı: $${metrics.differences.profit.toLocaleString()} (${metrics.differences.profitPercent}%)

Bu verilere dayanarak:
1. En kritik 5-7 çıkarımı (insights) belirle - kategori, önem seviyesi, etki analizi ve destekleyici veri noktalarıyla
2. 3-5 adet stratejik öneri (recommendations) sun - öncelik sırası, aksiyon planı, beklenen sonuç ve risk azaltma stratejisiyle
3. Çeyreklik analiz yap - kritik dönemler, mevsimsel trendler, nakit yakma uyarısı ve büyüme eğilimi`;

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
            name: "generate_scenario_analysis",
            description: "İki finansal senaryo için detaylı stratejik analiz üret",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  description: "En kritik 5-7 çıkarım",
                  items: {
                    type: "object",
                    properties: {
                      category: { 
                        type: "string", 
                        enum: ["revenue", "profit", "cash_flow", "risk", "efficiency", "opportunity"],
                        description: "Çıkarım kategorisi"
                      },
                      severity: { 
                        type: "string", 
                        enum: ["critical", "high", "medium"],
                        description: "Önem seviyesi: critical=acil aksiyon gerekli, high=önemli, medium=dikkat edilmeli"
                      },
                      title: { type: "string", description: "Kısa ve çarpıcı başlık (max 10 kelime)" },
                      description: { type: "string", description: "Detaylı açıklama, rakamlarla destekli (2-3 cümle)" },
                      impact_analysis: { type: "string", description: "Bu durumun kısa ve uzun vadeli etkileri" },
                      data_points: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Bu çıkarımı destekleyen spesifik veri noktaları"
                      }
                    },
                    required: ["category", "severity", "title", "description", "impact_analysis"]
                  }
                },
                recommendations: {
                  type: "array",
                  description: "3-5 adet stratejik öneri",
                  items: {
                    type: "object",
                    properties: {
                      priority: { 
                        type: "number", 
                        enum: [1, 2, 3],
                        description: "1=Acil (bu hafta), 2=Kısa vade (1-3 ay), 3=Orta vade (3-6 ay)"
                      },
                      title: { type: "string", description: "Öneri başlığı (max 8 kelime)" },
                      description: { type: "string", description: "Önerinin detaylı açıklaması" },
                      action_plan: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Adım adım uygulama planı (3-5 adım)"
                      },
                      expected_outcome: { type: "string", description: "Bu öneri uygulanırsa beklenen sonuç (rakamsal tahmin)" },
                      risk_mitigation: { type: "string", description: "Bu hamlede dikkat edilmesi gerekenler" },
                      timeframe: { type: "string", description: "Tahmini uygulama süresi" }
                    },
                    required: ["priority", "title", "description", "action_plan", "expected_outcome"]
                  }
                },
                quarterly_analysis: {
                  type: "object",
                  description: "Çeyreklik detaylı analiz",
                  properties: {
                    overview: { type: "string", description: "Genel çeyreklik performans özeti (2-3 cümle)" },
                    critical_periods: { 
                      type: "array", 
                      items: { 
                        type: "object", 
                        properties: { 
                          quarter: { type: "string", description: "Q1, Q2, Q3 veya Q4" }, 
                          reason: { type: "string", description: "Bu çeyreğin neden kritik olduğu" }, 
                          risk_level: { type: "string", enum: ["high", "medium", "low"] }
                        },
                        required: ["quarter", "reason", "risk_level"]
                      },
                      description: "Dikkat edilmesi gereken kritik dönemler"
                    },
                    seasonal_trends: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Tespit edilen mevsimsel trendler ve paternler"
                    },
                    cash_burn_warning: { type: "string", description: "Nakit yakma hızı uyarısı (varsa)" },
                    growth_trajectory: { type: "string", description: "Büyüme eğilimi yorumu: Lineer, Eksponansiyel, Durgun veya Düşüş" },
                    winner_by_quarter: { 
                      type: "object", 
                      properties: { 
                        q1: { type: "string", description: "Q1'de hangi senaryo daha iyi ve neden" }, 
                        q2: { type: "string", description: "Q2'de hangi senaryo daha iyi ve neden" }, 
                        q3: { type: "string", description: "Q3'te hangi senaryo daha iyi ve neden" }, 
                        q4: { type: "string", description: "Q4'te hangi senaryo daha iyi ve neden" }
                      },
                      description: "Her çeyrekte hangi senaryonun daha avantajlı olduğu"
                    }
                  },
                  required: ["overview", "critical_periods", "seasonal_trends", "growth_trajectory"]
                }
              },
              required: ["insights", "recommendations", "quarterly_analysis"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_scenario_analysis" } }
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

    // Fallback: try to extract from content if tool call didn't work
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log("Tool call failed, content received:", content.substring(0, 200));
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("analyze-scenarios error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
