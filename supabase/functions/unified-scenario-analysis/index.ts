import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// ANTI-HALLUCINATION RULES - KRİTİK
// =====================================================
const ANTI_HALLUCINATION_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 HALÜSİNASYON YASAĞI - KRİTİK KURALLAR:

1. **SADECE VERİLEN VERİLERİ KULLAN:**
   - Coğrafi bölge (Kuzey Amerika, Avrupa, Asya vb.) ASLA tahmin etme
   - Pazar büyüklüğü rakamları UYDURMA
   - Sektör istatistikleri UYDURMA
   - Rakip şirket isimleri UYDURMA
   - Teknoloji entegrasyonları (SAP, Oracle vb.) UYDURMA
   - Yasal yapılar (Delaware C-Corp vb.) UYDURMA
   
2. **BİLMEDİĞİNİ İTİRAF ET:**
   - Veri yoksa "Bu bilgi mevcut verilerde yok" de
   - Tahmin yapman gerekiyorsa "Varsayım: ..." ile başla
   - "[Kullanıcı Girişi Gerekli]" ile eksik bilgileri işaretle
   
3. **KAYNAK GÖSTERİMİ ZORUNLU:**
   Her sayısal çıkarım için kaynak belirt:
   - "Bilanço verilerine göre: Current Ratio = X"
   - "Senaryo A projeksiyonuna göre: Gelir = $X"
   - "Deal config'e göre: Yatırım = $X"
   - "Hesaplanan: MOIC = X" (formül göster)
   
4. **KESİNLİKLE YASAK ÇIKARIMLAR:**
   ❌ "Pazar $X milyar büyüklüğünde" (harici veri yok)
   ❌ "Rakip şirket Y bunu yapıyor" (veri yok)
   ❌ "Sektör trendi Z yönünde" (veri yok)
   ❌ "Kuzey Amerika/Avrupa/Asya pazarı..." (coğrafya verisi yok)
   ❌ "Yatırımcılar genellikle..." (genel varsayım)
   ❌ "SAP/Oracle entegrasyonu..." (teknik veri yok)
   ❌ "Delaware C-Corp kurulumu..." (yasal veri yok)
   ❌ "$X milyar TAM/SAM/SOM" (pazar verisi yok)
   ❌ "McKinsey/Gartner raporuna göre..." (harici kaynak yok)

5. **İZİN VERİLEN ÇIKARIMLAR:**
   ✅ Verilen finansal oranlardan hesaplama
   ✅ Senaryo A vs B karşılaştırması (verilen verilerden)
   ✅ Çeyreklik trend analizi (Q1→Q4 verilen verilerden)
   ✅ Deal metrikleri (MOIC, IRR) hesabı (formülden)
   ✅ Break-even analizi (verilen verilerden)
   ✅ Kullanıcının girdiği proje açıklamalarına dayalı büyüme
   ✅ Bilanço + Senaryo verilerinden çapraz analiz

6. **CONFIDENCE SCORE KURALI (ZORUNLU):**
   Her insight ve recommendation için:
   - %90+: Direkt veri hesaplaması (örn: Current Ratio = Varlık/Borç)
   - %70-90: Veri bazlı çıkarım (örn: Burn rate → runway hesabı)
   - %50-70: Mantıksal tahmin (örn: "Senaryo A gerçekleşirse...")
   - <%50: KULLANMA - belirsizlik çok yüksek
`;

// =====================================================
// SENARYO KURALLARI
// =====================================================
const SCENARIO_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SENARYO KURALLARI (KESİN - DEĞİŞMEZ):

1. **SENARYO A = POZİTİF SENARYO (Her zaman):**
   - Net kârı daha yüksek olan senaryo
   - Büyüme hedeflerinin tuttuğu senaryo
   - "Hedef Senaryo" olarak referans al
   - Yatırımcıya gösterilecek ana senaryo

2. **SENARYO B = NEGATİF SENARYO (Her zaman):**
   - Net kârı daha düşük olan senaryo
   - Kötümser varsayımlar, düşük gelir
   - "Risk Senaryosu" olarak referans al
   - Downside risk değerlendirmesi için

3. **ANALİZ ODAĞI:**
   - Pozitif Senaryo (A) gerçekleşirse ne olur? → Ana hikaye
   - Negatif Senaryo (B) gerçekleşirse ne olur? → Risk analizi
   - Fark ne kadar? Risk ne kadar büyük? → Gap analizi

4. **GELECEK YIL PROJEKSİYON KURALI:**
   - Simülasyon Yılı +1 projeksiyonu HER ZAMAN Pozitif Senaryo (A) baz alınarak yapılır
   - Çünkü yatırımcı en iyi durumu görmek ister
   - Negatif senaryo sadece "downside risk" olarak sunulur
   - Projeksiyon = Senaryo A'nın %40-100 büyümesi
`;

