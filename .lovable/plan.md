

## Gelir Tablosu Önizlemesine Borç Bak. / Alacak Bak. Kolonları Ekleme

### Mevcut Durum

| Bileşen | Kolon Yapısı |
|---------|--------------|
| **Mizan (TrialBalanceUploader)** | Hesap, Hesap Adı, Borç, Alacak, **Borç Bak.**, **Alacak Bak.** (6 kolon) |
| **Gelir Tablosu (IncomeStatementUploader)** | Hesap, Hesap Adı, Borç, Alacak, Bakiye (5 kolon) |

Kullanıcı, Gelir Tablosu önizlemesinin de Mizan ile aynı formatta olmasını istiyor.

---

### Değişiklik Planı

#### 1. Edge Function Güncellemesi
**Dosya:** `supabase/functions/parse-income-statement/index.ts`

Veri yapısını değiştir:
```typescript
// MEVCUT
interface IncomeStatementAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;  // Tek bakiye
}

// YENİ
interface IncomeStatementAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;   // Borç bakiyesi
  creditBalance: number;  // Alacak bakiyesi
}
```

Bakiye hesaplama mantığı:
- Eğer Borç > Alacak ise: debitBalance = Borç - Alacak, creditBalance = 0
- Eğer Alacak > Borç ise: debitBalance = 0, creditBalance = Alacak - Borç

#### 2. Hook Güncellemesi
**Dosya:** `src/hooks/finance/useIncomeStatementUpload.ts`

Interface'i güncelle:
```typescript
interface IncomeStatementAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}
```

#### 3. Uploader Bileşeni Güncellemesi
**Dosya:** `src/components/finance/IncomeStatementUploader.tsx`

Önizleme tablosunu Mizan ile aynı yapıya getir:
```typescript
<TableHeader>
  <TableRow>
    <TableHead className="w-20">Hesap</TableHead>
    <TableHead>Hesap Adı</TableHead>
    <TableHead className="text-right">Borç</TableHead>
    <TableHead className="text-right">Alacak</TableHead>
    <TableHead className="text-right">Borç Bak.</TableHead>
    <TableHead className="text-right">Alacak Bak.</TableHead>
  </TableRow>
</TableHeader>
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/parse-income-statement/index.ts` | debitBalance/creditBalance ekle |
| `src/hooks/finance/useIncomeStatementUpload.ts` | Interface güncelle |
| `src/components/finance/IncomeStatementUploader.tsx` | Tablo kolonlarını güncelle |

---

### Beklenen Sonuç

Gelir Tablosu önizlemesi Mizan ile aynı formatta görünecek:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Gelir Tablosu Önizleme                                                          │
├─────────┬─────────────────────────┬───────────┬───────────┬───────────┬──────────┤
│ Hesap   │ Hesap Adı               │ Borç      │ Alacak    │ Borç Bak. │ Alacak B.│
├─────────┼─────────────────────────┼───────────┼───────────┼───────────┼──────────┤
│ 600     │ YURTİÇİ SATIŞLAR        │ ₺0        │ ₺2.850.000│ ₺0        │₺2.850.000│
│ 621     │ SATILAN TİCARİ MAL MAL. │ ₺1.200.000│ ₺0        │ ₺1.200.000│ ₺0       │
│ 632     │ GENEL YÖNETİM GİDERLERİ │ ₺450.000  │ ₺0        │ ₺450.000  │ ₺0       │
│ 646     │ KAMBİYO KARLARI         │ ₺0        │ ₺125.000  │ ₺0        │ ₺125.000 │
│ 656     │ KAMBİYO ZARARLARI       │ ₺85.000   │ ₺0        │ ₺85.000   │ ₺0       │
└─────────┴─────────────────────────┴───────────┴───────────┴───────────┴──────────┘
```

