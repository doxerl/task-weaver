import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIFIED_MASTER_PROMPT = `Sen, Fortune 500 CFO'su ve Silikon Vadisi VC Ortağı yeteneklerine sahip "Omni-Scient (Her Şeyi Bilen) Finansal Zeka"sın.

🎯 TEK GÖREV: Sana verilen TÜM finansal verileri (Geçmiş Bilanço + Mevcut Senaryolar + Yatırım Anlaşması) analiz edip, hem OPERASYONEL İÇGÖRÜLER hem de YATIRIMCI SUNUMU hazırla.

📥 SANA VERİLEN VERİ PAKETİ:
1. GEÇMİŞ YIL BİLANÇOSU: Nakit, Alacaklar, Borçlar, Özkaynak (şirketin nereden geldiğini gösterir)
2. SENARYO VERİLERİ: A (Muhafazakar) vs B (Büyüme) tam karşılaştırması + kalem bazlı gelir/gider detayları
3. ÇEYREKSEL PERFORMANS: Q1-Q4 nakit akış detayları
4. DEAL CONFIG: Kullanıcının belirlediği yatırım tutarı, hisse oranı, sektör çarpanı
5. HESAPLANMIŞ ÇIKIŞ PLANI: Post-Money Değerleme, MOIC (3Y/5Y), Break-Even Year
6. DEATH VALLEY ANALİZİ: Kritik çeyrek, aylık burn rate, runway

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🕵️‍♂️ DERİN ANALİZ KATMANLARI (OMNI-SCIENT CFO GÖREVLERİ):

1. **FİNANSAL ADLİ TIP (FORENSICS) - Bilançodan Hikaye Oku:**
   - Alacak Kalitesi: Ticari Alacaklar / Toplam Varlıklar oranı riskli mi? (%30+ = Kırmızı Bayrak)
   - Borçluluk: Banka Kredileri / Toplam Varlıklar oranı ne durumda?
   - Nakit Pozisyonu: Kasa + Banka yeterli runway sağlıyor mu?
   - Özkaynak: Geçmiş Yıllar Kârı negatifse "Kurtarma Modu" uyarısı ver
   - Büyüme Tutarlılığı: Geçmiş yıl kârıyla bu yılki projeksiyon uyumlu mu?

2. **BÜYÜME MOTORU ANALİZİ (REVENUE ENGINE):**
   - Her gelir kalemini analiz et - hangisi "Yıldız" (hızlı büyüyen)?
   - Hangi gelir kalemi "Yük" (kaynak tüketiyor ama büyümüyor)?
   - Yatırımın tam olarak hangi kalemi beslemesi gerektiğini söyle

3. **BURN EFFICIENCY ANALİZİ:**
   - Gider detaylarına bak - Pazarlama harcamasının ciroya dönüşümü makul mü?
   - Operating Leverage hesapla: (ΔRevenue / ΔExpense)
   - Burn Multiple hesapla: Net Burn / Net New ARR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 BÖLÜM 1: FİNANSAL ANALİZ (AI Analiz Sekmesi İçin)

Bu bölümde şu çıktıları üret:
- 5-7 kritik insight (kategori: revenue/profit/cash_flow/risk/efficiency/opportunity)
- 3-5 stratejik öneri (öncelik sıralı, aksiyon planlı)
- Çeyreklik analiz (kritik dönemler, mevsimsel trendler, büyüme eğilimi)

Kurallar:
1. Geçmiş yıl bilançosunu mutlaka kullan - büyüme hedeflerini bilanço ile karşılaştır
2. "Ölüm Vadisi" noktasını tespit et
3. Kalem bazlı gelir/gider analizi yap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 BÖLÜM 2: DEAL DEĞERLENDİRME (Yatırımcı Gözüyle)

Bu bölümde şu çıktıları üret:
- deal_score: 1-10 arası puan
- valuation_verdict: "premium" / "fair" / "cheap"
- investor_attractiveness: Yatırımcı gözüyle 2 cümlelik yorum
- risk_factors: Yatırımcı için ana 3-5 risk (bilanço bazlı riskleri dahil et)

Değerleme Kontrol Formülü:
- Post-Money / Revenue = Implied Multiple
- Eğer Implied Multiple > Sektör Ortalaması → "premium"
- Eğer Implied Multiple < Sektör Ortalaması → "cheap"
- Arada → "fair"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎤 BÖLÜM 3: PITCH DECK SLAYTLARI (Sunum İçin)

5 slayt üret, her slayt için:
- title: Çarpıcı başlık (max 8 kelime)
- key_message: Ana mesaj (tek cümle)
- content_bullets: 3-4 madde (kısa, net, rakamlı)
- speaker_notes: Sunumcunun söylemesi gereken konuşma metni (2-3 cümle)

Slayt Sırası:
1. THE HOOK: "Neden şimdi? Neden biz?"
2. DEATH VALLEY: "Yatırım almazsak ne olur?"
3. USE OF FUNDS: "Paranız nereye gidecek?"
4. THE MATH: "Paranızı kaça katlarız?"
5. THE EXIT: "Kim bizi satın alacak?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 BÖLÜM 4: GELECEK YIL PROJEKSİYONU (J-Curve Simülasyonu)

Yatırım alındıktan sonraki yılın çeyreklik verilerini üret:
- J-Curve Etkisi: Q1-Q2'de giderler artar (yatırım harcanır), gelir yavaş
- Büyüme İvmesi: Q3-Q4'te büyüme hızlanır, gelirler patlar
- Nakit Kontrolü: Yatırımla birlikte kasa asla eksiye düşmemeli

Her çeyrek için:
- revenue: Tahmini gelir
- expenses: Tahmini gider
- cash_flow: Net nakit akışı
- key_event: O çeyrekteki kritik olay

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 BÖLÜM 5: EXECUTIVE SUMMARY

Yatırımcıya gönderilecek intro e-postası için özet (max 150 kelime):
- Problem + Çözüm (1 cümle)
- Talep (1 cümle)
- Teklif (1 cümle)
- Sonuç (1 cümle: Neden bu fırsat kaçırılmamalı)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 YAPMA:
- Rakamsız genel cümleler kurma
- Bilançoyu görmezden gelme - bu en kritik veri kaynağı
- Geçmiş performansla uyumsuz projeksiyon hedeflerini kabul etme
- Tek bir bölümü atlama - HEPSİ zorunlu

✅ YAP:
- Her rakamı context'le sun ("$500K yatırım, 18 aylık runway sağlar")
- Finansal analiz insight'larını pitch slaytlarına entegre et
- Bilanço verilerinden spesifik risk faktörleri çıkar
- "Geçen yıl X kâr edildiyse, bu yıl Y büyüme hedefi gerçekçi/değil" tarzı analiz yap

DİL: Profesyonel Türkçe, VC terminolojisine hakim.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      scenarioA, 
      scenarioB, 
      metrics, 
      quarterly, 
      dealConfig, 
      exitPlan, 
      capitalNeeds,
      historicalBalance 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use the most powerful model for deep reasoning
    const MODEL_ID = "google/gemini-3-pro-preview";

    // Build historical balance section if available
    const historicalBalanceSection = historicalBalance ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEÇMİŞ YIL BİLANÇOSU (${historicalBalance.year}):

💰 NAKİT POZİSYONU:
- Kasa: $${(historicalBalance.cash_on_hand || 0).toLocaleString()}
- Banka: $${(historicalBalance.bank_balance || 0).toLocaleString()}
- Toplam Likit Varlık: $${((historicalBalance.cash_on_hand || 0) + (historicalBalance.bank_balance || 0)).toLocaleString()}

📊 ALACAK/BORÇ DURUMU:
- Ticari Alacaklar: $${(historicalBalance.trade_receivables || 0).toLocaleString()}
- Ticari Borçlar: $${(historicalBalance.trade_payables || 0).toLocaleString()}
- Net Çalışma Sermayesi: $${((historicalBalance.trade_receivables || 0) - (historicalBalance.trade_payables || 0)).toLocaleString()}

🏢 VARLIK/YÜKÜMLÜLÜK:
- Toplam Varlıklar: $${(historicalBalance.total_assets || 0).toLocaleString()}
- Toplam Yükümlülükler: $${(historicalBalance.total_liabilities || 0).toLocaleString()}
- Toplam Özkaynak: $${(historicalBalance.total_equity || 0).toLocaleString()}

📈 KAR/SERMAYE:
- Dönem Net Kârı: $${(historicalBalance.current_profit || 0).toLocaleString()}
- Geçmiş Yıllar Kârı: $${(historicalBalance.retained_earnings || 0).toLocaleString()}
- Ödenmiş Sermaye: $${(historicalBalance.paid_capital || 0).toLocaleString()}
- Banka Kredileri: $${(historicalBalance.bank_loans || 0).toLocaleString()}

🔍 BU VERİYİ ŞÖYLE KULLAN:
1. Alacak/Toplam Varlık oranı ${((historicalBalance.trade_receivables || 0) / (historicalBalance.total_assets || 1) * 100).toFixed(1)}% - %30'dan yüksekse tahsilat sorunu var
2. Banka Kredisi/Varlık oranı ${((historicalBalance.bank_loans || 0) / (historicalBalance.total_assets || 1) * 100).toFixed(1)}% - borçluluk riski analiz et
3. Geçmiş Yıllar Kârı ${(historicalBalance.retained_earnings || 0) < 0 ? 'NEGATİF - Kurtarma Modu' : 'POZİTİF - Sağlıklı'}
4. Bu yılki büyüme hedeflerini geçmiş yıl performansıyla karşılaştır
` : `

⚠️ GEÇMİŞ YIL BİLANÇOSU MEVCUT DEĞİL
Analizi sadece senaryo verileriyle yap, ancak bilanço verisi olmadan tam risk analizi yapılamayacağını belirt.
`;

    const userPrompt = `
${historicalBalanceSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SENARYO VERİLERİ:

SENARYO A (${scenarioA.name}):
- Hedef Yıl: ${scenarioA.targetYear}
- Toplam Gelir: $${metrics.scenarioA.totalRevenue.toLocaleString()}
- Toplam Gider: $${metrics.scenarioA.totalExpenses.toLocaleString()}
- Net Kâr: $${metrics.scenarioA.netProfit.toLocaleString()}
- Kâr Marjı: %${metrics.scenarioA.profitMargin.toFixed(1)}
- Çeyreklik Net: Q1: $${quarterly.a.q1.toLocaleString()}, Q2: $${quarterly.a.q2.toLocaleString()}, Q3: $${quarterly.a.q3.toLocaleString()}, Q4: $${quarterly.a.q4.toLocaleString()}

SENARYO B (${scenarioB.name}):
- Hedef Yıl: ${scenarioB.targetYear}
- Toplam Gelir: $${metrics.scenarioB.totalRevenue.toLocaleString()}
- Toplam Gider: $${metrics.scenarioB.totalExpenses.toLocaleString()}
- Net Kâr: $${metrics.scenarioB.netProfit.toLocaleString()}
- Kâr Marjı: %${metrics.scenarioB.profitMargin.toFixed(1)}
- Çeyreklik Net: Q1: $${quarterly.b.q1.toLocaleString()}, Q2: $${quarterly.b.q2.toLocaleString()}, Q3: $${quarterly.b.q3.toLocaleString()}, Q4: $${quarterly.b.q4.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEAL CONFIG (Kullanıcı Girişi):
- Talep Edilen Yatırım: $${dealConfig.investmentAmount.toLocaleString()}
- Teklif Edilen Hisse: %${dealConfig.equityPercentage}
- Sektör Çarpanı: ${dealConfig.sectorMultiple}x
- Güvenlik Marjı: %${dealConfig.safetyMargin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HESAPLANMIŞ EXIT PLANI:
- Post-Money Değerleme: $${exitPlan.postMoneyValuation.toLocaleString()}
- 3. Yıl Yatırımcı Payı: $${exitPlan.investorShare3Year.toLocaleString()}
- 5. Yıl Yatırımcı Payı: $${exitPlan.investorShare5Year.toLocaleString()}
- MOIC (3 Yıl): ${exitPlan.moic3Year.toFixed(2)}x
- MOIC (5 Yıl): ${exitPlan.moic5Year.toFixed(2)}x
- Break-Even Yılı: ${exitPlan.breakEvenYear || 'Belirsiz'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEATH VALLEY ANALİZİ:
- Kritik Çeyrek: ${capitalNeeds.criticalQuarter}
- Minimum Kümülatif Nakit: $${capitalNeeds.minCumulativeCash.toLocaleString()}
- Hesaplanan Gereken Yatırım: $${capitalNeeds.requiredInvestment.toLocaleString()}
- Aylık Burn Rate: $${capitalNeeds.burnRateMonthly.toLocaleString()}
- Runway: ${capitalNeeds.runwayMonths} ay
- Kendi Kendini Finanse Edebilir mi: ${capitalNeeds.selfSustaining ? 'Evet' : 'Hayır'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GELİR/GİDER DETAYLARI:

Senaryo A Gelirleri:
${scenarioA.revenues.map((r: { category: string; projectedAmount: number }) => `- ${r.category}: $${r.projectedAmount.toLocaleString()}`).join('\n')}

Senaryo A Giderleri:
${scenarioA.expenses.map((e: { category: string; projectedAmount: number }) => `- ${e.category}: $${e.projectedAmount.toLocaleString()}`).join('\n')}

Senaryo B Gelirleri:
${scenarioB.revenues.map((r: { category: string; projectedAmount: number }) => `- ${r.category}: $${r.projectedAmount.toLocaleString()}`).join('\n')}

Senaryo B Giderleri:
${scenarioB.expenses.map((e: { category: string; projectedAmount: number }) => `- ${e.category}: $${e.projectedAmount.toLocaleString()}`).join('\n')}

Tüm bu verileri (özellikle geçmiş yıl bilançosunu) analiz et ve yukarıdaki 5 bölümün hepsini içeren yapılandırılmış çıktı üret.
`;

    console.log("Calling Lovable AI with Pro model for unified analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: UNIFIED_MASTER_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_unified_analysis",
              description: "Generate comprehensive unified analysis with all 5 sections",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    description: "5-7 critical financial insights",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["revenue", "profit", "cash_flow", "risk", "efficiency", "opportunity"] },
                        severity: { type: "string", enum: ["critical", "high", "medium"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        impact_analysis: { type: "string" },
                        data_points: { type: "array", items: { type: "string" } }
                      },
                      required: ["category", "severity", "title", "description", "impact_analysis"]
                    }
                  },
                  recommendations: {
                    type: "array",
                    description: "3-5 strategic recommendations",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "number", enum: [1, 2, 3] },
                        title: { type: "string" },
                        description: { type: "string" },
                        action_plan: { type: "array", items: { type: "string" } },
                        expected_outcome: { type: "string" },
                        risk_mitigation: { type: "string" },
                        timeframe: { type: "string" }
                      },
                      required: ["priority", "title", "description", "action_plan", "expected_outcome"]
                    }
                  },
                  quarterly_analysis: {
                    type: "object",
                    properties: {
                      overview: { type: "string" },
                      critical_periods: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            quarter: { type: "string" },
                            reason: { type: "string" },
                            risk_level: { type: "string", enum: ["high", "medium", "low"] }
                          },
                          required: ["quarter", "reason"]
                        }
                      },
                      seasonal_trends: { type: "array", items: { type: "string" } },
                      cash_burn_warning: { type: "string" },
                      growth_trajectory: { type: "string" },
                      winner_by_quarter: {
                        type: "object",
                        properties: {
                          q1: { type: "string" },
                          q2: { type: "string" },
                          q3: { type: "string" },
                          q4: { type: "string" }
                        }
                      }
                    },
                    required: ["overview", "critical_periods", "seasonal_trends", "growth_trajectory"]
                  },
                  deal_analysis: {
                    type: "object",
                    properties: {
                      deal_score: { type: "number", minimum: 1, maximum: 10 },
                      valuation_verdict: { type: "string", enum: ["premium", "fair", "cheap"] },
                      investor_attractiveness: { type: "string" },
                      risk_factors: { type: "array", items: { type: "string" } }
                    },
                    required: ["deal_score", "valuation_verdict", "investor_attractiveness", "risk_factors"]
                  },
                  pitch_deck: {
                    type: "object",
                    properties: {
                      slides: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            slide_number: { type: "number" },
                            title: { type: "string" },
                            key_message: { type: "string" },
                            content_bullets: { type: "array", items: { type: "string" } },
                            speaker_notes: { type: "string" }
                          },
                          required: ["slide_number", "title", "key_message", "content_bullets", "speaker_notes"]
                        }
                      },
                      executive_summary: { type: "string" }
                    },
                    required: ["slides", "executive_summary"]
                  },
                  next_year_projection: {
                    type: "object",
                    properties: {
                      strategy_note: { type: "string" },
                      quarterly: {
                        type: "object",
                        properties: {
                          q1: {
                            type: "object",
                            properties: {
                              revenue: { type: "number" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string" }
                            },
                            required: ["revenue", "expenses", "cash_flow", "key_event"]
                          },
                          q2: {
                            type: "object",
                            properties: {
                              revenue: { type: "number" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string" }
                            },
                            required: ["revenue", "expenses", "cash_flow", "key_event"]
                          },
                          q3: {
                            type: "object",
                            properties: {
                              revenue: { type: "number" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string" }
                            },
                            required: ["revenue", "expenses", "cash_flow", "key_event"]
                          },
                          q4: {
                            type: "object",
                            properties: {
                              revenue: { type: "number" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string" }
                            },
                            required: ["revenue", "expenses", "cash_flow", "key_event"]
                          }
                        },
                        required: ["q1", "q2", "q3", "q4"]
                      },
                      summary: {
                        type: "object",
                        properties: {
                          total_revenue: { type: "number" },
                          total_expenses: { type: "number" },
                          net_profit: { type: "number" },
                          ending_cash: { type: "number" }
                        },
                        required: ["total_revenue", "total_expenses", "net_profit", "ending_cash"]
                      }
                    },
                    required: ["strategy_note", "quarterly", "summary"]
                  }
                },
                required: ["insights", "recommendations", "quarterly_analysis", "deal_analysis", "pitch_deck", "next_year_projection"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_unified_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received successfully");

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const analysisResult = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(analysisResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        console.error("Failed to parse content as JSON");
      }
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("Unified analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