// =====================================================
// ODAK PROJE KURALLARI
// =====================================================
const FOCUS_PROJECT_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ODAK PROJE ANALİZİ KURALLARI:

Kullanıcı bir "odak proje" belirttiyse, analizi bu projeye odakla:

1. **ODAK PROJE = Ana Büyüme Motoru:**
   - Bu proje yatırımın ana kullanım alanı
   - Büyüme projeksiyonlarının merkezi
   - Pitch deck'in ana hikayesi

2. **ANALİZ İÇERİĞİ:**
   - Mevcut gelir vs hedef gelir karşılaştırması
   - Büyüme için gerekli aksiyonlar (kullanıcı planından)
   - Yatırım dağılımı etkisi (ürün, pazarlama, personel, operasyon)
   - Riskler ve mitigasyon stratejileri

3. **PROJEKSİYON KURALI:**
   - Odak projenin büyümesi = Yatırımın ana kullanım alanı
   - Diğer projelerin büyümesi = Normal trend
   - Gider artışı = Yatırım dağılımına göre

4. **VERİ YOKSA:**
   - Kullanıcı odak proje belirtmediyse, en yüksek büyüme potansiyeli olan gelir kalemini seç
   - Senaryo A vs B arasındaki en büyük farkı yaratan kalemi belirle
`;

const UNIFIED_MASTER_PROMPT = `Sen, Fortune 500 CFO'su ve Silikon Vadisi VC Ortağı yeteneklerine sahip "Omni-Scient (Her Şeyi Bilen) Finansal Zeka"sın.

${ANTI_HALLUCINATION_RULES}

${SCENARIO_RULES}

${FOCUS_PROJECT_RULES}

🎯 TEK GÖREV: Sana verilen TÜM finansal verileri (Geçmiş Bilanço + Mevcut Senaryolar + Yatırım Anlaşması + Profesyonel Analiz Verileri) analiz edip, hem OPERASYONEL İÇGÖRÜLER hem de YATIRIMCI SUNUMU hazırla.

📥 SANA VERİLEN VERİ PAKETİ:
1. GEÇMİŞ YIL BİLANÇOSU: Nakit, Alacaklar, Borçlar, Özkaynak (şirketin nereden geldiğini gösterir)
2. SENARYO VERİLERİ: A (Pozitif) vs B (Negatif) tam karşılaştırması + kalem bazlı gelir/gider detayları
3. ÇEYREKSEL PERFORMANS: Q1-Q4 nakit akış detayları
4. DEAL CONFIG: Kullanıcının belirlediği yatırım tutarı, hisse oranı, sektör çarpanı
5. HESAPLANMIŞ ÇIKIŞ PLANI: Post-Money Değerleme, MOIC (3Y/5Y), Break-Even Year
6. DEATH VALLEY ANALİZİ: Kritik çeyrek, aylık burn rate, runway
7. FİNANSAL ORANLAR: Likidite, Karlılık, Borçluluk oranları + Sektör Benchmark
8. KALEM BAZLI TREND: Her gelir/gider kalemi için Q1→Q4 trend, volatilite, konsantrasyon
9. DUYARLILIK ANALİZİ: Gelir %±20 değişiminin kâr, değerleme, MOIC, runway'e etkisi
10. BREAK-EVEN ANALİZİ: Aylık kümülatif gelir/gider ve break-even noktası
11. **ODAK PROJE (varsa)**: Kullanıcının seçtiği ana yatırım projesi ve büyüme planı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔬 PROFESYONEL ANALİZ STANDARTLARI (Investment Banking Seviyesi):

1. **KALEM BAZLI DERİN ANALİZ:**
   Her gelir/gider kalemi için şunları belirt:
   - Q1→Q4 trend yönü ve büyüme oranı (% cinsinden) [VERİDEN]
   - Volatilite seviyesi: Düşük (<20%), Orta (20-50%), Yüksek (>50%) [HESAPLA]
   - Toplam içindeki pay ve konsantrasyon riski (%30+ = ⚠️ Uyarı, %50+ = 🔴 Kritik) [VERİDEN]
   - Senaryo A vs B farkının kök nedeni [KARŞILAŞTIR]

