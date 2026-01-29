
## AI Analiz Motoru Değerleme Entegrasyonu Planı

### Problem Özeti

Yeni eklenen **EBITDA**, **DCF**, **VC Method** ve **ağırlıklı değerleme** verileri frontend'de hesaplanıp `ExitPlan.allYears` array'inde saklanıyor. Ancak `unified-scenario-analysis` Edge Function bu verileri AI prompt'una **dahil etmiyor**.

### Eksik Veri Akışı

```text
┌─────────────────────────────────────────────────────────────────┐
│  VERİ AKIŞI ANALİZİ                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ useInvestorAnalysis.ts                                      │
│  │   projectFutureRevenue() →                                   │
│  │   allYears[i] = {                                            │
│  │     ebitda, ebitdaMargin, freeCashFlow,                      │
│  │     valuations: { revenueMultiple, ebitdaMultiple,           │
│  │                   dcf, vcMethod, weighted }                  │
│  │   }                                                          │
│  │                                                              │
│  ▼                                                              │
│  ✅ useUnifiedAnalysis.ts (line 417)                            │
│  │   exitPlan: trimmedExitPlan (ilk 5 yıl gönderiliyor)        │
│  │                                                              │
│  ▼                                                              │
│  ❌ unified-scenario-analysis/index.ts                          │
│     userPrompt içinde:                                          │
│     - exitPlan.postMoneyValuation ✅                            │
│     - exitPlan.investorShare3Year ✅                            │
│     - exitPlan.moic3Year/5Year ✅                               │
│     - exitPlan.allYears[*].ebitda ❌ (KULLANILMIYOR)           │
│     - exitPlan.allYears[*].valuations ❌ (KULLANILMIYOR)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Çözüm: Edge Function Prompt Güncelleme

**Dosya:** `supabase/functions/unified-scenario-analysis/index.ts`

"HESAPLANMIŞ EXIT PLANI" bölümünden sonra yeni bir bölüm eklenecek:

```typescript
// Lines 687-688 arasına eklenecek
const projectionDetailSection = exitPlan.allYears && exitPlan.allYears.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 5 YILLIK FİNANSAL PROJEKSİYON DETAYLARI (HESAPLANMIŞ):

${exitPlan.allYears.map((year: any, i: number) => {
  const valuations = year.valuations || {};
  return `
🗓️ ${year.actualYear || (scenarioYear + i + 1)} (${year.growthStage === 'aggressive' ? 'Agresif' : 'Normalize'} Aşama):
- Gelir: $${(year.revenue || 0).toLocaleString()}
- Gider: $${(year.expenses || 0).toLocaleString()}
- Net Kâr: $${(year.netProfit || 0).toLocaleString()}
- EBITDA: $${(year.ebitda || 0).toLocaleString()} (Marj: %${(year.ebitdaMargin || 0).toFixed(1)})
- Serbest Nakit Akışı (FCF): $${(year.freeCashFlow || 0).toLocaleString()}
- Büyüme Oranı: %${((year.appliedGrowthRate || 0) * 100).toFixed(1)}

DEĞERLEME METODLARI:
├─ Ciro Çarpanı (${dealConfig.sectorMultiple}x): $${(valuations.revenueMultiple || 0).toLocaleString()}
├─ EBITDA Çarpanı: $${(valuations.ebitdaMultiple || 0).toLocaleString()}
├─ DCF (%30 iskonto): $${(valuations.dcf || 0).toLocaleString()}
├─ VC Metodu (10x ROI): $${(valuations.vcMethod || 0).toLocaleString()}
└─ Ağırlıklı Değerleme: $${(valuations.weighted || year.companyValuation || 0).toLocaleString()}
`;
}).join('\n')}

🔍 DEĞERLEME ANALİZ TALİMATLARI:
1. Ağırlıklı değerleme hesabı: Ciro (%30) + EBITDA (%25) + DCF (%30) + VC (%15)
2. Yatırımcı sunumunda 5. yıl ağırlıklı değerlemeyi kullan
3. EBITDA marjı trendi: İlk yıllardan son yıllara nasıl değişiyor?
4. DCF değerlemesi vs Revenue Multiple farkını yorumla
5. VC metodunun gerçekçiliğini değerlendir (10x ROI makul mü?)
` : '';
```

### Ek Olarak: AI Prompt'a Değerleme Rehberi Ekleme

System prompt'una (`getUnifiedMasterPrompt` fonksiyonu) değerleme metodları açıklaması eklenmeli:

```typescript
const VALUATION_METHODOLOGY_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 DEĞERLEME METODOLOJİSİ (4 METOT + AĞIRLIKLI):

1. CİRO ÇARPANI (%30 Ağırlık):
   Formül: Yıllık Gelir × Sektör Çarpanı (SaaS: 8x, E-ticaret: 2.5x, Fintech: 6x)
   Kullanım: En yaygın early-stage değerleme metodu

2. EBITDA ÇARPANI (%25 Ağırlık):
   Formül: EBITDA × EBITDA Çarpanı (SaaS: 15x, E-ticaret: 8x, Fintech: 12x)
   Kullanım: Kârlı şirketler için daha güvenilir

3. DCF - İNDİRGENMİŞ NAKİT AKIŞI (%30 Ağırlık):
   Formül: 5 yıllık FCF NPV + Terminal Value (Gordon Growth)
   Parametreler: %30 iskonto oranı, %3 terminal büyüme
   Kullanım: Uzun vadeli değer için en sofistike metot

4. VC METODU (%15 Ağırlık):
   Formül: 5. Yıl Çıkış Değeri ÷ Beklenen ROI (10x)
   Kullanım: Yatırımcı perspektifinden bugünkü değer

📊 AĞIRLIKLI ORTALAMA:
Final = (Ciro × 0.30) + (EBITDA × 0.25) + (DCF × 0.30) + (VC × 0.15)

⚠️ ANALİZ KURALLARI:
- Tüm değerleme rakamlarını HESAPLANMIŞ veriden al, UYDURMA
- Farklı metodlar arasındaki farkı yorumla
- En güvenilir metodu şirketin durumuna göre belirt
- Pitch deck'te ağırlıklı değerlemeyi kullan
`;
```

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `supabase/functions/unified-scenario-analysis/index.ts` | userPrompt'a 5 yıllık projeksiyon detayları + değerleme metodları bölümü ekle |

### Beklenen Sonuç

| Metrik | Önceki | Sonraki |
|--------|--------|---------|
| AI'a gönderilen değerleme verisi | Sadece post-money, MOIC | 4 metot + EBITDA + FCF + ağırlıklı |
| AI'ın değerleme anlayışı | Sınırlı | Tam kapsamlı |
| Pitch deck değerleme doğruluğu | Genel ifadeler | Spesifik $ ve metodoloji |
| Deal score hesaplama kalitesi | Eksik | Veri odaklı |

### Teknik Notlar

- `exitPlan.allYears` zaten frontend'den gönderiliyor (line 417), sadece prompt'a yazılmıyor
- `trimmedExitPlan` ilk 5 yılı alıyor (payload optimizasyonu)
- Edge Function deployment sonrası cache'li analizler eski kalacak - kullanıcıya "Yeniden Analiz" önerilmeli
