

# Print Sorunlari Duzeltme: Bos Sayfa ve Tiklanabilir Elementler

## Tespit Edilen Sorunlar

### 1. Bos sayfa sorunu
PrintCoverPage `minHeight: 100vh` ve `page-break-after` kullaniyor. Kapak sayfasindan sonra icerik dogru gorunmuyor - kapak sayfasi gereksiz yer kapliyor.

### 2. Tiklanabilir aksyon kartlari PDF'te gorunuyor
AIAnalysisSummaryCard icindeki su aksyon kartlari `<Card>` elementi olarak render ediliyor (button degil), dolayisiyla `button:not(.pdf-include)` CSS kurali onlari yakalayamiyor:
- "Pitch Deck - 5 slaytlik yatirimci sunumu" (Card onClick)
- "2027'e Gec - AI projeksiyonuyla yeni yil" (Card onClick)

### 3. Diger gizlenmesi gereken interaktif elementler
- AnalysisHistoryPanel (Collapsible trigger butonu)
- DataChangedWarning (uyari + buton)
- AI analiz "Analiz Et" butonu

## Cozum

### Dosya 1: `src/components/simulation/AIAnalysisSummaryCard.tsx`
Aksyon kartlari grid'ine `print-hidden` sinifi ekle:

```
// Satir 338
<div className="grid grid-cols-2 gap-3 print-hidden">
```

Bu tek degisiklik hem "Pitch Deck" hem "2027'e Gec" kartlarini print'ten gizler.

Ayrica AI analiz butonlarina da `print-hidden` ekle (eger varsa).

### Dosya 2: `src/components/simulation/PrintCoverPage.tsx`
- `minHeight: 100vh` kaldirilarak sayfa yuksekligi dogal boyuta birakilacak
- `page-break-after` sinifi korunacak ama gereksiz bosluk onlenecek
- Daha kompakt bir kapak sayfasi tasarimi

### Dosya 3: `src/pages/finance/ScenarioComparisonPage.tsx`
- AnalysisHistoryPanel container'ina `print-hidden` sinifi ekle
- DataChangedWarning container'ina `print-hidden` sinifi ekle

### Dosya 4: `src/lib/pdf/styles/print.css`
Ek CSS kurallari:
```css
@media print {
  /* Cursor-pointer olan Card'lari gizle (aksyon kartlari) */
  .cursor-pointer {
    display: none !important;
  }
}
```
Bu genel kural, tiklanabilir tum Card elementlerini print'ten gizler (fallback olarak).

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/components/simulation/AIAnalysisSummaryCard.tsx` | Aksyon kartlari grid'ine `print-hidden` ekle |
| `src/components/simulation/PrintCoverPage.tsx` | `minHeight: 100vh` kaldir, kompakt tasarim |
| `src/pages/finance/ScenarioComparisonPage.tsx` | History panel ve warning'e `print-hidden` ekle |
| `src/lib/pdf/styles/print.css` | `cursor-pointer` gizleme kurali ekle |

