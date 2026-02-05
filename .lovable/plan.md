
# Professional Analysis Accordion'larını Kaldırma Planı

## Silinecek Bölümler

Görüntüdeki 3 accordion silinecek:
1. **Scenario Comparison** - Senaryo karşılaştırma kartları
2. **Trend Analysis** - Item trend analiz kartları
3. **Sensitivity Analysis** - Duyarlılık analiz tablosu

## Kalacak Bölüm

- **Financial Ratios** - Finansal oranlar paneli (mevcut haliyle kalacak)

---

## Teknik Değişiklikler

### Dosya: `src/pages/finance/ScenarioComparisonPage.tsx`

**Satır 1803-1886** arasındaki Accordion yapısı sadeleştirilecek:

```text
Silinecek:
- Satır 1804-1837: Scenario Comparison AccordionItem
- Satır 1838-1855: Trend Analysis AccordionItem  
- Satır 1872-1885: Sensitivity Analysis AccordionItem

Kalacak:
- Satır 1857-1870: Financial Ratios AccordionItem
```

**Condition güncellemesi** (satır 1796):
```typescript
// Eski
{(financialRatios || sensitivityAnalysis || itemTrendAnalysis || quarterlyItemized) && (

// Yeni (sadece financialRatios kontrolü)
{financialRatios && (
```

### Kaldırılabilecek İlgili Import'lar

Artık kullanılmayan import'lar temizlenecek:
- `SensitivityTable` - artık kullanılmıyor
- `ItemTrendCards` - artık kullanılmıyor
- `ScenarioComparisonCards` - artık kullanılmıyor
- `Activity` icon - artık kullanılmıyor

### Kaldırılabilecek useMemo Hesaplamaları

Eğer başka yerde kullanılmıyorsa:
- `itemTrendAnalysis` useMemo (satır ~800)
- `sensitivityAnalysis` useMemo

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `ScenarioComparisonPage.tsx` | 3 AccordionItem sil, condition sadeleştir, kullanılmayan import'ları kaldır |

---

## Sonuç

- Professional Analysis bölümü sadece **Financial Ratios** accordion'unu içerecek
- Sayfa daha temiz ve odaklı olacak
- Kullanılmayan kod kaldırılarak bakım kolaylaşacak
