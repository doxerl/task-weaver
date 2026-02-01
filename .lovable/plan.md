

## /finance/simulation Baz Yıl Verilerinin Düzeltilmesi

### Sorun

Görüntüdeki "2025 Baz Yıl" kartında:
- **Gelir**: $134.0K
- **Gider**: $0 (YANLIŞ!)
- **Net Kar**: $134.0K
- **Kar Marjı**: %100.0

Gider $0 görünüyor çünkü `useGrowthSimulation` hook'unda baz yıl verileri `useIncomeStatement(actualBaseYear)` ile çekilirken `forceRealtime` parametresi kullanılmıyor.

### Veri Akışı Analizi

| Sayfa | Hook Çağrısı | Sonuç |
|-------|--------------|-------|
| /finance/reports | `useIncomeStatement(year, { forceRealtime: true })` | Dinamik veri (doğru) |
| /finance/simulation | `useIncomeStatement(actualBaseYear)` | Resmi veri (giderler 0) |

Resmi gelir tablosunda sadece gelir ve kâr değerleri girilmiş, gider detayları boş bırakılmış. Bu yüzden simulation sayfasında giderler 0 olarak görünüyor.

### Çözüm

`useGrowthSimulation.ts` dosyasındaki `useIncomeStatement` çağrısına `forceRealtime: true` parametresi eklenecek.

**Önceki kod (satır 98):**
```typescript
const baseYearStatement = useIncomeStatement(actualBaseYear);
```

**Yeni kod:**
```typescript
const baseYearStatement = useIncomeStatement(actualBaseYear, { forceRealtime: true });
```

### Değiştirilecek Dosya

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useGrowthSimulation.ts` | Satır 98'e `{ forceRealtime: true }` ekle |

### Teknik Detay

`useIncomeStatement` hook'u `forceRealtime: true` aldığında:

1. Resmi veri kontrolünü (`isLocked && officialStatement`) atlar
2. Her zaman `useFinancialDataHub` üzerinden dinamik hesaplama yapar
3. Banka işlemleri, fişler ve bordro tahakkuklarından gerçek giderleri hesaplar

Bu değişiklik sonrası simülasyon sayfası, Reports sayfasıyla aynı kaynaktan (etiketlenmiş banka işlemleri ve fişler) veri çekecek.

### Beklenen Sonuç

Değişiklik sonrası "2025 Baz Yıl" kartı:
- **Gelir**: Reports sayfasındaki değerle aynı
- **Gider**: Reports sayfasındaki değerle aynı (artık 0 değil)
- **Net Kar**: Gelir - Gider (doğru hesaplama)
- **Kar Marjı**: Gerçek marj değeri

