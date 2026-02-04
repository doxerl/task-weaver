
# PowerPoint (PPTX) İndirme Özelliği Planı

## Mevcut Durum
- **PDF İndirme**: ✅ Mevcut (`handleDownloadPdf` fonksiyonu ile)
- **PPTX İndirme**: ❌ Mevcut değil
- **Speaker Notes**: PDF'de slayt içinde gösteriliyor (alt kısımda)

## İstenen Özellikler
1. **PowerPoint (PPTX) formatında indirme** - PDF'ye ek olarak
2. **Speaker Notes PowerPoint'in Notes bölümünde** - Slayt içinde değil, sunum modunda görünecek şekilde

## Çözüm Yaklaşımı

### 1. Kütüphane Kurulumu
```bash
pptxgenjs  # PowerPoint dosyaları oluşturmak için en popüler JS kütüphanesi
```

### 2. Özellik Detayları

| Özellik | PDF (Mevcut) | PPTX (Yeni) |
|---------|--------------|-------------|
| Format | A4 Yatay | 16:9 Widescreen |
| Speaker Notes | Slayt içinde (alt kısım) | Notes panelinde (Sunum modunda görünür) |
| Düzenlenebilirlik | Hayır | Evet |
| Tasarım | Google-style minimal | Aynı renk paleti |

### 3. Teknik Uygulama

```typescript
// pptxgenjs kullanımı
import pptxgen from 'pptxgenjs';

const handleDownloadPptx = async () => {
  const pptx = new pptxgen();
  
  for (const slideData of slides) {
    const slide = pptx.addSlide();
    
    // Slide içeriği
    slide.addText(slideData.title, { ... });
    slide.addText(slideData.content_bullets, { ... });
    
    // Speaker Notes - Notes paneline eklenir (slayt içinde değil!)
    slide.addNotes(slideData.speaker_notes);
  }
  
  pptx.writeFile('Investor_Pitch_Deck.pptx');
};
```

**Önemli**: `slide.addNotes()` metodu, notları PowerPoint'in Notes bölümüne ekler. Sunum modunda (Presenter View) konuşmacı notları olarak görünür.

## Değişiklik Planı

### Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|------------|
| `package.json` | `pptxgenjs` bağımlılığı ekle |
| `src/components/simulation/PitchDeckView.tsx` | PPTX indirme fonksiyonu ve butonu ekle |
| `src/i18n/locales/tr/simulation.json` | Türkçe çeviriler |
| `src/i18n/locales/en/simulation.json` | İngilizce çeviriler |

### UI Değişikliği
Mevcut butonların yanına "PowerPoint İndir" butonu eklenecek:

```
[Konuşmacı Notları] [PDF İndir] [PowerPoint İndir]
```

### PPTX Slayt Tasarımı
- **Layout**: 16:9 widescreen (standart sunum formatı)
- **Renk Paleti**: Mevcut PDF renkleri kullanılacak (10 slayt için farklı accent renkler)
- **Yapı**:
  - Sol üst: Slayt numarası
  - Üst: Başlık (bold, accent rengi)
  - Alt başlık: Key Message
  - Gövde: Bullet points
  - Notes Panel: Speaker Notes (slayt dışında, Presenter View'da görünür)

## i18n Çevirileri

### Türkçe (tr)
```json
{
  "downloadPptx": "PowerPoint İndir",
  "pptxDownloaded": "Pitch Deck PowerPoint olarak indirildi!",
  "pptxError": "PowerPoint oluşturulurken hata oluştu",
  "pptxFilename": "Yatirimci_Pitch_Deck"
}
```

### İngilizce (en)
```json
{
  "downloadPptx": "Download PPTX",
  "pptxDownloaded": "Pitch Deck downloaded as PowerPoint!",
  "pptxError": "Error creating PowerPoint",
  "pptxFilename": "Investor_Pitch_Deck"
}
```

## Tahmini Süre
- Kütüphane kurulumu: ~1 dakika
- PPTX fonksiyonu: ~10 dakika
- UI butonu: ~2 dakika
- Çeviriler: ~2 dakika
- **Toplam**: ~15 dakika

## Başarı Kriterleri
1. ✅ "PowerPoint İndir" butonu görünür
2. ✅ Tıklandığında .pptx dosyası indirilir
3. ✅ PowerPoint'te açıldığında 10 slayt + Executive Summary sayfası var
4. ✅ Presenter View'da Speaker Notes görünür (slayt içinde değil)
5. ✅ Slaytlar düzenlenebilir
