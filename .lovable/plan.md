
## Kilitli Bilanço Denklik Farkı Sorunu

### Problem Analizi

Veritabanındaki 2025 kilitli bilanço verilerini analiz ettim:

| Alan | Değer |
|------|-------|
| `total_assets` (Kayıtlı) | 5,125,062 |
| `total_liabilities` (Kayıtlı) | 6,343,250 |
| **Denklik Farkı** | -1,218,188 |

Bu fark ekranda görüntüleniyor ve hesaplama `useBalanceSheet.ts` satır 130'da yapılıyor:
```typescript
difference: yearlyBalance.total_assets - yearlyBalance.total_liabilities,
```

### Sorunun Kaynağı

Sorun **veritabanındaki kayıtlı değerlerde**. PDF/Excel'den yüklenen bilançoda:

```text
Kayıtlı total_assets:      5,125,062
Kayıtlı total_liabilities: 6,343,250
Fark:                     -1,218,188
```

Bu tutarsızlık şu nedenlerden kaynaklanıyor olabilir:

1. **Parse edilen PDF'deki orijinal denklik farkı**: Yüklenen dosyada zaten bu fark varsa, olduğu gibi kaydedilmiş
2. **Kısmi hesap eksikliği**: raw_accounts verisinde bazı hesaplar parse edilememiş olabilir
3. **Hesap kodu eşleştirme sorunu**: 131 (Ortaklardan Alacaklar), 331 (Ortaklara Borçlar) gibi hesapların yanlış eşleşmesi

### raw_accounts Verisi Analizi

Veritabanındaki `raw_accounts` dizisinde şu hesaplar var:

**Aktif (Borç Bakiyeli):**
- 100 Kasa: 33,118.55
- 102 Bankalar: 68,194.77
- 120 Alıcılar: 2,610,664.11
- 190 Diğer KDV: 361.81
- 191 İndirilecek KDV: 83,804.09
- 254 Taşıtlar: 2,689,470.20
- 255 Demirbaşlar: 362,880.04
- 501 Ödenmemiş Sermaye: 100,000 (BORÇ - düşürücü)
- 331 Ortaklara Borçlar: 257,862.53 (BORÇ bakiyeli - bu anormal!)
- 591 Dönem Net Zararı: 1,025,196.63 (BORÇ)

**Pasif (Alacak Bakiyeli):**
- 257 Birikmiş Amortisman: 723,431.37
- 300 Banka Kredileri: 941,494.81
- 320 Satıcılar: 4,661,542.37
- 335 Personele Borçlar: 66,314.01
- 360 Ödenecek Vergi: 284,888.68
- 361 Ödenecek SGK: 26,330.58
- 368 Vadesi Geçmiş Vergi: 47,392.79
- 391 Hesaplanan KDV: 30,578.94
- 500 Sermaye: 100,000
- 540 Yasal Yedekler: 17,478.96
- 570 Geçmiş Yıllar Karları: 332,100.22

### Tespit Edilen Problemler

1. **partner_receivables (131 hesabı)**: 3,817,823 olarak kaydedilmiş ama `raw_accounts`'ta yok
2. **331 Ortaklara Borçlar**: raw_accounts'ta 257,862.53 BORÇ bakiyeli (normalde ALACAK olmalı)
3. **current_profit**: 1,091,168 kaydedilmiş ama raw_accounts'ta 591 hesabı -1,025,196.63 ZARAR gösteriyor

### Çözüm Önerileri

#### Seçenek 1: Hesap Yeniden Parse Et

PDF'i tekrar yükleyip parse işlemini düzeltmek. Balance sheet parser'da şu hesapların kontrol edilmesi gerekiyor:
- 131 Ortaklardan Alacaklar
- 331 Ortaklara Borçlar (borç/alacak bakiye yönü)
- 590/591 Dönem Karı/Zararı

#### Seçenek 2: shortTermLiabilities.total Hesaplamasını Düzelt

`useBalanceSheet.ts` satır 111-114'te `vat_payable` eksik:

```typescript
// Mevcut (HATALI):
total: yearlyBalance.trade_payables + yearlyBalance.partner_payables + 
       yearlyBalance.tax_payables + yearlyBalance.social_security_payables +
       yearlyBalance.deferred_tax_liabilities + yearlyBalance.tax_provision +
       yearlyBalance.personnel_payables + yearlyBalance.short_term_loan_debt,

// Düzeltilmiş:
total: yearlyBalance.trade_payables + yearlyBalance.partner_payables + 
       yearlyBalance.tax_payables + yearlyBalance.social_security_payables +
       yearlyBalance.deferred_tax_liabilities + yearlyBalance.tax_provision +
       yearlyBalance.personnel_payables + yearlyBalance.short_term_loan_debt +
       yearlyBalance.vat_payable,  // EKLENMELİ
```

#### Seçenek 3: Kayıtlı Toplamları Kullan (Önerilen)

Kilitli veri için alt hesapları yeniden toplamak yerine, kaydedilmiş `total_assets` ve `total_liabilities` değerlerini olduğu gibi kullanmak ve UI'da tutarsızlık varsa uyarı göstermek.

Mevcut kod zaten bunu yapıyor - sorun orijinal verideki tutarsızlık.

---

### Önerilen Düzeltmeler

| Dosya | Değişiklik |
|-------|-----------|
| `src/hooks/finance/useBalanceSheet.ts` | shortTermLiabilities.total hesaplamasına `vat_payable` ekle |
| Balance Sheet Parser | 131/331/590/591 hesap eşleştirmelerini düzelt |
| UI | Kilitli veride bile tutarsızlık varsa "Orijinal veride denklik farkı var" uyarısı göster |

### Kısa Vadeli Çözüm

En hızlı çözüm olarak `useBalanceSheet.ts`'deki eksik `vat_payable` alanını eklemek ve kısa vadeli borçlar toplamını düzeltmek. Ancak asıl sorun orijinal veritabanı kaydındaki tutarsızlık - bu, ya manuel düzeltme ya da dosyanın yeniden yüklenmesiyle çözülebilir.