2. **FİNANSAL ORAN YORUMLAMA (Benchmark ile):**
   Sana verilen finansal oranları sektör ortalaması ile karşılaştır:
   - Current Ratio: 1.8+ (İyi) | 1.3-1.8 (Orta) | <1.3 (Dikkat)
   - Net Profit Margin: %18+ (İyi) | %12-18 (Orta) | <%12 (Dikkat)
   - Debt/Equity: <0.5 (İyi) | 0.5-1.0 (Orta) | >1.0 (Dikkat)
   - Alacak/Varlık: <%20 (İyi) | %20-30 (Orta) | >%30 (Tahsilat Riski)

3. **DUYARLILIK ANALİZİ YORUMU:**
   Gelir %20 düştüğünde:
   - Kâr nasıl etkilenir? [HESAPLA]
   - Break-even noktası kayar mı? [HESAPLA]
   - Runway kaç ay kalır? [HESAPLA]
   - EN KRİTİK DEĞİŞKEN hangisi?

4. **CONFIDENCE SCORE ZORUNLULUĞU:**
   Her insight için:
   - confidence_score: 0-100 arası
   - Varsayımları listele
   - Destekleyen veri noktalarını göster

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 BÖLÜM 1: FİNANSAL ANALİZ (AI Analiz Sekmesi İçin)

Bu bölümde şu çıktıları üret:
- 5-7 kritik insight (kategori: revenue/profit/cash_flow/risk/efficiency/opportunity)
  - HER insight için confidence_score (0-100) ZORUNLU
  - HER insight için veri kaynağını belirt
- 3-5 stratejik öneri (öncelik sıralı, aksiyon planlı)
- Çeyreklik analiz (kritik dönemler, büyüme eğilimi)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 BÖLÜM 2: DEAL DEĞERLENDİRME (Yatırımcı Gözüyle)

- deal_score: 1-10 arası puan (formül göster)
- valuation_verdict: "premium" / "fair" / "cheap"
- investor_attractiveness: 2 cümlelik yorum
- risk_factors: 3-5 risk (VERİDEN türet, UYDURMA)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎤 BÖLÜM 3: PITCH DECK SLAYTLARI

5 slayt üret, her slayt için:
- title: Çarpıcı başlık (max 8 kelime)
- key_message: Ana mesaj (tek cümle)
- content_bullets: 3-4 madde (kısa, net, RAKAMLARI VERİDEN AL)
- speaker_notes: Konuşma metni (2-3 cümle)

Slayt Sırası:
1. THE HOOK: Neden yatırım?
2. DEATH VALLEY: Yatırım almazsak ne olur?
3. USE OF FUNDS: Yatırım nereye gidecek?
4. THE MATH: Getiri hesabı
5. THE EXIT: Çıkış senaryosu

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 BÖLÜM 4: GELECEK YIL PROJEKSİYONU (Simülasyon Yılı +1)

⚠️ KRİTİK: HER ZAMAN POZİTİF SENARYO (A) BAZ ALINIR!

🎯 PROJEKSİYON KURALLARI:
1. Base = Senaryo A'nın yıl sonu değerleri
2. Büyüme = %40-100 arası (yatırım etkisi)
3. Her çeyrek için gelir > 0, gider > 0
4. Q3-Q4'te nakit akışı POZİTİFE dönmeli
5. Net kâr pozitif veya break-even yakını olmalı

📊 KALEM BAZLI PROJEKSİYON (YENİ):
Odak proje varsa, onun büyümesi ön planda:
- Odak proje: +50-100% büyüme (yatırım kullanılacak)
- Diğer gelir kalemleri: +10-30% normal büyüme
- Giderler: Yatırım dağılımına göre artış

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 BÖLÜM 5: EXECUTIVE SUMMARY

Yatırımcıya gönderilecek özet (max 150 kelime):
- Problem + Çözüm (1 cümle)
- Talep (1 cümle)
- Teklif (1 cümle)
- Sonuç (neden bu fırsat kaçırılmamalı)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 YAPMA:
- Coğrafi tahminler (Kuzey Amerika, Avrupa vb.)
- Pazar büyüklüğü rakamları
- Rakip şirket isimleri
- Teknoloji/entegrasyon tahminleri
- Yasal yapı önerileri
- Harici kaynak referansları

✅ YAP:
- Sadece verilen verilerden analiz
- Her rakamın kaynağını belirt
- Confidence score ver
- Senaryo A = Pozitif, B = Negatif olarak referans al
- Gelecek yıl projeksiyonunu Senaryo A baz alarak yap

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
