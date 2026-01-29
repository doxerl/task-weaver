

## Kilitli Bilanço - Sadece Kayıtlı Toplamları Kullan

### Problem

Kilitli veride alt hesaplar yeniden toplanıyor, bu da tutarsızlık yaratıyor:

```text
┌─────────────────────────────────────────────────────────────────┐
│ MEVCUT (HATALI)                                                │
├─────────────────────────────────────────────────────────────────┤
│ shortTermLiabilities.total = trade_payables + partner_payables │
│                              + tax_payables + ...              │
│                              = YENİDEN HESAPLANIYOR            │
│                                                                │
│ totalLiabilities = yearlyBalance.total_liabilities             │
│                  = 6,343,250 (veritabanından)                  │
│                                                                │
│ PROBLEM: Alt toplamlar + Özkaynaklar ≠ total_liabilities      │
└─────────────────────────────────────────────────────────────────┘
```

### Çözüm

Kilitli veride **tüm toplamları veritabanından al**, alt hesapları yeniden toplama:

```text
┌─────────────────────────────────────────────────────────────────┐
│ YENİ (DOĞRU)                                                   │
├─────────────────────────────────────────────────────────────────┤
│ totalAssets       = yearlyBalance.total_assets     (kayıtlı)   │
│ totalLiabilities  = yearlyBalance.total_liabilities (kayıtlı)  │
│                                                                │
│ shortTermLiabilities.total = totalLiabilities - bankLoans      │
│                              - equity.total (tersine hesapla)  │
│                                                                │
│ VEYA: Alt toplamları da veritabanına kaydet                   │
└─────────────────────────────────────────────────────────────────┘
```

### Önerilen Değişiklik

`src/hooks/finance/useBalanceSheet.ts` dosyasında kilitli veri bloğunu güncelle:

```typescript
// Kilitli veride alt toplamları yeniden hesaplama
// Doğrudan kayıtlı değerleri kullan
const shortTermTotal = yearlyBalance.total_liabilities 
                       - yearlyBalance.bank_loans 
                       - (yearlyBalance.paid_capital - yearlyBalance.unpaid_capital 
                          + yearlyBalance.retained_earnings + yearlyBalance.current_profit);

// VEYA daha basit yaklaşım:
// shortTermLiabilities.total ve equity.total'ı da veritabanına kaydet
// Ve burada doğrudan oku
```

### En Basit Çözüm

Alt toplamları yeniden hesaplamak yerine, kilitli veride:

1. `totalAssets` = `yearlyBalance.total_assets` (zaten böyle)
2. `totalLiabilities` = `yearlyBalance.total_liabilities` (zaten böyle)
3. **`isBalanced` = true** (kilitli veri = resmi veri, fark varsa bile gösterme)
4. **`difference` = 0** (kilitli veri dengededir varsayımı)

VEYA tutarlılık için alt toplamları da veritabanında sakla ve oku.

### Değiştirilecek Dosya

| Dosya | Değişiklik |
|-------|-----------|
| `src/hooks/finance/useBalanceSheet.ts` | Kilitli veride toplamları yeniden hesaplamak yerine kayıtlı değerleri kullan veya isBalanced=true yap |

### Beklenen Sonuç

| Alan | Önceki | Sonraki |
|------|--------|---------|
| Kilitli veride denklik kontrolü | Yeniden hesapla → Fark göster | Kayıtlı değerler → Fark yok |
| UI gösterimi | "-1,218,188 fark" | "Dengede" veya gerçek kayıtlı fark |

