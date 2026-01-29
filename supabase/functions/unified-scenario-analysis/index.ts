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
   
4. **KESİNLİKLE YASAK İFADELER (OTOMATİK RED):**
   ❌ "danışmanlık modeli" (gerçek proje isimlerini kullan)
   ❌ "dijital dönüşüm" (ne dönüştüğünü söyle)
   ❌ "ölçeklenebilir" (rakamla göster)
   ❌ "geleneksel iş modeli" (gelir kalemlerini listele)
   ❌ "pazar lideri" (veri yok)
   ❌ "sektör ortalaması" (karşılaştırmalı veri yok)
   ❌ "Pazar $X milyar büyüklüğünde" (harici veri yok)
   ❌ "Rakip şirket Y bunu yapıyor" (veri yok)
   ❌ "Sektör trendi Z yönünde" (veri yok)
   ❌ "Kuzey Amerika/Avrupa/Asya pazarı..." (coğrafya verisi yok)
   ❌ "Yatırımcılar genellikle..." (genel varsayım)
   ❌ "SAP/Oracle entegrasyonu..." (teknik veri yok)
   ❌ "Delaware C-Corp kurulumu..." (yasal veri yok)
   ❌ "$X milyar TAM/SAM/SOM" (pazar verisi yok)
   ❌ "McKinsey/Gartner raporuna göre..." (harici kaynak yok)
   ❌ Rakam olmayan bullet point (HER BULLET $ veya % İÇERMELİ)

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
// =====================================================
// SENARYO KURALLARI - DİNAMİK
// =====================================================
type ScenarioRelationType = 'positive_vs_negative' | 'successor_projection' | 'year_over_year';

interface ScenarioRelationship {
  type: ScenarioRelationType;
  baseScenario: 'A' | 'B';
  projectionYear: number;
  description: string;
}

function detectScenarioRelationship(scenarioA: any, scenarioB: any): ScenarioRelationship {
  const targetYearA = scenarioA.targetYear || new Date().getFullYear();
  const targetYearB = scenarioB.targetYear || new Date().getFullYear();
  
  // Same year = traditional positive vs negative comparison
  if (targetYearA === targetYearB) {
    return {
      type: 'positive_vs_negative',
      baseScenario: 'A',
      projectionYear: targetYearA + 1,
      description: 'Aynı yıl için pozitif ve negatif senaryo karşılaştırması'
    };
  }
  
  // A is later than B = A is the successor/future projection of B's success
  if (targetYearA > targetYearB) {
    return {
      type: 'successor_projection',
      baseScenario: 'B', // B is the base (current year target), A is future projection
      projectionYear: targetYearA + 1,
      description: `${scenarioB.name} (${targetYearB}) başarılı olursa ${scenarioA.name} (${targetYearA}) projeksiyonu`
    };
  }
  
  // A is earlier than B (unusual but handle it)
  return {
    type: 'year_over_year',
    baseScenario: 'A',
    projectionYear: targetYearB + 1,
    description: 'Yıllar arası karşılaştırma'
  };
}

