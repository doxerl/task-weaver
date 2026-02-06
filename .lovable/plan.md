

# Deal Skoru Değerleme Terminolojisi Güncellemesi

## Hedef

"Ucuz" (Cheap) terimini daha profesyonel "Cazip" (Attractive) ile değiştirmek.

---

## Mevcut Durum

| Değer | İngilizce | Türkçe (Mevcut) |
|-------|-----------|-----------------|
| cheap | Cheap | Ucuz |
| fair | Fair | Adil |
| premium | Premium | Premium |

---

## Yeni Terminoloji

| Değer | İngilizce | Türkçe (Yeni) |
|-------|-----------|---------------|
| cheap | Attractive | **Cazip** |
| fair | Fair | Adil |
| premium | Premium | Premium |

---

## Dosya Değişiklikleri

### 1. i18n Türkçe Çevirileri
**`src/i18n/locales/tr/simulation.json`**
- `aiSummary.verdictCheap`: "Ucuz" → "Cazip"
- `pdf.investor.verdictCheap`: "Ucuz" → "Cazip"

### 2. i18n İngilizce Çevirileri
**`src/i18n/locales/en/simulation.json`**
- `aiSummary.verdictCheap`: "Cheap" → "Attractive"
- `pdf.investor.verdictCheap`: "Cheap" → "Attractive"

---

## Etkilenen Bileşenler

| Bileşen | Konum |
|---------|-------|
| AIAnalysisSummaryCard | UI Dashboard |
| PdfInvestorPage | PDF Export |

---

## Sonuç

- ✅ Daha profesyonel terminoloji
- ✅ Yatırımcı perspektifinden olumlu çağrışım ("Cazip fırsat")
- ✅ UI ve PDF senkronize

