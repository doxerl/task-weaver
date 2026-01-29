

## Bilanço Parse Sorunlarını Düzeltme Planı

### Problem Özeti

PDF'teki bilanço **dengelidir** (Aktif = Pasif = ₺5.125.062,20), ancak AI parse sonucu:
- Aktif: ₺5.125.062,20 ✅
- Pasif: ₺6.438.700,30 ❌ (Fark: ₺1.313.638)

Sorunun kaynağı: **Negatif bakiyeli hesapların yanlış işlenmesi**

---

### Tespit Edilen Hatalar

| Hata | Detay |
|------|-------|
| Negatif değer işleme | Parantez içi (negatif) değerler yanlış parse ediliyor |
| Eksik hesap kodları | 368, 540, 591 gibi kodlar mapping'de yok |
| AI prompt eksikliği | AI'ya negatif bakiyeli hesapların nasıl işleneceği tam anlatılmamış |
| Dönem zararı hesabı | 590 (kar) var ama 591 (zarar) yok |

---

### Çözüm 1: Edge Function Prompt Güncelleme

`supabase/functions/parse-balance-sheet/index.ts` - AI prompt'una ekleme:

```text
ÖNEMLİ KURALLAR:

1. Parantez içindeki değerler (örn: "(257.862,53)") NEGATİF bakiyedir.

2. Pasif hesaplarda negatif bakiye demek borç tarafı fazla demektir:
   - 331 Ortaklara Borçlar: (257.862,53) → Bu aslında ortaklardan ALACAK
   - debitBalance: 257862.53, creditBalance: 0 olarak kaydet

3. Özkaynaklar kısmında:
   - 501 Ödenmemiş Sermaye: Her zaman negatif göster
   - 591 Dönem Net Zararı: Negatif bakiye (debitBalance'ta göster)
   - 590 Dönem Net Karı: Pozitif bakiye (creditBalance'ta göster)

4. Birikmiş Amortisman (257): Her zaman creditBalance'ta pozitif olarak göster
```

---

### Çözüm 2: Eksik Hesap Kodları Ekleme

`src/types/officialFinance.ts` - BALANCE_SHEET_ACCOUNT_MAP'e ekle:

```typescript
export const BALANCE_SHEET_ACCOUNT_MAP: Record<string, string> = {
  // ... mevcut kodlar ...
  
  // Eksik kodlar:
  '368': 'overdue_tax_payables',      // Vadesi Geçmiş Vergi
  '540': 'legal_reserves',            // Yasal Yedekler  
  '591': 'current_loss',              // Dönem Net Zararı
};
```

Veritabanı şemasına da bu alanları eklememiz gerekecek.

---

### Çözüm 3: Toplam Hesaplama Mantığını Düzeltme

Edge function'daki toplam hesaplama:

```typescript
for (const account of allAccounts) {
  const code = account.code.split('.')[0];
  
  if (code.startsWith('1') || code.startsWith('2')) {
    // AKTİF: debitBalance pozitif, creditBalance negatif etkili
    if (code === '257') {
      // Birikmiş amortisman - düşür
      totalAssets -= Math.abs(account.creditBalance || account.debitBalance || 0);
    } else {
      totalAssets += (account.debitBalance || 0) - (account.creditBalance || 0);
    }
  } else {
    // PASİF + ÖZKAYNAKLAR
    // Negatif bakiyeli hesaplar (331, 501, 591) için özel işlem
    const netBalance = (account.creditBalance || 0) - (account.debitBalance || 0);
    
    if (code === '501' || code === '591') {
      // Ödenmemiş sermaye ve zarar - zaten negatif olacak
      totalLiabilities += netBalance;
    } else {
      totalLiabilities += netBalance;
    }
  }
}
```

---

### Çözüm 4: Hook'taki Hesaplama Düzeltme

`src/hooks/finance/useBalanceSheetUpload.ts` - aynı mantık:

```typescript
for (const account of accounts) {
  const mainCode = account.code.split('.')[0];
  
  if (mainCode.startsWith('1') || mainCode.startsWith('2')) {
    // Aktif hesaplar
    if (mainCode === '257') {
      totalAssets -= Math.abs(account.creditBalance || account.debitBalance || 0);
    } else {
      totalAssets += (account.debitBalance || 0) - (account.creditBalance || 0);
    }
  } else {
    // Pasif + Özkaynak hesapları
    // Net bakiye = credit - debit (negatif olanlar otomatik düşer)
    const netBalance = (account.creditBalance || 0) - (account.debitBalance || 0);
    totalLiabilities += netBalance;
  }
}
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/parse-balance-sheet/index.ts` | Prompt güncelleme + toplam hesaplama düzeltme |
| `src/types/officialFinance.ts` | Eksik hesap kodları ekleme (368, 540, 591) |
| `src/hooks/finance/useBalanceSheetUpload.ts` | Toplam hesaplama mantığı düzeltme |

---

### Veritabanı Değişikliği (Opsiyonel)

Yeni alanlar eklemek için migration:

```sql
ALTER TABLE yearly_balance_sheets
ADD COLUMN IF NOT EXISTS overdue_tax_payables NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_reserves NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_loss NUMERIC DEFAULT 0;
```

---

### Beklenen Sonuç

| Metrik | Önceki | Sonraki |
|--------|--------|---------|
| Aktif Toplam | ₺5.125.062 | ₺5.125.062 |
| Pasif Toplam | ₺6.438.700 ❌ | ₺5.125.062 ✅ |
| Denge Durumu | Dengesiz | Dengeli |
| Negatif bakiyeler | Yanlış işleniyor | Doğru işlenecek |

