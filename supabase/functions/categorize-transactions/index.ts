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

const SYSTEM_PROMPT = `Sen bir Türk şirketi için uzman mali müşavir seviyesinde işlem kategorileme asistanısın.

═══════════════════════════════════════════════════════════════════════════════
TÜRK BANKACILIĞI İŞLEM KALIPLARI
═══════════════════════════════════════════════════════════════════════════════

1. İŞLEM TİPİ TESPİTİ (Açıklama Prefix'leri):

| Prefix | İşlem Tipi | Örnek |
|--------|------------|-------|
| EF + 7 hane | EFT Gönderim/Alım | EF1234567 FİRMA ADI |
| MOBIL-FAST- | FAST Transfer | MOBIL-FAST-1234567890 |
| CEP ŞUBE-HVL- | Havale | CEP ŞUBE-HVL-açıklama -İSİM |
| CEP ŞUBE-EFT- | Mobil EFT | CEP ŞUBE-EFT-1234567 |
| INT-HVL- | Internet Havale | INT-HVL-açıklama -FİRMA |
| INT-HVLEMR- | Internet Havale | INT-HVLEMR-AÇIKLAMA |
| KESİNTİ VE EKLERİ | Banka Masrafı | KESİNTİ VE EKLERİ-borç |
| O4- | Otomatik Ödeme/Kredi | O4-(TİCARİ AMAÇLI KREDİ TAHS.) |
| HGS Hesaptan | HGS Yükleme | HGS Hesaptan Bakiye Yükleme |
| TRKCLL/TURKCELL | Telefon Faturası | TRKCLL 5314214216 |
| Eureko/ALLIANZ | Sigorta Primi | Eureko-0126541694-000-KASKO |
| VAD.HES.AÇILIŞI | Vadeli Hesap | VAD.HES.AÇILIŞI Faiz % 25,00 |
| MEVDUAT GERİ | Vadeli Hesap Bozum | MEVDUAT GERİ DÖNÜŞÜ 6392392 |
| Mobil DÖVİZ | Döviz Alım/Satım | Mobil DÖVİZ SATIŞ EUR:47.59 |
| BR.KAMP.KULL | Kredi Kullanımı | BR.KAMP.KULL(MÜŞT- BAYİ) |
| TİCARİ AMAÇLI KRD | Kredi Kullanımı | TİCARİ AMAÇLI KRD.KULL |
| KREDİLİ HESAP FAİZ | Kredi Faizi | KREDİLİ HESAP FAİZ TAHSİLATI |
| REFERANS KAPAMA | Banka İç İşlem | REFERANS KAPAMA İŞLEMLERİ |

2. KARŞI TARAF ÇIKARIMI (Counterparty Extraction):

EFT Formatı:
- "EF1234567 FİRMA ADI-AÇIKLAMA" → Karşı taraf: "FİRMA ADI"
- "EF1234567 FİRMA ADI VE TİC.A.Ş.-fatura" → Karşı taraf: "FİRMA ADI VE TİC.A.Ş."

Havale Formatı:
- "CEP ŞUBE-HVL-açıklama -İSİM SOYİSİM" → Karşı taraf: "İSİM SOYİSİM"
- "CEP ŞUBE-HVL-borç -EMRE AKÇAOĞLU" → Karşı taraf: "EMRE AKÇAOĞLU"

FAST Formatı:
- "MOBIL-FAST-1234567890 AÇIKLAMA" → Açıklamadan çıkar

INT Havale Formatı:
- "INT-HVL-açıklama -FİRMA ADI" → Karşı taraf: "FİRMA ADI"

═══════════════════════════════════════════════════════════════════════════════
MUHASEBE KURALLARI VE BİLANÇO ETKİSİ
═══════════════════════════════════════════════════════════════════════════════

1. GELİR TABLOSU ETKİSİ (affects_pnl = true):

A) GELİRLER (Pozitif tutar, equity_increase):
   - Hizmet faturaları (danışmanlık, denetim, eğitim)
   - Ürün satışları
   - Faiz gelirleri (mevduat faizi)
   - Kira gelirleri
   - Döviz kur farkı gelirleri

B) GİDERLER (Negatif tutar, equity_decrease):
   - Operasyonel giderler (ofis, kırtasiye, telekomünikasyon)
   - Seyahat ve konaklama
   - Personel giderleri
   - Dış hizmet alımları
   - Pazarlama/reklam giderleri
   - Banka masrafları
   - Vergi ve harçlar
   - Kredi faiz giderleri (⚠️ anapara değil!)

2. BİLANÇO ETKİSİ (affects_pnl = false):

A) AKTİF DEĞİŞİMLERİ:
   - Duran varlık alımları (ekipman, araç) → asset_increase
   - Ortaktan alacak (iade) → asset_increase
   - Vadeli mevduat bozumu → none (hesaplar arası)

B) PASİF DEĞİŞİMLERİ:
   - Kredi kullanımı (anapara) → liability_increase
   - Ortağa borç → liability_increase
   - Kredi anapara ödemesi → liability_decrease

C) HARİÇ TUTULANLAR (balance_impact = none):
   - Hesaplar arası transferler
   - Vadeli hesap açılış/kapanış
   - Teknik düzeltmeler

═══════════════════════════════════════════════════════════════════════════════
KRİTİK AYRIMLAR (Sık Karıştırılan Durumlar)
═══════════════════════════════════════════════════════════════════════════════

1. KREDİ İŞLEMLERİ:
   ✓ "TİCARİ AMAÇLI KRD.KULL" (pozitif) → KREDI_IN (FINANCING, liability_increase)
   ✓ "O4-(TİCARİ AMAÇLI KREDİ TAHS.)" (negatif) → KREDI_OUT (EXPENSE, equity_decrease)
   ✓ "KREDİLİ HESAP FAİZ TAHSİLATI" (negatif) → FAIZ_OUT (FINANCING, liability_increase)
   
   ⚠️ DİKKAT: Kredi taksiti = Anapara + Faiz karışık olabilir. 
   Tek kalem görünüyorsa → KREDI_OUT olarak işaretle.

2. ORTAK İŞLEMLERİ:
   ✓ "HVL-borç -KİŞİ ADI" (negatif) → ORTAK_OUT (şirketten çekim)
   ✓ "HVL-iade -KİŞİ ADI" (pozitif) → ORTAK_IN (şirkete iade)
   ✓ "HVL-sermaye -KİŞİ ADI" (pozitif) → ORTAK_IN (sermaye artışı)
   
   ⚠️ İPUCU: "borç", "şahsi", "kişisel" kelimeleri + kişi adı = ORTAK işlemi

3. FAİZ İŞLEMLERİ:
   ✓ "FAİZ % 25,00" + pozitif tutar → FAIZ_IN (mevduat faizi, INCOME)
   ✓ "FAİZ TAHSİLATI" + negatif tutar → FAIZ_OUT (kredi faizi, FINANCING)
   ✓ "BSMV" → VERGİ (faiz üzerinden alınan vergi)

4. DÖVİZ İŞLEMLERİ:
   ✓ "DÖVİZ SATIŞ" + pozitif TL → DOVIZ_IN (döviz sattı, TL aldı)
   ✓ "DÖVİZ ALIŞ" + negatif TL → DOVIZ_OUT (TL verdi, döviz aldı)

5. VADELİ HESAP:
   ✓ "VAD.HES.AÇILIŞI" (negatif) → EXCLUDED (para vadeli hesaba gitti)
   ✓ "MEVDUAT GERİ DÖNÜŞÜ" (pozitif) → EXCLUDED (anapara geri döndü)
   ✓ Aradaki fark olan FAİZ ayrı satırda görünür → FAIZ_IN

6. BANKA MASRAFLARI:
   ✓ "KESİNTİ VE EKLERİ-borç" (genelde 3-12 TL) → BANKA
   ✓ "KESİNTİ VE EKLERİ-" + açıklama → Açıklamaya göre (FUAR, SEYAHAT vb.)
   ✓ "EFT MASRAF", "HAVALE MASRAF" → BANKA
   ✓ "Giden Fon Transferi Ücreti" → BANKA
   ✓ "BSMV" → VERGİ (ayrı kategorile)
   ✓ "Tahsis Ücreti", "Teminat Tesis Ücr." → BANKA (kredi açılış masrafı)

7. VERGİ İŞLEMLERİ:
   ✓ "VERGİ" kelimesi içeren → VERGİ
   ✓ "BSMV" → VERGİ (Banka Sigorta Muamele Vergisi)
   ✓ "00486/6392392 VERGİ" → VERGİ (stopaj kesintisi)
   ✓ GİB ödemeleri → VERGİ
   
8. SİGORTA İŞLEMLERİ:
   ✓ "Eureko", "ALLIANZ", "AXA", "ANADOLU SİGORTA" → SIGORTA
   ✓ "KASKO", "TRAFİK", "POLİÇE" → SIGORTA
   ✓ "Prim Tahsilatı" → SIGORTA

9. FATURA ÖDEMELERİ (Açıklama İpuçları):
   ✓ "-GIB" veya "GIB20" içeren → Muhtemelen fatura ödemesi, açıklamaya bak
   ✓ "FATURA", "FT" → Fatura ödemesi
   ✓ "ÖDEME", "HESABA" → Müşteriden tahsilat olabilir

═══════════════════════════════════════════════════════════════════════════════
GENİŞLETİLMİŞ KATEGORİ KODLARI (43 adet)
═══════════════════════════════════════════════════════════════════════════════

GELİR (INCOME) - 12 kod:

| Kod | Açıklama | Anahtar Kelimeler |
|-----|----------|-------------------|
| SBT | SBT Tracker Geliri | SBT, KARBON, CARBON, AYAK İZİ, EMİSYON, TRACKER |
| L&S | Leadership & Sustainability | LEADERSHIP, LEADERSHİP, SUSTAINABILITY, L&S |
| DANIS | Danışmanlık Geliri | DANIŞMANLIK, CONSULTING, MÜŞAVIR |
| ZDHC | ZDHC/InCheck Geliri | ZDHC, INCHECK, MRSL, KİMYASAL, DOĞRULAMA |
| MASRAF | Masraf Yansıtma | MASRAF İADE, MASRAF GERİ, EXPENSE REFUND |
| BAYI | Bayilik Gelirleri | BAYİ, DISTRIBUT, DEALER, KOMİSYON GELİR |
| EGITIM_IN | Eğitim Gelirleri | EĞİTİM, TRAINING, SEMİNER, WORKSHOP |
| RAPOR | Rapor/Sertifika | RAPOR, REPORT, SERTİFİKA, BELGE |
| FAIZ_IN | Faiz Geliri | FAİZ + pozitif, MEVDUAT FAİZ, YENİ ORAN % |
| KIRA_IN | Kira Geliri | KİRA GELİR, RENT INCOME |
| DOVIZ_IN | Döviz Satış Karı | DÖVİZ SATIŞ, FX SELL |
| DIGER_IN | Diğer Gelirler | (Yukarıdakilere uymayan pozitif) |

GİDER (EXPENSE) - 21 kod:

| Kod | Açıklama | Anahtar Kelimeler |
|-----|----------|-------------------|
| SEYAHAT | Seyahat/Konaklama | SANTA TURİZM, OTEL, HOTEL, THY, PEGASUS, BOOKING, TRANSFERİ |
| FUAR | Fuar/Reklam/Pazarlama | FUAR, STAND, REKLAM, KARTVİZİT, ÖRÜMCEK, PATENT |
| HGS | Ulaşım/Yakıt | HGS, OGS, YAKIT, PETROL, SHELL, BP, OPET, KÖPRÜ, OTOPARK, Avrasya, Kuzey Marmara, Gebze İzmir |
| SIGORTA | Sigorta Primleri | SİGORTA, KASKO, TRAFİK, Eureko, ALLIANZ, AXA, POLİÇE, Prim Tahsilatı |
| TELEKOM | Telekomünikasyon | TURKCELL, TRKCLL, VODAFONE, TÜRK TELEKOM, INTERNET |
| BANKA | Banka Masrafları | KESİNTİ VE EKLERİ, KOMİSYON, EFT MASRAF, HESAP İŞLETİM, Giden Fon Transferi, Tahsis Ücreti |
| OFIS | Ofis/Kırtasiye | KIRTASİYE, OFİS, OFFICE, TONER, KAĞIT, MOBİLYA küçük |
| YEMEK | Yemek/İkram | YEMEK, RESTAURANT, CAFE, STARBUCKS, GETİR, İKRAM |
| PERSONEL | Personel Giderleri | MAAŞ, BORDRO, SGK, SSK, PRİM, ÇALIŞAN |
| YAZILIM | Yazılım/Abonelik | YAZILIM, SOFTWARE, ADOBE, MICROSOFT, GOOGLE, ZOOM, AWS, SUBSCRIPTION |
| MUHASEBE | Muhasebe/Mali Müşavir | MUHASEBE, YMM, SMMM, BEYANNAME, MALİ MÜŞAVİR |
| HUKUK | Hukuk/Noter | AVUKAT, HUKUK, NOTER, DAVA, VEKİL |
| VERGI | Vergi/Harç | VERGİ, KDV, STOPAJ, MTV, DAMGA, BSMV, GİB, VERGİ DAİRESİ |
| KIRA_OUT | Kira Gideri | KİRA, RENT, OFİS KİRA, DEPO KİRA |
| KARGO | Kargo/Nakliye | KARGO, ARAS, MNG, YURTIÇI, UPS, DHL, PTT |
| HARICI | Harici Danışman | HARİCİ, DIŞ HİZMET, TAŞERON, SUB-CONTRACT, DANIŞMANLIK + GİDEN |
| IADE | İade/İptal | İADE, REFUND, RETURN, İPTAL |
| DOVIZ_OUT | Döviz Alış | DÖVİZ ALIŞ, FX BUY |
| KREDI_OUT | Kredi Taksit/Ödeme | KREDİ TAHS, LOAN PAYMENT, O4-(TİCARİ AMAÇLI KREDİ |
| DIGER_OUT | Diğer Giderler | (Yukarıdakilere uymayan negatif GİDER) |
| DANIS_OUT | Danışmanlık Gideri | DANIŞMANLIK + negatif, HİZMET BEDELİ + EFT/FAST giden |

ORTAK (PARTNER) - 2 kod:

| Kod | Açıklama | Tespit Yöntemi |
|-----|----------|----------------|
| ORTAK_OUT | Ortağa Ödeme | Kişi adı + (borç OR şahsi OR kişisel) + negatif |
| ORTAK_IN | Ortaktan Tahsilat | Kişi adı + (iade OR sermaye) + pozitif |

YATIRIM (INVESTMENT) - 2 kod:

| Kod | Açıklama | Tespit Yöntemi |
|-----|----------|----------------|
| EKIPMAN | Ekipman/Makine | EKİPMAN, MAKİNE, CİHAZ, BİLGİSAYAR, SERVER, DEMİRBAŞ + >10.000 TL |
| ARAC | Araç Alımı | ARAÇ, OTOMOBİL, TOGG, TAŞIT + >50.000 TL |

FİNANSMAN (FINANCING) - 3 kod:

| Kod | Açıklama | Anahtar Kelimeler |
|-----|----------|-------------------|
| KREDI_IN | Kredi Kullanımı | TİCARİ AMAÇLI KRD.KULL, BR.KAMP.KULL, KREDİ KULLANIM + pozitif |
| LEASING | Finansal Kiralama | LEASING, FİNANSAL KİRALAMA |
| FAIZ_OUT | Faiz Gideri | FAİZ TAHSİLATI, KREDİLİ HESAP FAİZ, INTEREST + negatif |

HARİÇ (EXCLUDED) - 3 kod:

| Kod | Açıklama | Anahtar Kelimeler |
|-----|----------|-------------------|
| IC_TRANSFER | İç Transfer | VİRMAN, HESAPLAR ARASI, KENDİ HESABIMA |
| NAKIT_CEKME | Nakit Çekim | ATM, NAKİT ÇEKİM (ortak değilse) |
| EXCLUDED | Hariç Tutulacak | VAD.HES.AÇILIŞI, MEVDUAT GERİ, REFERANS KAPAMA, BAL TRN |

═══════════════════════════════════════════════════════════════════════════════
ÇOK ADIMLI ANALİZ PROSEDİRÜ
═══════════════════════════════════════════════════════════════════════════════

Her işlem için şu adımları sırayla uygula:

ADIM 1: İŞLEM TİPİ TESPİTİ
- Prefix'e bak (EF, MOBIL-FAST, CEP ŞUBE-HVL, INT-HVL, KESİNTİ, O4, HGS, vb.)
- İşlem kanalını belirle

ADIM 2: TUTAR ANALİZİ
- Pozitif mi negatif mi?
- Büyüklük: <100 TL (düşük), 100-10.000 TL (orta), >10.000 TL (yüksek)
- Yuvarlak sayı mı? (1.000, 5.000, 50.000 → ortak/transfer olabilir)

ADIM 3: ANAHTAR KELİME TARAMASI
- Açıklamadaki tüm kelimeleri tara
- Birden fazla kategori eşleşirse → en spesifik olanı seç

ADIM 4: KARŞI TARAF ANALİZİ
- Karşı taraf bir şirket mi? (A.Ş., LTD, SANAYİ) → Muhtemelen ticari
- Karşı taraf bir kişi mi? → Ortak/şahsi olabilir
- Karşı taraf bir kurum mu? (TURKCELL, Eureko, HGS) → İlgili kategori

ADIM 5: BAĞLAM DEĞERLENDİRMESİ
- Açıklamadaki ek notlar (fatura no, referans)
- "GIB" içeriyorsa muhtemelen fatura ilişkili
- Kişi adı + "borç/iade" → ORTAK

ADIM 6: CONFIDENCE BELİRLEME
- Kesin eşleşme (1+ güçlü ipucu) → 0.95-1.0
- Muhtemel eşleşme → 0.80-0.94
- Belirsiz (birden fazla olasılık) → 0.60-0.79
- Tahmin → 0.40-0.59

═══════════════════════════════════════════════════════════════════════════════
ÖZEL DURUMLAR VE İSTİSNALAR
═══════════════════════════════════════════════════════════════════════════════

1. "KESİNTİ VE EKLERİ" AYIRIMI:
   - Tek başına veya "borç" ile → BANKA
   - "+ açıklama" varsa → Açıklamaya göre (örn: "KESİNTİ VE EKLERİ-KARTVİZİT" → FUAR)
   - "Faiz / Komisyon" içeriyorsa → BANKA

2. DANIŞMANLIK AYIRIMI:
   - Pozitif tutar + DANIŞMANLIK → DANIS (gelir)
   - Negatif tutar + DANIŞMANLIK/HİZMET BEDELİ → HARICI veya DANIS_OUT (gider)

3. HGS DETAYLARI:
   - "Düzenli Talimat" → Otomatik yükleme
   - "Gebze İzmir", "Kuzey Marmara", "Avrasya Tüneli" → Güzergah bilgisi, yine HGS
   - "Geri Ödeme" → HGS iade (yine HGS kategorisi, pozitif)

4. TEKSTİL FİRMALARI:
   - TEKSTİL, MENSUCAT, DENİM, DOKUMA, BOYA, APRE, KONFEKSİYON içeren firmalar
   - Pozitif → Muhtemelen danışmanlık/SBT geliri
   - Firma adında sektör ipucu varsa confidence artır

5. DÜŞÜK TUTARLI İŞLEMLER (<20 TL):
   - Çoğunlukla banka masrafı
   - 3.19 TL, 6.39 TL, 12.80 TL → Standart EFT/Havale masrafları

═══════════════════════════════════════════════════════════════════════════════
ÇIKTI FORMATI
═══════════════════════════════════════════════════════════════════════════════

Her işlem için:
{
  "index": 0,
  "categoryCode": "HGS",
  "categoryType": "EXPENSE", 
  "confidence": 1.0,
  "reasoning": "HGS prefix + ulaşım",
  "counterparty": "HGS",
  "affects_pnl": true,
  "balance_impact": "equity_decrease"
}

⚠️ KRİTİK: HER İŞLEM MUTLAKA KATEGORİLENMELİ - ATLAMA YOK!

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
                            // INCOME (12)
                            'SBT', 'L&S', 'DANIS', 'ZDHC', 'MASRAF', 'BAYI', 'EGITIM_IN', 'RAPOR', 'FAIZ_IN', 'KIRA_IN', 'DOVIZ_IN', 'DIGER_IN',
                            // EXPENSE (21)
                            'SEYAHAT', 'FUAR', 'HGS', 'SIGORTA', 'TELEKOM', 'BANKA', 'OFIS', 'YEMEK', 'PERSONEL', 'YAZILIM', 'MUHASEBE', 'HUKUK', 'VERGI', 'KIRA_OUT', 'KARGO', 'HARICI', 'IADE', 'DOVIZ_OUT', 'KREDI_OUT', 'DIGER_OUT', 'DANIS_OUT',
                            // PARTNER (2)
                            'ORTAK_OUT', 'ORTAK_IN',
                            // INVESTMENT (2)
                            'EKIPMAN', 'ARAC',
                            // FINANCING (3)
                            'KREDI_IN', 'LEASING', 'FAIZ_OUT',
                            // EXCLUDED (3)
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
        console.error(`Batch ${batchIndex + 1}: JSON parse error`, parseError);
      }
    }
    
    console.error(`Batch ${batchIndex + 1}: No valid tool call response`);
    return { batchIndex, results: [], success: false };
    
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Batch ${batchIndex + 1}: Request timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`Batch ${batchIndex + 1}: Error -`, error);
    }
    return { batchIndex, results: [], success: false };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions } = await req.json();
    
    if (!transactions || !Array.isArray(transactions)) {
      return new Response(
        JSON.stringify({ error: 'Transactions array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting categorization: ${transactions.length} transactions`);

    // Create batches
    const batches: any[][] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      batches.push(transactions.slice(i, i + BATCH_SIZE));
    }

    const allResults: CategoryResult[] = [];
    let successfulBatches = 0;
    let failedBatches = 0;

    // Process batches in parallel groups with retry mechanism
    for (let i = 0; i < batches.length; i += PARALLEL_BATCH_COUNT) {
      const parallelBatches = batches.slice(i, i + PARALLEL_BATCH_COUNT);
      
      const promises = parallelBatches.map(async (batch, idx) => {
        const batchIndex = i + idx;
        const startIdx = batchIndex * BATCH_SIZE;
        
        // First attempt
        let result = await processSingleBatch(batch, startIdx, batchIndex, batches.length, apiKey);
        
        // Retry once if failed
        if (!result.success) {
          console.log(`Batch ${batchIndex + 1} failed, retrying after 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await processSingleBatch(batch, startIdx, batchIndex, batches.length, apiKey);
          
          if (result.success) {
            console.log(`Batch ${batchIndex + 1} retry succeeded!`);
          } else {
            console.log(`Batch ${batchIndex + 1} retry also failed`);
          }
        }
        
        return result;
      });

      const batchResults = await Promise.all(promises);
      
      for (const result of batchResults) {
        if (result.success) {
          allResults.push(...result.results);
          successfulBatches++;
        } else {
          failedBatches++;
        }
      }

      // Small delay between parallel groups to avoid rate limiting
      if (i + PARALLEL_BATCH_COUNT < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Categorization complete: ${allResults.length} results, ${successfulBatches} successful batches, ${failedBatches} failed`);

    return new Response(
      JSON.stringify({ 
        results: allResults,
        stats: {
          total: transactions.length,
          categorized: allResults.length,
          successfulBatches,
          failedBatches
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Categorization error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
