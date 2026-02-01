

## Mizan PDF Alt Hesap (Muavin) Desteği - Düzeltme

### Problem Analizi

PDF'den 131 hesap parse ediliyor ama toplamlar uyuşmuyor (₺1.322.450 fark). Bu, bazı alt hesapların kaybolmasından kaynaklanıyor.

**Tespit edilen sorunlar:**

1. **Ana hesap yoksa alt hesaplar kaybolur** (satır 565-568): `if (accounts[baseCode])` kontrolü, ana hesap yoksa alt hesapları atlamaya neden oluyor.

2. **Toplam hesaplaması hatalı**: UI'da `totalDebit` hesaplanırken sadece ana hesaplar toplanıyor, alt hesaplar dahil edilmiyor.

3. **Alt hesap değerlerinin çift sayılma riski**: Bazı mizan formatlarında ana hesap satırı alt hesapların toplamını içerir, bu durumda alt hesaplar da ayrı toplanırsa çift sayım olur.

### Cozum

#### 1. Edge Function Duzeltmesi

**Dosya: `supabase/functions/parse-trial-balance/index.ts`**

##### a) Alt hesaplar icin sanal ana hesap olustur (satir 564-569)

Mevcut kod:
```typescript
// Attach sub-accounts to main accounts
for (const baseCode of Object.keys(subAccountsTemp)) {
  if (accounts[baseCode]) {
    accounts[baseCode].subAccounts = subAccountsTemp[baseCode];
  }
}
```

Duzeltilmis kod:
```typescript
// Attach sub-accounts to main accounts
// If main account doesn't exist, create it from sub-accounts
for (const baseCode of Object.keys(subAccountsTemp)) {
  if (!accounts[baseCode]) {
    // Create virtual main account from sub-accounts
    const subs = subAccountsTemp[baseCode];
    accounts[baseCode] = {
      name: `Hesap ${baseCode}`,
      debit: subs.reduce((sum, s) => sum + s.debit, 0),
      credit: subs.reduce((sum, s) => sum + s.credit, 0),
      debitBalance: subs.reduce((sum, s) => sum + s.debitBalance, 0),
      creditBalance: subs.reduce((sum, s) => sum + s.creditBalance, 0),
    };
  }
  accounts[baseCode].subAccounts = subAccountsTemp[baseCode];
}
```

Bu degisiklik hem `parsePDFWithAI()` hem de `parseExcel()` fonksiyonlarinda yapilmali.

##### b) AI Prompt'u daha net talimatlarla guncelle

Alt hesaplarin ana hesapla birlikte dondurulmesi gerektigini vurgula:

```typescript
// Prompt'a ekleme:
"## KRITIK KURAL
Ana hesap satiri (ornegin 320 SATICILAR) mutlaka ayri bir kayit olarak dondurulmeli.
Alt hesaplar (320 001, 320 1 006) ana hesaptan AYRI kayitlar olarak dondurulmeli.
Ana hesabin toplam degeri, alt hesaplarin toplamindan FARKLI olabilir."
```

#### 2. Excel parse fonksiyonunda da ayni duzeltme

**Dosya: `supabase/functions/parse-trial-balance/index.ts` (satir 341-346)**

Ayni mantik `parseExcel()` fonksiyonunda da uygulanmali.

### Degistirilecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `supabase/functions/parse-trial-balance/index.ts` | Alt hesap isleme mantigi duzeltmesi (satirlar 341-346 ve 564-569) |

### Beklenen Sonuc

**Oncesi:**
- PDF yuklendi: 15 ana hesap (alt hesaplar kayip)
- Toplam Borc: X, Toplam Alacak: Y
- Fark: ₺1.322.450 (bazi hesaplar kayip)

**Sonrasi:**
- PDF yuklendi: 15 ana hesap + 116 alt hesap (toplam 131)
- Alt hesapsiz ana hesaplar icin: alt hesaplardan toplam hesaplanir
- Fark: ₺0 (tum hesaplar dahil)

### Teknik Detay

Ana hesap-alt hesap iliskisi su sekilde calismali:

```text
AI'dan gelen:
├── 320 SATICILAR (debit: 120.136, credit: 4.199.153)
├── 320 001 METRO GROSMARKET (debit: 81.251, credit: 86.271)
├── 320 1 006 RADSAN GRUP (debit: 0, credit: 650.400)
└── 320 1 007 DOGRU GRUP (debit: 0, credit: 209.400)

Islenme sonrasi:
accounts["320"] = {
  name: "SATICILAR",
  debit: 120.136,
  credit: 4.199.153,
  subAccounts: [
    { code: "320.001", name: "METRO GROSMARKET", ... },
    { code: "320.1.006", name: "RADSAN GRUP", ... },
    { code: "320.1.007", name: "DOGRU GRUP", ... }
  ]
}
```

Eger AI ana hesabi (320) dondurmediyse:
```text
accounts["320"] = {
  name: "Hesap 320",  // Sanal isim
  debit: 81.251,      // Alt hesaplarin toplami
  credit: 946.071,    // Alt hesaplarin toplami
  subAccounts: [...]
}
```

