

## Hesap Kodlarını Tıklanabilir Yapma ve Satıcı/Alt Hesap Detayları Gösterme Planı

### Mevcut Durum Analizi

| Durum | Açıklama |
|-------|----------|
| **Mizan verileri** | Sadece 3 haneli ana hesap kodları kaydediliyor (100, 320, 600, vb.) |
| **Alt hesaplar** | Parse sırasında ana hesaba toplanıp siliniyor (100.01, 320.001 gibi) |
| **Satıcı bilgileri** | Mizan dosyasında bulunsa bile kaydedilmiyor |
| **UI** | Hesap kodları statik text olarak gösteriliyor (tıklanamaz) |

### İstenen Özellikler

1. **Hesap kodları tıklanabilir olmalı** - Tıklayınca alt hesaplar görünsün
2. **Satıcı/müşteri isimleri görünmeli** - 320 (Satıcılar), 120 (Alıcılar) için firma isimleri
3. **Alt hesap detayları** - Her alt hesabın tutarları ayrı ayrı görünsün

---

### Teknik Uygulama Planı

#### 1. Veritabanı Değişikliği

Mevcut `accounts` JSONB alanına alt hesap desteği eklenecek:

```typescript
// MEVCUT YAPI
{
  "320": {
    "name": "SATICILAR",
    "debit": 120136.66,
    "credit": 4199153.84,
    ...
  }
}

// YENİ YAPI (subAccounts eklendi)
{
  "320": {
    "name": "SATICILAR",
    "debit": 120136.66,
    "credit": 4199153.84,
    "subAccounts": [
      { "code": "320.01", "name": "ABC Şirketi", "debit": 50000, "credit": 2000000, ... },
      { "code": "320.02", "name": "XYZ Ltd.", "debit": 70136.66, "credit": 2199153.84, ... }
    ]
  }
}
```

#### 2. Edge Function Güncellemesi

**parse-trial-balance** edge function'ı alt hesapları koruyacak şekilde güncellenecek:

**Değişiklikler:**
- Alt hesap kodlarını (320.001, 100.01.001, vb.) parse et
- Her ana hesap için `subAccounts` dizisi oluştur
- Satıcı/müşteri isimlerini sakla

**AI Prompt güncellemesi:**
```
## ALT HESAPLAR (Muavin)
- 3+ haneli kodlar (320.01, 320.001, 120.01.001) alt hesaplardır
- Alt hesap isimleri genellikle firma/kişi isimleridir
- Alt hesapları ayrı ayrı parse et, ana hesaba toplama
```

#### 3. TypeScript Type Güncellemesi

**src/types/officialFinance.ts:**
```typescript
interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface TrialBalanceAccount {
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[]; // Yeni alan
}
```

#### 4. UI Bileşenleri Güncellemesi

**TrialBalanceUploader.tsx ve IncomeStatementUploader.tsx:**

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Mizan Önizleme                                                                     │
├─────────┬─────────────────────────┬───────────┬───────────┬───────────┬───────────┤
│ Hesap   │ Hesap Adı               │ Borç      │ Alacak    │ Borç Bak. │ Alacak B. │
├─────────┼─────────────────────────┼───────────┼───────────┼───────────┼───────────┤
│ ▶ 320   │ SATICILAR               │ ₺120.136  │ ₺4.199.153│ ₺0        │ ₺4.079.017│
│         │ (3 alt hesap)           │           │           │           │           │
├─────────┼─────────────────────────┼───────────┼───────────┼───────────┼───────────┤
│   320.01│   ABC Teknoloji A.Ş.    │ ₺50.000   │ ₺2.000.000│ ₺0        │ ₺1.950.000│ ← Açıldığında
│   320.02│   XYZ Yazılım Ltd.      │ ₺70.136   │ ₺2.199.153│ ₺0        │ ₺2.129.017│    gösterilir
├─────────┼─────────────────────────┼───────────┼───────────┼───────────┼───────────┤
│ ▶ 600   │ YURTİÇİ SATIŞLAR        │ ₺0        │ ₺5.811.104│ ₺0        │ ₺5.811.104│
│         │ (2 alt hesap)           │           │           │           │           │
└─────────┴─────────────────────────┴───────────┴───────────┴───────────┴───────────┘
```

**Özellikler:**
- ▶ ikonlu satırlar tıklanabilir (alt hesap varsa)
- Tıklayınca alt hesaplar açılır/kapanır (Collapsible)
- Alt hesap satırları girintili gösterilir
- Alt hesap sayısı parantez içinde belirtilir

---

### Değiştirilecek/Oluşturulacak Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `supabase/functions/parse-trial-balance/index.ts` | Güncelle | Alt hesap parse desteği |
| `supabase/functions/parse-income-statement/index.ts` | Güncelle | Alt hesap parse desteği |
| `src/types/officialFinance.ts` | Güncelle | SubAccount interface |
| `src/components/finance/TrialBalanceUploader.tsx` | Güncelle | Collapsible alt hesap UI |
| `src/components/finance/IncomeStatementUploader.tsx` | Güncelle | Collapsible alt hesap UI |
| `src/components/finance/AccountDetailRow.tsx` | Yeni | Tıklanabilir hesap satırı bileşeni |

---

### Uygulama Sırası

| Sıra | Görev | Açıklama |
|------|-------|----------|
| 1 | Types | `SubAccount` interface ekle |
| 2 | Edge Functions | Alt hesap parse mantığı ekle |
| 3 | AccountDetailRow | Yeni collapsible satır bileşeni |
| 4 | TrialBalanceUploader | Önizleme tablosunu güncelle |
| 5 | IncomeStatementUploader | Önizleme tablosunu güncelle |

---

### Beklenen Sonuçlar

- Hesap kodları tıklanabilir olacak
- Alt hesaplar (muavin) görüntülenebilecek
- Satıcı ve müşteri isimleri görünecek
- Collapsible yapı ile temiz bir UI

---

### Dikkat Edilecek Noktalar

- **Mevcut verilere uyumluluk**: `subAccounts` opsiyonel olacak, eski veriler çalışmaya devam edecek
- **PDF parse kalitesi**: AI'ın alt hesapları doğru parse etmesi için prompt optimize edilecek
- **Performans**: Çok sayıda alt hesap olduğunda lazy loading düşünülebilir

