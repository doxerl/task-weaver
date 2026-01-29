

## Gelir Tablosu Parse ve Kaydetme Sorunu Düzeltme

### Problem Analizi

Veritabanı sorgusu ve network requestlerden tespit edilen sorunlar:

| Alan | Mevcut Değer | Beklenen |
|------|-------------|----------|
| `source` | `"manual"` | `"mizan_upload"` |
| `raw_accounts` | `null` | Parsed hesaplar |
| `file_name` | `null` | Dosya adı |

**Temel Sorun:** `approveIncomeStatement` fonksiyonunda `upsert` çağrısı düzgün çalışmıyor. Bilanço hook'u (`useBalanceSheetUpload`) ise manuel olarak `existing` kontrolü yapıp `update` veya `insert` çağırıyor.

---

### Karşılaştırma: Bilanço vs Gelir Tablosu

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ÇALIŞAN (Bilanço)                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. const { data: existing } = await supabase                   │
│      .select('id')                                              │
│      .eq('user_id', user.id)                                    │
│      .eq('year', year)                                          │
│      .maybeSingle();                                            │
│                                                                 │
│ 2. if (existing?.id) {                                          │
│      await supabase.update(payload).eq('id', existing.id);     │
│    } else {                                                     │
│      await supabase.insert(payload);                            │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               ÇALIŞMAYAN (Gelir Tablosu)                        │
├─────────────────────────────────────────────────────────────────┤
│ await supabase                                                  │
│   .upsert(payload, { onConflict: 'user_id,year' })             │
│   .select()                                                     │
│   .single();                                                    │
│                                                                 │
│ Problem: onConflict constraint tanımlı değilse veya             │
│ payload'da tüm unique alanlar yoksa çalışmaz                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Çözüm 1: Hook'u Bilanço Gibi Güncelle

`src/hooks/finance/useIncomeStatementUpload.ts` dosyasında `approveIncomeStatement` fonksiyonunu güncelle:

```typescript
const approveIncomeStatement = useCallback(async () => {
  if (!userId || !uploadState) {
    toast({
      title: 'Hata',
      description: 'Veri bulunamadı',
      variant: 'destructive',
    });
    return;
  }

  setIsApproving(true);

  try {
    // Build the form data from mapped data
    const formData: Partial<YearlyIncomeStatementFormData> = {
      year,
      source: 'mizan_upload',
      ...uploadState.mappedData,
    };

    // Calculate totals
    const totals = calculateStatementTotals(formData);

    // Check if record exists - BİLANÇO GİBİ
    const { data: existing } = await supabase
      .from('yearly_income_statements')
      .select('id')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();

    const payload = {
      ...formData,
      ...totals,
      user_id: userId,
      year,
      source: 'mizan_upload',
      file_name: uploadState.fileName,
      raw_accounts: uploadState.accounts, // JSONB - direkt array
      updated_at: new Date().toISOString(),
    };

    // UPDATE veya INSERT - BİLANÇO GİBİ
    if (existing?.id) {
      const { error } = await supabase
        .from('yearly_income_statements')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('yearly_income_statements')
        .insert(payload);
      if (error) throw error;
    }

    // Update state to approved
    setUploadState(prev => prev ? { ...prev, isApproved: true } : null);

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });
    queryClient.invalidateQueries({ queryKey: ['income-statement-upload', year, userId] });

    toast({
      title: 'Onaylandı',
      description: `${year} yılı gelir tablosu verileri kaydedildi`,
    });

  } catch (error) {
    console.error('Approve error:', error);
    toast({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Veriler kaydedilemedi',
      variant: 'destructive',
    });
  } finally {
    setIsApproving(false);
  }
}, [userId, uploadState, year, queryClient]);
```

---

### Çözüm 2: `deleteUpload` da Güncelle

Silme işleminde de `raw_accounts` null yapılmalı:

```typescript
const deleteUpload = useCallback(async () => {
  if (uploadState?.isApproved && userId) {
    await supabase
      .from('yearly_income_statements')
      .update({ 
        source: 'manual', 
        file_name: null, 
        file_url: null,
        raw_accounts: null  // EKLENMELİ
      })
      .eq('user_id', userId)
      .eq('year', year);
    
    queryClient.invalidateQueries({ queryKey: ['income-statement-upload', year, userId] });
  }
  
  setUploadState(null);
  toast({
    title: 'Silindi',
    description: 'Yüklenen veriler silindi',
  });
}, [uploadState, userId, year, queryClient]);
```

---

### Değiştirilecek Dosya

| Dosya | Değişiklik |
|-------|-----------|
| `src/hooks/finance/useIncomeStatementUpload.ts` | `upsert` yerine `update/insert` pattern kullan |

---

### Beklenen Sonuç

| Senaryo | Önceki | Sonraki |
|---------|--------|---------|
| "Onayla ve Aktar" tıklandığında | Kayıt güncellenmez | Kayıt güncellenir |
| `source` değeri | `"manual"` kalır | `"mizan_upload"` olur |
| `raw_accounts` | `null` | Parsed hesaplar |
| Sayfa yenilenince | Boş görünür | Veriler yüklenir |
| Önizleme | Boş tablo | Hesaplar görünür |

