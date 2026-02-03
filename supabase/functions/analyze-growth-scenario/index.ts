import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// BÜYÜME ANALİZİ PROMPT - DENGELİ ANALİZ + KANIT ZİNCİRİ
// =====================================================
const GROWTH_ANALYSIS_PROMPT = `Sen, şirketin büyüme stratejisti ve finansal analistsin.

🎯 GÖREV: İki farklı yıla ait senaryo verisini analiz edip DENGELI büyüme analizi üret.

📊 ANALİZ PRENSİPLERİ:
1. FIRSAT ANALİZİ: Büyüme potansiyeli ve momentum analizi
2. RİSK ANALİZİ: Hedeflere ulaşamama senaryoları ve etkileri
3. KANIT ZİNCİRİ: Her içgörü veri noktasına dayanmalı
4. GÜVEN SKORU: Veri kalitesine göre 0-100 arası skor

⚠️ KANIT ZİNCİRİ KURALI (ZORUNLU):
Her insight için mutlaka belirt:
- KAYNAK VERİ: Hangi metriklere dayandığı
- VARSAYIMLAR: Yapılan varsayımlar
- SINIRLAMALAR: Analizin sınırları

📊 GÜVEN SKORU HESAPLAMA:
- 90-100%: Doğrudan veri hesabı (ör: "Gelir büyümesi = X%")
- 75-89%: Veriye dayalı çıkarım (ör: "Marj eğilimi devam ederse...")
- 60-74%: Mantıksal tahmin - "⚠️ TAHMİN:" etiketi ZORUNLU
- 50-59%: Düşük güven - "❓ DÜŞÜK GÜVEN:" etiketi ZORUNLU
- <50%: KULLANMA - belirsizlik çok yüksek

📥 VERİ PAKETİ:
- Baz Senaryo: Mevcut yıl verileri (gelir, gider, yatırım)
- Büyüme Senaryosu: Hedef yıl verileri

📤 ÇIKTI FORMATI (JSON):
{
  "growthInsights": [
    {
      "title": "Başlık",
      "description": "Açıklama (veri destekli)",
      "category": "revenue|expense|efficiency|opportunity|risk",
      "confidence": 60-100,
      "evidence": {
        "sourceData": "Hangi veri noktasına dayandığı",
        "assumptions": ["Varsayım 1", "Varsayım 2"],
        "limitations": "Bu analizin sınırları (opsiyonel)"
      }
    }
  ],
  "riskAnalysis": [
    {
      "risk": "Risk tanımı",
      "probability": "low|medium|high",
      "impact": "Etki açıklaması",
      "mitigation": "Azaltma stratejisi",
      "relatedOpportunity": "İlgili fırsat (opsiyonel)"
    }
  ],
  "projectRecommendations": [
    {
      "title": "Proje Adı veya Alan",
      "description": "Neden bu alana odaklanmalı",
      "expectedGrowth": 25
    }
  ],
  "roiInsights": [
    {
      "title": "ROI Analizi Başlığı",
      "description": "Yatırım getirisi açıklaması",
      "evidence": "Hesaplama dayanağı"
    }
  ],
  "milestones": [
    {
      "quarter": "Q1",
      "year": 2027,
      "title": "Milestone Başlığı",
      "description": "Ne yapılacak",
      "target": "$250K",
      "type": "revenue|product|team|market"
    }
  ],
  "milestoneRecommendations": [
    {
      "title": "Öneri Başlığı",
      "description": "Detaylı açıklama"
    }
  ],
  "dataQualityNote": "Veri kalitesi ve analiz sınırları hakkında kısa not"
}

⚖️ RİSK/FIRSAT DENGESİ KURALI:
- Her 2-3 fırsat için EN AZ 1 risk faktörü belirt
- Hedeflere ulaşılamama durumunda etkileri say
- "Yatırım alamazsak" yerine "Organik büyüme senaryosunda" kullan

⚠️ YASAKLAR:
❌ Kanıtsız iddialar (sourceData olmadan insight yok)
❌ 90%+ güven skoru olmayan kesin ifadeler
❌ Varsayımsız tahminler
❌ Uydurma pazar verileri veya rakipler
❌ Varsayımsal dış veriler

✅ KULLAN:
✅ "Baz yıl" ve "Büyüme yılı" ifadeleri
✅ "Organik büyüme senaryosu" (yatırımsız durum için)
✅ "Risk faktörü" (olumsuzluklar için)
✅ Kanıt zinciri ile desteklenmiş içgörüler
✅ Güven skorları
✅ Somut rakamlar ($X, %Y formatında)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseScenario, growthScenario } = await req.json();

    if (!baseScenario || !growthScenario) {
      return new Response(
        JSON.stringify({ error: "Baz ve büyüme senaryoları gereklidir" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Senaryo verilerini hazırla
    const baseRevenue = baseScenario.revenues?.reduce((sum: number, r: any) => sum + (r.projectedAmount || 0), 0) || 0;
    const growthRevenue = growthScenario.revenues?.reduce((sum: number, r: any) => sum + (r.projectedAmount || 0), 0) || 0;
    
    const baseExpense = baseScenario.expenses?.reduce((sum: number, e: any) => sum + (e.projectedAmount || 0), 0) || 0;
    const growthExpense = growthScenario.expenses?.reduce((sum: number, e: any) => sum + (e.projectedAmount || 0), 0) || 0;

    const dataContext = `
