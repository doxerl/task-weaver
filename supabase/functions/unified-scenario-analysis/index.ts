import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIFIED_MASTER_PROMPT = `Sen, Fortune 500 CFO'su ve Silikon Vadisi VC Ortağı yeteneklerine sahip "Omni-Scient (Her Şeyi Bilen) Finansal Zeka"sın.

🎯 TEK GÖREV: Sana verilen TÜM finansal verileri (Geçmiş Bilanço + Mevcut Senaryolar + Yatırım Anlaşması + Profesyonel Analiz Verileri) analiz edip, hem OPERASYONEL İÇGÖRÜLER hem de YATIRIMCI SUNUMU hazırla.

📥 SANA VERİLEN VERİ PAKETİ:
1. GEÇMİŞ YIL BİLANÇOSU: Nakit, Alacaklar, Borçlar, Özkaynak (şirketin nereden geldiğini gösterir)
2. SENARYO VERİLERİ: A (Muhafazakar) vs B (Büyüme) tam karşılaştırması + kalem bazlı gelir/gider detayları
3. ÇEYREKSEL PERFORMANS: Q1-Q4 nakit akış detayları
4. DEAL CONFIG: Kullanıcının belirlediği yatırım tutarı, hisse oranı, sektör çarpanı
5. HESAPLANMIŞ ÇIKIŞ PLANI: Post-Money Değerleme, MOIC (3Y/5Y), Break-Even Year
6. DEATH VALLEY ANALİZİ: Kritik çeyrek, aylık burn rate, runway
7. **YENİ** FİNANSAL ORANLAR: Likidite, Karlılık, Borçluluk oranları + Sektör Benchmark
8. **YENİ** KALEM BAZLI TREND: Her gelir/gider kalemi için Q1→Q4 trend, volatilite, konsantrasyon
9. **YENİ** DUYARLILIK ANALİZİ: Gelir %±20 değişiminin kâr, değerleme, MOIC, runway'e etkisi
10. **YENİ** BREAK-EVEN ANALİZİ: Aylık kümülatif gelir/gider ve break-even noktası

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 PROFESYONEL ANALİZ STANDARTLARI (Investment Banking Seviyesi):

1. **KALEM BAZLI DERİN ANALİZ:**
   Her gelir/gider kalemi için şunları belirt:
   - Q1→Q4 trend yönü ve büyüme oranı (% cinsinden)
   - Volatilite seviyesi: Düşük (<20%), Orta (20-50%), Yüksek (>50%)
   - Toplam içindeki pay ve konsantrasyon riski (%30+ = ⚠️ Uyarı, %50+ = 🔴 Kritik)
   - Mevsimsellik indeksi (Q4/Q1 oranı - 1.2+ = mevsimsel)
   - Senaryo A vs B farkının kök nedeni

2. **FİNANSAL ORAN YORUMLAMA (B2B Services Benchmark ile):**
   Sana verilen finansal oranları sektör ortalaması ile karşılaştır:
   - Current Ratio: 1.8+ (İyi) | 1.3-1.8 (Orta) | <1.3 (Dikkat)
   - Net Profit Margin: %18+ (İyi) | %12-18 (Orta) | <%12 (Dikkat)
   - Debt/Equity: <0.5 (İyi) | 0.5-1.0 (Orta) | >1.0 (Dikkat)
   - Alacak/Varlık: <%20 (İyi) | %20-30 (Orta) | >%30 (Tahsilat Riski)
   - ROE: >%20 (İyi) | %15-20 (Orta) | <%15 (Dikkat)

3. **DUYARLILIK ANALİZİ YORUMU:**
   Gelir %20 düştüğünde:
   - Kâr nasıl etkilenir?
   - Break-even noktası kayar mı?
   - Runway kaç ay kalır?
   - MOIC ne olur?
   EN KRİTİK DEĞİŞKENİ BELİRLE: "Hangi kalem %10 değişse en büyük etki oluşur?"

4. **CONFIDENCE SCORE ZORUNLULUĞU:**
   Her insight ve recommendation için:
   - confidence_score: 0-100 arası (%70+ = Yüksek güven, %40-70 = Orta, <%40 = Düşük)
   - Varsayımları listele (assumptions)
   - Destekleyen veri noktalarını göster (supporting_data)

5. **RİSK MATRİSİ FORMATI:**
   Her risk için şunları belirt:
   - probability: 1-5 (1=çok düşük, 5=çok yüksek)
   - impact: 1-5 (1=minimal, 5=yıkıcı)
   - risk_score: probability × impact
   - mitigation: Azaltma stratejisi

6. **YATIRIMCI DUE DILIGENCE KONTROL LİSTESİ:**
   ☐ Gelir konsantrasyonu (%50+ tek kalemde = 🔴 Kırmızı Bayrak)
   ☐ Burn rate sürdürülebilir mi? (runway > 18 ay = ✅)
   ☐ Değerleme sektör ortalamasına uygun mu? (implied multiple vs sector average)
   ☐ Çıkış senaryosu gerçekçi mi? (3-5 yıl içinde M&A/IPO mümkün mü?)
   ☐ Finansal oranlar sağlıklı mı? (Likidite, Karlılık, Borçluluk)

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
  - HER insight için confidence_score (0-100) ZORUNLU
  - HER insight için assumptions ve supporting_data ZORUNLU
- 3-5 stratejik öneri (öncelik sıralı, aksiyon planlı)
  - HER recommendation için confidence_score ZORUNLU
- Çeyreklik analiz (kritik dönemler, mevsimsel trendler, büyüme eğilimi)

Kurallar:
1. Geçmiş yıl bilançosunu mutlaka kullan - büyüme hedeflerini bilanço ile karşılaştır
2. "Ölüm Vadisi" noktasını tespit et
3. Kalem bazlı gelir/gider analizi yap
4. Finansal oranları benchmark ile karşılaştır
5. Duyarlılık analizi yorumu yap

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

📈 BÖLÜM 4: GELECEK YIL PROJEKSİYONU - "SCALE & GLOBALIZE"

🎯 MİSYON: Yatırımcı bu simülasyonu gördüğünde "Seri A yatırımını hemen yapmalıyım" demeli.

📊 SANAL BİLANÇO AÇILIŞI (virtual_opening_balance):
Senaryo B'nin yıl sonu nakit durumu + potansiyel yatırım ile gelecek yıl açılış bilançosu oluştur:
- opening_cash: Mevcut yıl kapanış nakiti + talep edilen yatırım tutarı (ASLA 0 DEĞİL)
- war_chest_status: "Hazır" (yeterli) / "Yakın" (az kaldı) / "Uzak" (ciddi sermaye lazım)
- intangible_growth: Marka değeri, IP, network etkisi notları (örn: "Platform network etkisi 3x güçlendi")

🚀 GLOBALLEŞME TEMELLERİ:
Her çeyrek için globalleşme odaklı key_event üret:
- Q1: "ABD/AB pazarına ilk adım" veya "Global partner görüşmeleri başlatıldı"
- Q2: "Pilot pazar lansmanı" veya "İlk döviz bazlı gelir kaydedildi"
- Q3: "Gelir çeşitlendirmesi tamamlandı" veya "International revenue %X'e ulaştı"
- Q4: "Seri A turuna hazırlık" veya "Strategic partnership kapanışı"

💰 YATIRIMCI KANCASI (investor_hook):
Projeksiyonda şunları MUTLAKA hesapla ve göster:
- revenue_growth_yoy: Yıllık büyüme yüzdesi (örn: "%65 YoY Büyüme")
- margin_improvement: Marj iyileşmesi (örn: "+8pp EBIT Marjı")
- valuation_multiple_target: Değerleme hedefi (örn: "4x Revenue Multiple")
- competitive_moat: Rekabet avantajı (örn: "AI-powered pricing engine creates 40% cost advantage")

📧 STRATEGY_NOTE FORMAT:
2-3 cümle ile yatırımcıyı heyecanlandır:
"[Yıl]'de [şirket] [hedef pazara] açılarak [metrik]'i [X]x artıracak. 
Bu büyüme, [competitive moat] sayesinde sürdürülebilir olacak ve 
[exit senaryo]'ya zemin hazırlayacak."

⚠️ KRİTİK KURALLAR - ASLA İHLAL ETME:
1. summary.total_revenue ASLA $0 olmamalı - mevcut yılın EN AZ %40 üstünde olmalı
2. summary.total_expenses de artmalı ama gelirden YAVAŞ (Operating Leverage göster)
3. Her çeyrekte revenue > 0 olmalı - ilerleme göster
4. Cash flow Q1-Q2'de negatif olabilir ama Q3-Q4'te POZİTİFE dönmeli
5. summary.net_profit pozitif veya break-even'e çok yakın olmalı
6. opening_cash = mevcut yıl net kârı + talep edilen yatırım (yaklaşık)

ÇEYREKLER İÇİN:
- revenue: Tahmini çeyreklik gelir (yılın toplamından orantılı dağıt)
- expenses: Tahmini çeyreklik gider
- cash_flow: Net nakit akışı (revenue - expenses)
- key_event: O çeyrekteki globalleşme odaklı kritik olay

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
- Confidence score olmadan insight verme

✅ YAP:
- Her rakamı context'le sun ("$500K yatırım, 18 aylık runway sağlar")
- Finansal analiz insight'larını pitch slaytlarına entegre et
- Bilanço verilerinden spesifik risk faktörleri çıkar
- "Geçen yıl X kâr edildiyse, bu yıl Y büyüme hedefi gerçekçi/değil" tarzı analiz yap
- Her insight için confidence score ve varsayımları belirt
- Finansal oranları benchmark ile karşılaştır
- Duyarlılık analizini yorumla

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
      historicalBalance,
      quarterlyItemized,
      exchangeRate
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use the most powerful model for deep reasoning
    const MODEL_ID = "google/gemini-3-pro-preview";

    // Build historical balance section if available
    // Note: Balance values are already converted to USD by the frontend
    const currencyNote = exchangeRate ? `