function generateDynamicScenarioRules(relationship: ScenarioRelationship, scenarioA: any, scenarioB: any): string {
  if (relationship.type === 'successor_projection') {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SENARYO İLİŞKİSİ: ARDIŞIK YIL PROJEKSİYONU (BAŞARI HİKAYESİ)

⚠️ KRİTİK: Bu bir "pozitif vs negatif" karşılaştırması DEĞİL!
Bu, "${scenarioB.name}" (${scenarioB.targetYear}) BAŞARILI olursa 
"${scenarioA.name}" (${scenarioA.targetYear}) nasıl görünür analizi.

🎯 HER İKİ SENARYO DA POZİTİF! Risk karşılaştırması YAPMA!

1. **${scenarioB.name} (${scenarioB.targetYear}) = BAZ SENARYO (YATIRIM YILI):**
   - Bu yılın yatırım hedefi
   - Yatırımla gerçekleşecek büyüme
   - TÜM exit plan ve MOIC hesaplamaları BUNA DAYALI
   - Pitch deck'in "traction" bölümü bu yılın verileri
   
2. **${scenarioA.name} (${scenarioA.targetYear}) = GELECEK PROJEKSİYON (BÜYÜME YILI):**
   - Baz senaryo başarılı olursa sonraki yıl
   - Büyümenin devamı ve hızlanması
   - ⚠️ NEGATİF SENARYO DEĞİL - POZİTİF GELİŞME!
   - Global genişleme ve ölçekleme yılı

3. **ANALİZ ODAĞI:**
   - ${scenarioB.targetYear} hedeflerimize ulaşırsak...
   - ${scenarioA.targetYear}'de nereye varabiliriz?
   - Büyüme momentum analizi
   - İKİ SENARYO DA OLUMLU - Fırsat analizi yap, risk karşılaştırması DEĞİL!
   - "Opportunity cost" analizi YAPMA - bu zaten başarı hikayesi

4. **PITCH DECK ODAĞI:**
   - ${scenarioB.targetYear} (yatırım yılı) verileri = "Traction" ve "Business Model" slaytları
   - ${scenarioA.targetYear} (büyüme yılı) verileri = "Growth Plan" ve "Financial Projection" slaytları
   - Hikaye: "Bu yıl $X yaparsak, gelecek yıl $Y olur"
   
5. **EXIT PLAN VE MOIC:**
   - Baz yıl = ${scenarioB.targetYear} (${scenarioB.name})
   - MOIC hesaplamaları ${scenarioB.name} üzerinden
   - ${scenarioA.name} sadece "upside potansiyeli" olarak göster

6. **KULLANMA (BU SENARYO TİPİ İÇİN):**
   ❌ "Negatif senaryo" ifadesi
   ❌ "Risk senaryosu" ifadesi  
   ❌ "Yatırım alamazsak" ifadesi
   ❌ "Fırsat maliyeti" hesabı
   ❌ A vs B "kayıp" karşılaştırması
`;
  }
  
  // Default: Same year positive vs negative comparison
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SENARYO KURALLARI (POZİTİF VS NEGATİF KARŞILAŞTIRMA):

1. **SENARYO A = POZİTİF SENARYO (${scenarioA.name}):**
   - Net kârı daha yüksek olan senaryo
   - Büyüme hedeflerinin tuttuğu senaryo
   - "Hedef Senaryo" olarak referans al
   - Yatırımcıya gösterilecek ana senaryo
   - YATIRIM ALIRSAK gerçekleşecek senaryo

2. **SENARYO B = NEGATİF SENARYO (${scenarioB.name}):**
   - Net kârı daha düşük olan senaryo
   - Kötümser varsayımlar, düşük gelir
   - "Risk Senaryosu" olarak referans al
   - Downside risk değerlendirmesi için
   - YATIRIM ALAMAZSAK gerçekleşecek senaryo

3. **ANALİZ ODAĞI:**
   - Pozitif Senaryo (A) gerçekleşirse ne olur? → Ana hikaye (Yatırım alırsak)
   - Negatif Senaryo (B) gerçekleşirse ne olur? → Risk analizi (Yatırım alamazsak)
   - Fark ne kadar? Risk ne kadar büyük? → Gap analizi = FIRSAT MALİYETİ / ZARAR

4. **YATIRIM SENARYO KARŞILAŞTIRMASI:**
   - YATIRIM ALIRSAK (A): Hedef büyüme gerçekleşir, exit plan işler
   - YATIRIM ALAMAZSAK (B): Organik (düşük) büyüme, FIRSAT MALİYETİ = ZARAR
   - Her analizde bu karşılaştırmayı NET olarak yap!

5. **GELECEK YIL PROJEKSİYON KURALI:**
   - Simülasyon Yılı +1 projeksiyonu Pozitif Senaryo (A) baz alınarak yapılır
   - Projeksiyon = Senaryo A'nın %40-100 büyümesi
`;
}

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

// Note: SCENARIO_RULES is now dynamic - will be injected at runtime via generateDynamicScenarioRules()
const getUnifiedMasterPrompt = (dynamicScenarioRules: string) => `Sen, Fortune 500 CFO'su ve Silikon Vadisi VC Ortağı yeteneklerine sahip "Omni-Scient (Her Şeyi Bilen) Finansal Zeka"sın.

${ANTI_HALLUCINATION_RULES}

${dynamicScenarioRules}

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

🎤 BÖLÜM 3: PITCH DECK SLAYTLARI (10 SLAYT - STARTUP KURUCUSU TONU)

⚠️ KRİTİK: HER SLAYT SPESİFİK RAKAMLAR VE PROJE İSİMLERİ İÇERMELİ!

10 slaytlık yatırımcı sunumu üret. Her slayt tek bir mesaj verir, rakamlarla destekler.

DİL VE TON:
- Startup kurucusu gibi konuş, finans analisti gibi DEĞİL
- Özgüvenli ama gerçekçi - "Biz" dili kullan
- Rakamlar hikayeyi destekler, hikaye rakamları değil
- Yatırımcıyı heyecanlandır ama abartma

Her slayt için:
- title: Çarpıcı başlık (max 8 kelime)
- key_message: Ana mesaj (tek cümle) - RAKAM DAHİL ($X, %Y formatında)
- content_bullets: 3-4 madde - HER MADDE $ veya % FORMATINDA RAKAM İÇERMELİ
- speaker_notes: Konuşma metni (3-4 cümle) - samimi startup dili

SLAYT YAPISI (10 SLAYT):

1️⃣ PROBLEM
"Müşterilerimizin yaşadığı gerçek acı nedir?"
- Pazardaki mevcut çözümlerin yetersizliği
- Bu problemin yarattığı ölçülebilir kayıp ($X/yıl kayıp)
- Neden şimdiye kadar çözülmedi?
Key Message: "[Hedef müşteri] her yıl [problem] yüzünden $X kaybediyor"

2️⃣ ÇÖZÜM: [ODAK PROJE ADI]
"İşte bizim yaklaşımımız"
- Ürün/hizmetin tek cümlelik açıklaması
- Mevcut alternatiflerden farkımız
- Müşteri için yarattığımız değer ($X tasarruf, %Y artış)
Key Message: "[Ürün adı] ile müşteriler [spesifik fayda] elde ediyor"

3️⃣ PAZAR FIRSATI
"Bu pasta ne kadar büyük?"
- Hedef pazarın büyüklüğü (gerçekçi, ulaşılabilir segment)
- Bizim hedeflediğimiz dilim ($X/yıl potansiyel)
- İlk 3 yılda %Y pazar payı hedefi
Key Message: "İlk 3 yılda $X gelir hedefine ulaşacağız"

4️⃣ İŞ MODELİ
"Parayı nasıl kazanıyoruz?"
- Gelir kalemleri ve fiyatlandırma ([Ürün A]: $X/ay, [Ürün B]: $Y/proje)
- Gross margin: %Z
- Birim ekonomisi detayları
Key Message: "Her müşteriden $X kazanıyoruz - %Z gross margin"

5️⃣ TRACTION (Bugüne Kadar)
"Elimizde ne var?"
- Bu yılki gelir: $X (geçen yıla göre %Y büyüme)
- Önemli mihenk taşları
- Product-market fit kanıtları
Key Message: "$X gelir ve %Z büyüme ile product-market fit kanıtlandı"

6️⃣ BÜYÜME PLANI (Yatırımla)
"Yatırım alırsak nereye gidiyoruz?"
- 1. Yıl hedefi: $X gelir
- 3. Yıl hedefi: $Y gelir
- Ana büyüme motorları
Key Message: "Yatırımla 3 yılda $X'den $Y'ye büyüyoruz"

7️⃣ USE OF FUNDS
"Yatırımı nasıl kullanacağız?"
- $X toplam yatırım dağılımı:
  * Ürün Geliştirme: %A ($X)
  * Satış & Pazarlama: %B ($X)
  * Ekip: %C ($X)
  * Operasyon: %D ($X)
Key Message: "$X yatırımın %Y'si [en kritik kalem]'e gidiyor"

8️⃣ FİNANSAL PROJEKSİYON
"Rakamlar ne söylüyor?"
- Yatırımla: $X gelir, $Y kâr (3. Yıl)
- Yatırımsız: $X gelir, $Y kâr (3. Yıl)
- Değerleme farkı: +$Z
Key Message: "Yatırımla $X daha fazla değer yaratıyoruz"

9️⃣ EKİP
"Neden biz başaracağız?"
- Kurucu ekip ve ilgili deneyimleri
- Bu problemi çözmek için neden doğru ekip
- Kilit danışmanlar (varsa)
Key Message: "Ekibimiz [X yıl] sektör deneyimi ile bu problemi çözmeye hazır"

🔟 THE ASK
"Ne istiyoruz, ne veriyoruz?"
- Yatırım tutarı: $X
- Karşılığında: %Y equity
- Pre-money değerleme: $X
- Yatırımcı getirisi: 3Y MOIC Xx, 5Y MOIC Xx
Key Message: "$X yatırım, 5 yılda $Y'ye dönüşüyor - Xx MOIC"

🚫 YASAK:
- Finans analisti dili ("gelir konsantrasyonu", "organik büyüme sınırı" gibi)
- Genel ifadeler ("ölçeklenebilir", "inovatif", "dijital dönüşüm")
- Rakam olmayan maddeler

✅ ZORUNLU:
- Startup kurucusu tonu
- Her bullet'ta $ veya % formatında rakam
- Odak proje ismi başlıklarda (varsa)
- Speaker notes'ta samimi, ikna edici açıklama

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

📧 BÖLÜM 5: EXECUTIVE SUMMARY (YAPILANDIRILMIŞ FORMAT - ZORUNLU)

⚠️ KRİTİK: Executive summary bir OBJE olmalı, düz metin DEĞİL!

1️⃣ short_pitch (150 kelime): Yatırımcı özeti
   - "[Gelir Kalemi 1], [Gelir Kalemi 2], [Gelir Kalemi 3] üzerinden gelir üreten..."
   - Şirketin ne yaptığını SOMUT olarak anlat
   - Rakamlarla destekle

2️⃣ revenue_items (zorunlu): Top gelir kalemleri listesi
   - Format: "[Kalem1] ($X), [Kalem2] ($Y), [Kalem3] ($Z)"
   - En az 3 kalem, $ formatında

3️⃣ scenario_comparison (zorunlu): A vs B karşılaştırması
   - Format: "Pozitif ([A adı]): $X gelir, $Y kâr | Negatif ([B adı]): $X gelir, $Y kâr | Fark: $X (%Y)"
   - Her iki senaryonun ismi ve rakamları ZORUNLU

4️⃣ investment_impact (zorunlu): Yatırım alamazsak ne olur
   - Format: "Yatırım alamazsak $X daha az gelir, %Y düşük büyüme, [risk açıklaması]"
   - Fırsat maliyetini NET olarak belirt

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
      exchangeRate,
      focusProjectInfo,
      previousEditedProjections
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use the most powerful model for deep reasoning - now with fixed scenario logic
    const MODEL_ID = "google/gemini-3-pro-preview";
    
    // Detect scenario relationship type
    const scenarioRelationship = detectScenarioRelationship(scenarioA, scenarioB);
    console.log("Detected scenario relationship:", scenarioRelationship);
    
    // Generate dynamic scenario rules based on relationship
    const dynamicScenarioRules = generateDynamicScenarioRules(scenarioRelationship, scenarioA, scenarioB);
    
    // Calculate year references based on scenario data
    const currentYear = new Date().getFullYear();
    const baseYear = scenarioA.baseYear || currentYear - 1;    // 2025 - Last completed year
    
    // For successor_projection, use scenarioB as the base for calculations
    const exitPlanBaseYear = scenarioRelationship.type === 'successor_projection' 
      ? scenarioB.targetYear 
      : scenarioA.targetYear;
    
    const scenarioYear = scenarioA.targetYear || currentYear;  // 2026 - Scenario target year
    const scenarioBYear = scenarioB.targetYear || currentYear;
    const year2 = scenarioRelationship.projectionYear;  // Dynamic based on relationship
    const year3 = exitPlanBaseYear + 3;  // 3-year MOIC based on correct base
    const year5 = exitPlanBaseYear + 5;  // 5-year MOIC based on correct base

    // Build year context section for AI - DYNAMIC based on scenario relationship
    const yearContextSection = scenarioRelationship.type === 'successor_projection' ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 YIL YAPISI VE SENARYO ROLLERİ (ARDIŞIK YIL PROJEKSİYONU)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 SENARYO TİPİ: 📈 ARDIŞIK YIL PROJEKSİYONU
⚠️ HER İKİ SENARYO DA POZİTİF! Negatif karşılaştırma YAPMA!

🗓️ ZAMAN ÇİZELGESİ:
┌────────────────┬──────────────────────────────────────────┐
│ ${baseYear} (Base)    │ Tamamlanan yıl - Gerçek finansallar     │
│ ${scenarioBYear} (Baz Yıl)  │ "${scenarioB.name}" - Yatırım hedefi     │
│ ${scenarioYear} (Gelecek)  │ "${scenarioA.name}" - Başarı projeksiyonu│
│ ${year3} (3.Yıl)   │ MOIC 3Y hesaplama noktası (${scenarioBYear} bazlı) │
│ ${year5} (5.Yıl)   │ MOIC 5Y hesaplama noktası (${scenarioBYear} bazlı) │
└────────────────┴──────────────────────────────────────────┘

🎯 SENARYO ROLLERI:
- "${scenarioB.name}" (${scenarioBYear}) = BAZ SENARYO
  - Yatırım alınan yıl
  - Exit Plan, MOIC hesaplamaları BUNA DAYALI
  - Pitch deck'in "Traction" ve "Business Model" bölümü

- "${scenarioA.name}" (${scenarioYear}) = GELECEK PROJEKSİYON
  - Baz senaryo başarılı olursa ulaşılacak hedef
  - ⚠️ NEGATİF DEĞİL - POZİTİF BÜYÜME HİKAYESİ!
  - Pitch deck'in "Growth Plan" bölümü

⚠️ KRİTİK TALİMATLAR:
1. Exit plan ve MOIC hesaplamaları ${scenarioBYear} (${scenarioB.name}) verilerine dayalı
2. İki senaryo arasında "kayıp" veya "fırsat maliyeti" analizi YAPMA
3. Her iki senaryoyu da POZİTİF büyüme hikayesi olarak sun
4. Pitch deck'te: "${scenarioBYear}'de $X, ${scenarioYear}'de $Y'ye ulaşıyoruz" formatı
5. Gelecek yıl projeksiyonu = ${year2}
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 YIL YAPISI VE SENARYO ROLLERİ (POZİTİF VS NEGATİF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 SENARYO TİPİ: ⚖️ POZİTİF VS NEGATİF KARŞILAŞTIRMA

🗓️ ZAMAN ÇİZELGESİ:
┌────────────────┬──────────────────────────────────────────┐
│ ${baseYear} (Base)    │ Tamamlanan yıl - Gerçek finansallar     │
│ ${scenarioYear} (Year 1)   │ Senaryo yılı - Pozitif/Negatif hedef    │
│ ${year2} (Year 2)   │ İlk projeksiyon yılı                    │
│ ${year3} (Year 3+)  │ 3 Yıllık MOIC hesaplama noktası         │
│ ${year5} (Year 5+)  │ 5 Yıllık MOIC hesaplama noktası         │
└────────────────┴──────────────────────────────────────────┘

🎯 SENARYO TANIMLARI:
- SENARYO A (POZİTİF) = "${scenarioA.name}"
  - ${scenarioYear} yılı HEDEFİ (yatırım alırsak)
  - TÜM DASHBOARD VE ANALİZLER BUNA ODAKLI
  - Exit Plan, MOIC, Pitch Deck bu senaryoya dayalı

- SENARYO B (NEGATİF) = "${scenarioB.name}"  
  - ${scenarioYear} yılı RİSK senaryosu (yatırım alamazsak)
  - SADECE risk analizi ve downside değerlendirmesi için

⚠️ KRİTİK TALİMATLAR:
1. Tüm projeksiyon hesaplamaları POZİTİF SENARYO (A) verilerine dayalı
2. MOIC 3 Yıl = ${year3} yılındaki değerleme bazlı
3. MOIC 5 Yıl = ${year5} yılındaki değerleme bazlı
4. Pitch deck'te SPESİFİK YILLARI kullan (örn: "${year3}'te $2.5M değerleme")
5. Negatif senaryoyu "Yatırım alamazsak senaryosu" olarak referans ver
6. Gelecek yıl projeksiyonu = ${scenarioYear + 1} (${year2})
`;

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

HESAPLANMIŞ EXIT PLANI (${scenarioYear} bazlı, POZİTİF SENARYO):
- Post-Money Değerleme: $${exitPlan.postMoneyValuation.toLocaleString()}
- ${year3} (3. Yıl) Yatırımcı Payı: $${exitPlan.investorShare3Year.toLocaleString()}
- ${year5} (5. Yıl) Yatırımcı Payı: $${exitPlan.investorShare5Year.toLocaleString()}
- MOIC (${year3}): ${exitPlan.moic3Year.toFixed(2)}x
- MOIC (${year5}): ${exitPlan.moic5Year.toFixed(2)}x
- Break-Even Yılı: ${exitPlan.breakEvenYear || 'Belirsiz'}

${exitPlan.allYears && exitPlan.allYears.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 5 YILLIK FİNANSAL PROJEKSİYON DETAYLARI (HESAPLANMIŞ):

${exitPlan.allYears.map((year: any, i: number) => {
  const valuations = year.valuations || {};
  return `
🗓️ ${year.actualYear || (scenarioYear + i + 1)} (${year.growthStage === 'aggressive' ? 'Agresif Büyüme' : 'Normalize Büyüme'} Aşaması):
- Gelir: $${(year.revenue || 0).toLocaleString()}
- Gider: $${(year.expenses || 0).toLocaleString()}
- Net Kâr: $${(year.netProfit || 0).toLocaleString()}
- EBITDA: $${(year.ebitda || 0).toLocaleString()} (Marj: %${(year.ebitdaMargin || 0).toFixed(1)})
- Serbest Nakit Akışı (FCF): $${(year.freeCashFlow || 0).toLocaleString()}
- Uygulanan Büyüme Oranı: %${((year.appliedGrowthRate || 0) * 100).toFixed(1)}

DEĞERLEME METODLARI:
├─ Ciro Çarpanı (${dealConfig.sectorMultiple}x): $${(valuations.revenueMultiple || 0).toLocaleString()}
├─ EBITDA Çarpanı: $${(valuations.ebitdaMultiple || 0).toLocaleString()}
├─ DCF (%30 iskonto): $${(valuations.dcf || 0).toLocaleString()}
├─ VC Metodu (10x ROI): $${(valuations.vcMethod || 0).toLocaleString()}
└─ ⭐ AĞIRLIKLI DEĞERLEME: $${(valuations.weighted || year.companyValuation || 0).toLocaleString()}
`;
}).join('\n')}

💰 DEĞERLEME METODOLOJİSİ:
1. CİRO ÇARPANI (%30 Ağırlık): Gelir × Sektör Çarpanı
2. EBITDA ÇARPANI (%25 Ağırlık): EBITDA × EBITDA Çarpanı (SaaS:15x, E-ticaret:8x)
3. DCF (%30 Ağırlık): 5 yıllık FCF NPV + Terminal Value (%30 iskonto, %3 terminal)
4. VC METODU (%15 Ağırlık): 5. Yıl Değerleme ÷ 10x ROI

🔍 DEĞERLEME ANALİZ TALİMATLARI:
1. AĞIRLIKLI değerleme = (Ciro×0.30) + (EBITDA×0.25) + (DCF×0.30) + (VC×0.15)
2. Pitch deck'te 5. yıl ağırlıklı değerlemeyi kullan - UYDURMA değil HESAPLANMIŞ
3. EBITDA marjı trendi: İlk yıllardan son yıllara nasıl değişiyor?
4. DCF vs Revenue Multiple farkını yorumla - hangisi daha güvenilir?
5. VC metodunun gerçekçiliğini değerlendir (10x ROI makul mü?)
6. HER değerleme rakamını bu bölümden al, UYDURMA
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEATH VALLEY ANALİZİ (POZİTİF SENARYO BAZLI):
- Kritik Çeyrek: ${capitalNeeds.criticalQuarter}
- Minimum Kümülatif Nakit: $${capitalNeeds.minCumulativeCash.toLocaleString()}
- Hesaplanan Gereken Yatırım: $${capitalNeeds.requiredInvestment.toLocaleString()}
- Aylık Burn Rate: $${capitalNeeds.burnRateMonthly.toLocaleString()}
- Runway: ${capitalNeeds.runwayMonths} ay
- Kendi Kendini Finanse Edebilir mi: ${capitalNeeds.selfSustaining ? 'Evet' : 'Hayır'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${yearContextSection}

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

${focusProjectInfo ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ODAK PROJE(LER) BİLGİSİ (KULLANICI SEÇİMİ):

${focusProjectInfo.projects.map((p: any, i: number) => `
📌 Proje ${i + 1}: ${p.projectName}
- Mevcut Gelir: $${(p.currentRevenue || 0).toLocaleString()}
- Hedef Gelir: $${(p.projectedRevenue || 0).toLocaleString()}
- Büyüme: %${p.currentRevenue > 0 ? (((p.projectedRevenue / p.currentRevenue) - 1) * 100).toFixed(1) : '∞'}
`).join('\n')}

💰 TOPLAM:
- Toplam Mevcut: $${(focusProjectInfo.combinedCurrentRevenue || 0).toLocaleString()}
- Toplam Hedef: $${(focusProjectInfo.combinedProjectedRevenue || 0).toLocaleString()}
- Büyüme Oranı: %${focusProjectInfo.combinedCurrentRevenue > 0 ? (((focusProjectInfo.combinedProjectedRevenue / focusProjectInfo.combinedCurrentRevenue) - 1) * 100).toFixed(1) : '∞'}

📈 BÜYÜME PLANI (Kullanıcı Girişi):
${focusProjectInfo.growthPlan || 'Belirtilmedi - AI en mantıklı büyüme stratejisini önersin'}

💵 YATIRIM DAĞILIMI (Kullanıcı Tercihi):
- Ürün Geliştirme: %${focusProjectInfo.investmentAllocation?.product || 40} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.product || 40) / 100).toLocaleString()})
- Pazarlama: %${focusProjectInfo.investmentAllocation?.marketing || 30} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.marketing || 30) / 100).toLocaleString()})
- Personel: %${focusProjectInfo.investmentAllocation?.hiring || 20} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.hiring || 20) / 100).toLocaleString()})
- Operasyon: %${focusProjectInfo.investmentAllocation?.operations || 10} ($${Math.round(dealConfig.investmentAmount * (focusProjectInfo.investmentAllocation?.operations || 10) / 100).toLocaleString()})