## BAZ SENARYO: ${baseScenario.name} (${baseScenario.targetYear})
- Toplam Gelir: $${baseRevenue.toLocaleString()}
- Toplam Gider: $${baseExpense.toLocaleString()}
- Net Kâr: $${(baseRevenue - baseExpense).toLocaleString()}
- Gelir Kalemleri: ${JSON.stringify(baseScenario.revenues?.map((r: any) => ({ category: r.category, amount: r.projectedAmount })) || [])}
- Gider Kalemleri: ${JSON.stringify(baseScenario.expenses?.map((e: any) => ({ category: e.category, amount: e.projectedAmount })) || [])}

## BÜYÜME SENARYOSU: ${growthScenario.name} (${growthScenario.targetYear})
- Toplam Gelir: $${growthRevenue.toLocaleString()}
- Toplam Gider: $${growthExpense.toLocaleString()}
- Net Kâr: $${(growthRevenue - growthExpense).toLocaleString()}
- Gelir Kalemleri: ${JSON.stringify(growthScenario.revenues?.map((r: any) => ({ category: r.category, amount: r.projectedAmount })) || [])}
- Gider Kalemleri: ${JSON.stringify(growthScenario.expenses?.map((e: any) => ({ category: e.category, amount: e.projectedAmount })) || [])}

## HESAPLANAN METRİKLER
- Gelir Büyümesi: ${baseRevenue > 0 ? (((growthRevenue - baseRevenue) / baseRevenue) * 100).toFixed(1) : 0}%
- Gider Büyümesi: ${baseExpense > 0 ? (((growthExpense - baseExpense) / baseExpense) * 100).toFixed(1) : 0}%
- Kâr Değişimi: $${(growthRevenue - growthExpense - (baseRevenue - baseExpense)).toLocaleString()}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: GROWTH_ANALYSIS_PROMPT },
          { role: "user", content: dataContext },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı, lütfen bekleyin" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredi yetersiz, lütfen bakiye ekleyin" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // JSON'u parse et
    let analysis: any;
    try {
      // Markdown code block varsa temizle
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      
      // Fallback analiz
      const growthRate = baseRevenue > 0 ? (((growthRevenue - baseRevenue) / baseRevenue) * 100).toFixed(1) : 0;
      analysis = {
        growthInsights: [
          {
            title: "Genel Büyüme Trendi",
            description: `${baseScenario.targetYear}'den ${growthScenario.targetYear}'e geçişte %${growthRate} gelir büyümesi hedefleniyor.`,
            category: "revenue",
            confidence: 90,
            evidence: {
              sourceData: `Baz gelir: $${baseRevenue.toLocaleString()}, Hedef gelir: $${growthRevenue.toLocaleString()}`,
              assumptions: ["Gelir projeksiyonları gerçekleşecek"],
              limitations: "AI analizi yapılamadı, temel hesaplama kullanıldı"
            }
          }
        ],
        riskAnalysis: [
          {
            risk: "Büyüme hedeflerine ulaşamama riski",
            probability: "medium",
            impact: "Organik büyüme senaryosunda daha düşük değerleme",
            mitigation: "Milestone bazlı ilerleme takibi ve erken uyarı sistemleri"
          }
        ],
        projectRecommendations: [],
        roiInsights: [],
        milestones: [],
        milestoneRecommendations: [],
        dataQualityNote: "AI analizi yapılamadı, temel hesaplama kullanıldı"
      };
    }

    return new Response(
      JSON.stringify({ 
        analysis,
        analysisId: `growth-${Date.now()}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Growth analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