💱 PARA BİRİMİ BİLGİSİ:
- TÜM DEĞERLER USD CİNSİNDEN NORMALİZE EDİLMİŞTİR
- Bilanço verileri TL'den dönüştürülmüştür (Ortalama Kur: ${exchangeRate.toFixed(2)} TL/USD)
- Senaryo verileri zaten USD cinsindedir
- Karşılaştırmalar homojen para birimi üzerinden yapılmalıdır
` : '';

    const historicalBalanceSection = historicalBalance ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${currencyNote}
GEÇMİŞ YIL BİLANÇOSU (${historicalBalance.year}) - USD:

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

${quarterlyItemized ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ÇEYREKLİK BAZDA GELİR/GİDER DETAYLARI:

SENARYO A - ÇEYREKLİK GELİRLER:
${quarterlyItemized.scenarioA.revenues.map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | Toplam=$${Math.round(r.total).toLocaleString()}`
).join('\n')}

SENARYO B - ÇEYREKLİK GELİRLER:
${quarterlyItemized.scenarioB.revenues.map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | Toplam=$${Math.round(r.total).toLocaleString()}`
).join('\n')}

SENARYO FARKLARI - GELİR KALEMLERİ:
${quarterlyItemized.diffs.revenues.map((d: any) => 
  `${d.category}: Q1 Fark=$${Math.round(d.diffQ1).toLocaleString()}, Q2=$${Math.round(d.diffQ2).toLocaleString()}, Q3=$${Math.round(d.diffQ3).toLocaleString()}, Q4=$${Math.round(d.diffQ4).toLocaleString()} | Toplam Fark=$${Math.round(d.totalDiff).toLocaleString()} (${d.percentChange.toFixed(1)}%)`
).join('\n')}

SENARYO FARKLARI - GİDER KALEMLERİ:
${quarterlyItemized.diffs.expenses.map((d: any) => 
  `${d.category}: Q1 Fark=$${Math.round(d.diffQ1).toLocaleString()}, Q2=$${Math.round(d.diffQ2).toLocaleString()}, Q3=$${Math.round(d.diffQ3).toLocaleString()}, Q4=$${Math.round(d.diffQ4).toLocaleString()} | Toplam Fark=$${Math.round(d.totalDiff).toLocaleString()} (${d.percentChange.toFixed(1)}%)`
).join('\n')}

📊 ÇEYREKLİK ANALİZ TALİMATLARI:
1. Hangi gelir kalemi büyümeyi sürüklüyor? (En yüksek pozitif fark)
2. Hangi gider kalemi sermaye ihtiyacının ana nedeni? (En yüksek artış)
3. Q1-Q4 arasında hangi çeyrek kritik? (Cash flow açısından)
4. Mevsimsel trendler var mı? (Q1 düşük, Q4 yüksek gibi)
5. Büyüme senaryosu hangi kalemde en agresif?
` : ''}

