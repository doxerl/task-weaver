

# PDF Investor Page - Çeviri Key Düzeltmesi

## Problem

Görüntüde "pdf.investor.expenses" şeklinde ham key görünüyor çünkü `PdfInvestorPage.tsx` yanlış çeviri key'i kullanıyor.

| Dosya | Satır | Mevcut (Yanlış) | Doğru Key |
|-------|-------|-----------------|-----------|
| `PdfInvestorPage.tsx` | 262 | `t('pdf.investor.expenses')` | `t('pdf.investor.expense')` |

## Kök Neden

- i18n dosyasında `pdf.investor.expense` (tekil) olarak tanımlı
- Component `expenses` (çoğul) aramaya çalışıyor
- Key bulunamayınca react-i18next ham key'i döndürüyor

## Çözüm

Tek satırlık düzeltme:

```typescript
// Satır 262 - ÖNCE
{t('pdf.investor.expenses')}

// Satır 262 - SONRA  
{t('pdf.investor.expense')}
```

## Dosya Değişikliği

| Dosya | Değişiklik |
|-------|------------|
| `src/components/simulation/pdf/PdfInvestorPage.tsx` | `expenses` → `expense` |

## Doğrulama

Türkçe JSON (`tr/simulation.json`, satır 1312):
```json
"investor": {
  "expense": "Gider"  // ✅ Doğru key
}
```

İngilizce JSON (`en/simulation.json`):
```json
"investor": {
  "expense": "Expense"  // ✅ Doğru key
}
```

## Sonuç

- ✅ Tablo başlığı "Gider" olarak görünecek
- ✅ İngilizce'de "Expense" olarak görünecek
- ✅ Hardcoded key görünümü düzelecek

