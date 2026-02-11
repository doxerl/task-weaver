

# Print CSS ve Sayfa Bolunme Sorunlari Duzeltme

## Tespit Edilen Sorunlar

### 1. print.css Hic Import Edilmemis (Kritik)
`src/lib/pdf/styles/print.css` dosyasi olusturulmus ama hicbir yerde import edilmemiyor. Bu yuzden:
- `@media print` kurallari hic calismyor
- `print-hidden` sinifi etkisiz
- Sayfa kesme kurallari (`avoid-break`, `print-page-break`) uygulanmiyor
- Sonuc: Kapak sayfasi gorunuyor ama icerik bosluklari ve kesilmeler oluyor

### 2. Tabs Icerigi Print'te Gizli
InvestmentTab icindeki icerik (Capital Analysis, Valuation vb.) muhtemelen Tabs/Accordion yapisi icinde ve sadece aktif sekme gorunuyor. Print'te tum sekmelerin icerigi acik olmali.

## Cozum Plani

### Adim 1: print.css'i import et
**Dosya:** `src/index.css`

Dosyanin basina `@import './lib/pdf/styles/print.css';` ekle. Bu tek satir tum print kurallarini aktif hale getirecek.

### Adim 2: Tablo ve Card bolunme kurallarini guclendir  
**Dosya:** `src/lib/pdf/styles/print.css`

Mevcut `break-inside: avoid` kurallari yeterli degil cunku:
- Radix UI Card bilesenleri `rounded-lg border bg-card` gibi siniflar kullaniyor, `.card` degil
- Buyuk tablolar icin `break-inside: avoid` yerine satirlarin bolunmesine izin verip sadece thead tekrari yapilmali

Eklenecek kurallar:
```css
@media print {
  /* Radix Card bilesenlerini de kapsayan genis secici */
  .rounded-lg.border {
    break-inside: avoid;
  }
  
  /* Kucuk card gruplari bolunmesin */
  .grid.grid-cols-2,
  .grid.grid-cols-4 {
    break-inside: avoid;
  }
  
  /* Tabs icerigi - tum panelleri goster */
  [role="tabpanel"][data-state="inactive"] {
    display: block !important;
    visibility: visible !important;
  }
  
  /* Tab listesini gizle */
  [role="tablist"] {
    display: none !important;
  }
}
```

### Adim 3: Recharts grafiklerin print'te dogru boyutlanmasi
**Dosya:** `src/lib/pdf/styles/print.css`

```css
@media print {
  .recharts-responsive-container {
    width: 100% !important;
    height: 300px !important;
  }
}
```

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/index.css` | print.css import ekle (1 satir) |
| `src/lib/pdf/styles/print.css` | Tabs gorunurlugu, Card bolunme kurallari, grid korumasi ekle |

## Beklenen Sonuc
- Print/PDF'te tum icerik gorunur olacak (bos sayfa sorunu cozulecek)
- Tablo ve kartlar sayfalar arasinda kesilmeyecek
- Tabs icindeki tum icerik print'te otomatik acilacak