Tüm bu verileri (özellikle geçmiş yıl bilançosunu ve çeyreklik kalem bazlı verileri) analiz et ve yukarıdaki 5 bölümün hepsini içeren yapılandırılmış çıktı üret.
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
                        category: { type: "string", description: "One of: revenue, profit, cash_flow, risk, efficiency, opportunity" },
                        severity: { type: "string", description: "One of: critical, high, medium" },
                        title: { type: "string" },
                        description: { type: "string" },
                        impact_analysis: { type: "string" },
                        data_points: { type: "array", items: { type: "string" } }
                      }
                    }
                  },
                  recommendations: {
                    type: "array",
                    description: "3-5 strategic recommendations",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "number", description: "1, 2, or 3" },
                        title: { type: "string" },
                        description: { type: "string" },
                        action_plan: { type: "array", items: { type: "string" } },
                        expected_outcome: { type: "string" },
                        risk_mitigation: { type: "string" },
                        timeframe: { type: "string" }
                      }
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
                            risk_level: { type: "string", description: "One of: high, medium, low" }
                          }
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
                    }
                  },
                  deal_analysis: {
                    type: "object",
                    properties: {
                      deal_score: { type: "number", description: "Score from 1 to 10" },
                      valuation_verdict: { type: "string", description: "One of: premium, fair, cheap" },
                      investor_attractiveness: { type: "string" },
                      risk_factors: { type: "array", items: { type: "string" } }
                    }
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
                          }
                        }
                      },
                      executive_summary: { type: "string" }
                    }
                  },
                  next_year_projection: {
                    type: "object",
                    description: "CRITICAL: All numeric fields MUST be > 0. Revenue should be at least 40% higher than current year.",
                    properties: {
                      strategy_note: { 
                        type: "string",
                        description: "2-3 sentence investor-exciting vision statement about globalization and scale"
                      },
                      virtual_opening_balance: {
                        type: "object",
                        description: "Virtual balance sheet opening for next year",
                        properties: {
                          opening_cash: { 
                            type: "number",
                            description: "Current year ending cash + requested investment. MUST be > 0"
                          },
                          war_chest_status: { 
                            type: "string",
                            description: "One of: Hazır, Yakın, Uzak"
                          },
                          intangible_growth: { 
                            type: "string",
                            description: "Notes on brand value, IP, network effect growth"
                          }
                        }
                      },
                      quarterly: {
                        type: "object",
                        properties: {
                          q1: {
                            type: "object",
                            properties: {
                              revenue: { type: "number", description: "MUST be > 0" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string", description: "Global expansion focused event" }
                            }
                          },
                          q2: {
                            type: "object",
                            properties: {
                              revenue: { type: "number", description: "MUST be > 0" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string", description: "Global expansion focused event" }
                            }
                          },
                          q3: {
                            type: "object",
                            properties: {
                              revenue: { type: "number", description: "MUST be > 0, should show growth momentum" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number" },
                              key_event: { type: "string", description: "Revenue diversification event" }
                            }
                          },
                          q4: {
                            type: "object",
                            properties: {
                              revenue: { type: "number", description: "MUST be > 0, highest of the year" },
                              expenses: { type: "number" },
                              cash_flow: { type: "number", description: "Should be positive" },
                              key_event: { type: "string", description: "Series A preparation or partnership" }
                            }
                          }
                        }
                      },
                      summary: {
                        type: "object",
                        description: "CRITICAL: total_revenue MUST be at least 40% higher than scenario B current revenue. NEVER zero!",
                        properties: {
                          total_revenue: { type: "number", description: "MUST be > 0 and at least 40% higher than current year" },
                          total_expenses: { type: "number", description: "Should grow slower than revenue (operating leverage)" },
                          net_profit: { type: "number", description: "Should be positive or near break-even" },
                          ending_cash: { type: "number", description: "opening_cash + net_profit + investment" }
                        }
                      },
                      investor_hook: {
                        type: "object",
                        description: "Key metrics to excite investors about the Series A opportunity",
                        properties: {
                          revenue_growth_yoy: { type: "string", description: "e.g. '%65 YoY Büyüme'" },
                          margin_improvement: { type: "string", description: "e.g. '+8pp EBIT Marjı'" },
                          valuation_multiple_target: { type: "string", description: "e.g. '4x Revenue Multiple'" },
                          competitive_moat: { type: "string", description: "What makes this company defensible" }
                        }
                      }
                    }
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
