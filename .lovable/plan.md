
# Acilis Degerlerinin Kumulatif Hesaplanmasi

## Sorun
5 Yillik Projeksiyon Tablosunda "Acilis" (opening) degerleri kumulatif degil. Her yilin acilis degeri sadece bir onceki yilin net karini gosteriyor, oysa onceki yillarin birikimini de icermeli.

Mevcut durum (yanlis):
- 2025 Baz: - | $147.9K | $121.4K | $24.3K
- 2026 Senaryo: $24.3K (dogru) | ... | $33.9K
- 2027: $33.9K (YANLIS) | ... | $244.6K
- 2028: $278.5K (YANLIS) | ...

Olmasi gereken (kumulatif):
- 2026 Senaryo: $24.3K | ... | $33.9K
- 2027: $24.3K + $33.9K = $58.2K | ...
- 2028: $58.2K + $244.6K = $302.8K | ...

## Temel Neden
`useInvestorAnalysis.ts` icindeki `calculateMultiYearCapitalNeeds` fonksiyonu `year1NetProfit` parametresini alip bunu ilk yilin (2027) acilis nakiti olarak kullaniyor. Ancak bu deger sadece 2026 senaryosunun net karidir ($33.9K), 2025 baz yilindan devir eden $24.3K dahil edilmemis.

## Cozum

### Dosya 1: `src/components/simulation/InvestmentTab.tsx`
`calculateMultiYearCapitalNeeds` fonksiyonuna gecirilen `year1NetProfit` parametresini baz yil net karini da icerecek sekilde guncelle:

```typescript
// Mevcut (satir 184):
summaryA.netProfit, // Year 1 net profit

// Yeni:
(baseYearData?.netProfit || 0) + summaryA.netProfit, // Cumulative: base year + scenario year
```

Bu tek satirlik degisiklik ile:
- 2027 acilisi: $24.3K + $33.9K = $58.2K (kumulatif)
- Sonraki yillar da otomatik olarak dogru hesaplanacak (cunku `carryForwardCash = endingCash + requiredCapital` zaten kumulatif calisiyor)

### Dosya 2: Degisiklik yok
`useInvestorAnalysis.ts` icindeki hesaplama mantigi zaten kumulatif calisacak sekilde yazilmis. Sadece baslangic degeri yanlis.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/components/simulation/InvestmentTab.tsx` | `calculateMultiYearCapitalNeeds` cagrisinda `year1NetProfit` parametresine `baseYearData.netProfit` eklenmesi |

## Etki
- 5 yillik projeksiyon tablosundaki tum acilis degerleri kumulatif olacak
- Death valley ve sermaye ihtiyaci hesaplamalari da buna bagli olarak daha dogru sonuc verecek
- `selfSustainingFromYear` tespiti de kumulatif nakit ile yapilacagi icin daha gercekci olacak