🔍 ANALİZ TALİMATI:
1. Pitch deck'te bu proje(leri) ana büyüme motoru olarak sun
2. Yatırım dağılımına göre "Use of Funds" slaytını oluştur (spesifik $ tutarları ile)
3. Büyüme planını speaker notes'a dahil et
4. Her slaytın key_message'ında proje ismi ve $ rakamı olsun
5. Executive summary'de odak proje(leri) vurgula
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ODAK PROJE BELİRTİLMEDİ
Kullanıcı odak proje seçmedi. Analiz yaparken:
1. En yüksek büyüme potansiyeli olan gelir kalemini otomatik seç
2. Senaryo A vs B arasındaki en büyük farkı yaratan kalemi belirle
3. Bu kalemi ana büyüme hikayesi olarak kullan
`}

${previousEditedProjections ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 KULLANICI DÜZENLEMELERİ (Önceki Analiz Sonrası):

Kullanıcı AI tarafından önerilen projeksiyon tablolarında değişiklik yaptı.
Bu değişiklikleri dikkate alarak analizi güncelle.

Düzenlenmiş Gelir Projeksiyonu (Sonraki Yıl):
${(previousEditedProjections.revenue || []).filter((i: any) => i.userEdited).map((r: any) => 
  `${r.category}: Q1=$${Math.round(r.q1).toLocaleString()}, Q2=$${Math.round(r.q2).toLocaleString()}, Q3=$${Math.round(r.q3).toLocaleString()}, Q4=$${Math.round(r.q4).toLocaleString()} | Toplam=$${Math.round(r.total || (r.q1+r.q2+r.q3+r.q4)).toLocaleString()} [KULLANICI DÜZENLEDİ]`
).join('\n') || 'Gelir düzenlemesi yok'}

Düzenlenmiş Gider Projeksiyonu (Sonraki Yıl):
${(previousEditedProjections.expense || []).filter((i: any) => i.userEdited).map((e: any) => 
  `${e.category}: Q1=$${Math.round(e.q1).toLocaleString()}, Q2=$${Math.round(e.q2).toLocaleString()}, Q3=$${Math.round(e.q3).toLocaleString()}, Q4=$${Math.round(e.q4).toLocaleString()} | Toplam=$${Math.round(e.total || (e.q1+e.q2+e.q3+e.q4)).toLocaleString()} [KULLANICI DÜZENLEDİ]`
).join('\n') || 'Gider düzenlemesi yok'}

🔍 ANALİZ TALİMATI:
1. Kullanıcının yaptığı değişiklikleri doğrula ve mantıklı olup olmadığını değerlendir
2. Değişiklikler toplam rakamları etkileyecekse, bunu insights ve pitch deck'e yansıt
3. Kullanıcının değişiklikleri agresif/konservatif mi belirt
` : ''}

