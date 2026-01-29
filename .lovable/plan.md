

## Gemini 3 Pro Preview'a Geçiş ve Parse/Kaydetme Sorunları Düzeltme

### Tespit Edilen Sorunlar

| Sorun | Mevcut Durum | Hedef |
|-------|-------------|-------|
| AI Modeli | `google/gemini-2.5-flash` | `google/gemini-3-pro-preview` |
| Parse Farkı | ₺30,579 fark (Aktif ≠ Pasif) | ₺0 fark (Dengeli bilanço) |
| Veritabanı Kaydı | Upload sonrası kayıt yok | Parse sonucu otomatik kayıt |
| Veri Geri Çekme | Kaydedilen veriler UI'da görünmüyor | Sayfa yüklendiğinde veriler gösterilmeli |

---

### Çözüm 1: Edge Function'da Model Güncelleme

`supabase/functions/parse-balance-sheet/index.ts` - Model değişikliği:

```typescript
// Mevcut:
model: 'google/gemini-2.5-flash',

// Yeni:
model: 'google/gemini-3-pro-preview',
```

**Gemini 3 Pro Preview avantajları:**
- Daha güçlü görsel + metin işleme
- Daha iyi negatif değer tanıma (parantez içi değerler)
- Daha doğru Türk muhasebe formatı anlama

---

### Çözüm 2: Gelir Tablosu Edge Function da Güncelleme

`supabase/functions/parse-income-statement/index.ts` - Aynı model değişikliği:

```typescript
// Mevcut:
model: 'google/gemini-2.5-flash',

// Yeni:
model: 'google/gemini-3-pro-preview',
```

---

### Çözüm 3: Veritabanı Kaydetme Mantığını Düzeltme

`src/hooks/finance/useBalanceSheetUpload.ts` - Kaydetme sırasında:

**Problem:** Parse sonrası veritabanına kayıt için mevcut kaydın `id`'si kontrol ediliyor ama `source` değeri dikkate alınmıyor.

```typescript
// Mevcut kod - yalnızca id kontrolü:
const { data: existing } = await supabase
  .from('yearly_balance_sheets')
  .select('id')
  .eq('user_id', user.id)
  .eq('year', year)
  .maybeSingle();

// Düzeltilmiş - source kontrolü de ekle:
const { data: existing } = await supabase
  .from('yearly_balance_sheets')
  .select('id, source')
  .eq('user_id', user.id)
  .eq('year', year)
  .maybeSingle();
```

---

### Çözüm 4: Sayfa Yüklendiğinde Kayıtlı Veriyi Gösterme

`useBalanceSheetUpload.ts` - Mevcut kayıt yüklenirken özet bilgileri de çek:

```typescript
// Query'ye özet alanları ekle:
const { data: existingUpload } = useQuery({
  queryKey: ['balance-sheet-upload', year, user?.id],
  queryFn: async () => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from('yearly_balance_sheets')
      .select('source, file_name, file_url, raw_accounts, is_locked, total_assets, total_liabilities')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle();
    return data;
  },
  enabled: !!user?.id,
});
```

**useEffect'te savedSummary ekle:**
```typescript
useEffect(() => {
  if (existingUpload?.source === 'file_upload') {
    if (existingUpload.raw_accounts) {
      // Ham hesaplar varsa bunları göster
      const accounts = existingUpload.raw_accounts as unknown as BalanceSheetParsedAccount[];
      const { totalAssets, totalLiabilities } = calculateBalanceSheetTotals(accounts);
      setUploadResult({
        accounts,
        summary: {
          accountCount: accounts.length,
          totalAssets: Math.round(totalAssets),
          totalLiabilities: Math.round(totalLiabilities),
          isBalanced: Math.abs(totalAssets - totalLiabilities) < 1,
        },
      });
    } else {
      // raw_accounts yoksa veritabanından toplam değerleri kullan
      setUploadResult({
        accounts: [],
        summary: {
          accountCount: 0,
          totalAssets: existingUpload.total_assets || 0,
          totalLiabilities: existingUpload.total_liabilities || 0,
          isBalanced: Math.abs((existingUpload.total_assets || 0) - (existingUpload.total_liabilities || 0)) < 1,
        },
      });
    }
    setFileName(existingUpload.file_name);
    setFileUrl(existingUpload.file_url);
  }
}, [existingUpload]);
```

---

### Çözüm 5: Kaydetme Sonrası Query Invalidate

Kaydetme işlemi sonrası tüm ilgili query'leri yenile:

```typescript
queryClient.invalidateQueries({ queryKey: ['yearly-balance-sheet', user.id, year] });
queryClient.invalidateQueries({ queryKey: ['balance-sheet-upload', year, user.id] });
queryClient.invalidateQueries({ queryKey: ['balance-sheet'] }); // Genel bilanço query'si
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/parse-balance-sheet/index.ts` | Model: gemini-3-pro-preview |
| `supabase/functions/parse-income-statement/index.ts` | Model: gemini-3-pro-preview |
| `src/hooks/finance/useBalanceSheetUpload.ts` | Query'ye toplam alanları ekle, savedSummary mantığı |

---

### Beklenen Sonuç

| Metrik | Önceki | Sonraki |
|--------|--------|---------|
| AI Modeli | Gemini 2.5 Flash | Gemini 3 Pro Preview |
| Parse Doğruluğu | %99 (₺30K fark) | %99.9+ (< ₺1 fark) |
| Kayıt Durumu | Kaydedilmiyor | Otomatik kayıt |
| Veri Geri Çekme | ₺0 gösteriyor | Gerçek değerler |