Tüm bu verileri (özellikle geçmiş yıl bilançosunu, çeyreklik kalem bazlı verileri ve ODAK PROJE bilgisini) analiz et ve yukarıdaki 5 bölümün hepsini içeren yapılandırılmış çıktı üret.
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
          { role: "system", content: getUnifiedMasterPrompt(dynamicScenarioRules) },
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
                    description: "CRITICAL: Every slide MUST contain $ amounts and % figures. NO generic statements.",
                    properties: {
                      slides: {
                        type: "array",
                        description: "10 slides for investor pitch. Each slide tells ONE story with supporting numbers. Language: confident startup founder, not financial analyst. Slides: 1-Problem, 2-Çözüm, 3-Pazar, 4-İş Modeli, 5-Traction, 6-Büyüme Planı, 7-Use of Funds, 8-Finansal Projeksiyon, 9-Ekip, 10-The Ask",
                        items: {
                          type: "object",
                          properties: {
                            slide_number: { type: "number" },
                            title: { 
                              type: "string", 
                              description: "Max 8 words. MUST include focus project name if available" 
                            },
                            key_message: { 
                              type: "string", 
                              description: "MUST contain at least one $ amount or % figure. Example: '$150K yatırım ile $560K gelir hedefine ulaşıyoruz'" 
                            },
                            content_bullets: { 
                              type: "array", 
                              items: { type: "string" },
                              description: "3-4 bullets. EVERY bullet MUST contain $ or % format number. NO generic statements like 'ölçeklenebilir model'."
                            },
                            speaker_notes: { type: "string" }
                          }
                        }
                      },
                      executive_summary: { 
                        type: "object",
                        description: "MUST be an object with structured fields, NOT a plain string. Include scenario comparison and revenue items.",
                        properties: {
                          short_pitch: { 
                            type: "string", 
                            description: "150 word investor pitch with company description and revenue sources. List actual revenue item names." 
                          },
                          revenue_items: { 
                            type: "string", 
                            description: "REQUIRED: List top 3-4 revenue items with $ amounts. Example: 'SBT Tracker ($230K), PlannerDeck ($150K), Billiyor App ($120K)'" 
                          },
                          scenario_comparison: { 
                            type: "string", 
                            description: "REQUIRED: A vs B comparison. Format: 'Pozitif (Senaryo A adı): $X gelir, $Y kâr | Negatif (Senaryo B adı): $X gelir, $Y kâr | Fark: $X (%Y)'" 
                          },
                          investment_impact: { 
                            type: "string", 
                            description: "REQUIRED: What happens without investment. Example: 'Yatırım alamazsak $210K daha az gelir ve organik büyüme %15 ile sınırlı'" 
                          }
                        },
                        required: ["short_pitch", "revenue_items", "scenario_comparison", "investment_impact"]
                      }
                    }
                  },
                  next_year_projection: {
                    type: "object",
                    description: "CRITICAL: All numeric fields MUST be > 0. Revenue should be at least 40% higher than current year. MUST include itemized_revenues and itemized_expenses arrays.",
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
                      },
                      itemized_revenues: {
                        type: "array",
                        description: "REQUIRED: Category-based revenue projections. Use EXACT category names from input data (e.g., 'SBT Tracker', 'Leadership Denetim'). Sum of totals MUST match summary.total_revenue. Apply 30-65% growth per category.",
                        items: {
                          type: "object",
                          properties: {
                            category: { type: "string", description: "EXACT category name from scenario revenues" },
                            q1: { type: "number", description: "Q1 projected revenue for this category" },
                            q2: { type: "number", description: "Q2 projected revenue for this category" },
                            q3: { type: "number", description: "Q3 projected revenue for this category" },
                            q4: { type: "number", description: "Q4 projected revenue for this category" },
                            total: { type: "number", description: "Sum of q1+q2+q3+q4" },
                            growth_rate: { type: "number", description: "Growth rate vs base scenario (e.g., 0.45 for 45%)" }
                          },
                          required: ["category", "q1", "q2", "q3", "q4", "total", "growth_rate"]
                        }
                      },
                      itemized_expenses: {
                        type: "array",
                        description: "REQUIRED: Category-based expense projections. Use EXACT category names from input data. Sum of totals MUST match summary.total_expenses. Apply 10-25% growth per category.",
                        items: {
                          type: "object",
                          properties: {
                            category: { type: "string", description: "EXACT category name from scenario expenses" },
                            q1: { type: "number", description: "Q1 projected expense for this category" },
                            q2: { type: "number", description: "Q2 projected expense for this category" },
                            q3: { type: "number", description: "Q3 projected expense for this category" },
                            q4: { type: "number", description: "Q4 projected expense for this category" },
                            total: { type: "number", description: "Sum of q1+q2+q3+q4" },
                            growth_rate: { type: "number", description: "Growth rate vs base scenario (e.g., 0.15 for 15%)" }
                          },
                          required: ["category", "q1", "q2", "q3", "q4", "total", "growth_rate"]
                        }
                      }
                    },
                    required: ["strategy_note", "quarterly", "summary", "itemized_revenues", "itemized_expenses"]
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
    
    // Debug: log the response structure
    console.log("Response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      toolCallsLength: data.choices?.[0]?.message?.tool_calls?.length,
      hasContent: !!data.choices?.[0]?.message?.content,
      contentPreview: data.choices?.[0]?.message?.content?.substring?.(0, 200)
    }));

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const analysisResult = JSON.parse(toolCall.function.arguments);
        console.log("Successfully parsed tool call arguments");
        
        // Add projection_year from scenarioRelationship to the response
        const responseWithProjectionYear = {
          ...analysisResult,
          projection_year: scenarioRelationship.projectionYear
        };
        
        return new Response(
          JSON.stringify(responseWithProjectionYear),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log("Trying to parse content directly, length:", content.length);
      try {
        // Try to extract JSON from markdown code blocks if present
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
          console.log("Extracted JSON from code block");
        }
        
        const parsed = JSON.parse(jsonContent);
        console.log("Successfully parsed content as JSON");
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (contentParseError) {
        console.error("Failed to parse content as JSON:", contentParseError);
        console.log("Raw content (first 500 chars):", content.substring(0, 500));
      }
    }

    // Last resort: return partial data if available
    console.error("No valid response structure found in AI response");
    throw new Error("No valid response from AI - check logs for response structure");
  } catch (error) {
    console.error("Unified analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
