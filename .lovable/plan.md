

# PrintCoverPage Kaldirma

## Sorun
`PrintCoverPage` bileseni `ScenarioComparisonPage.tsx` icinde render ediliyor. Bu bilesen:
1. `print-only` sinifi ile sadece print'te gorunur
2. `page-break-after` sinifi ile kendinden sonra sayfa kiriliyor
3. Icerik az oldugu icin sayfanin buyuk kismi bos kaliyor
4. Ardindan bos bir sayfa olusturuyor

## Cozum

### Dosya 1: `src/pages/finance/ScenarioComparisonPage.tsx`
- `PrintCoverPage` import'unu kaldir (satir 97)
- `PrintCoverPage` JSX kullanimini kaldir (satirlar ~1657-1672)

### Dosya 2: `src/components/simulation/PrintCoverPage.tsx`
- Dosyayi tamamen sil (artik kullanilmiyor)

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | Import ve JSX kullanimi kaldir |
| `src/components/simulation/PrintCoverPage.tsx` | Dosyayi sil |

## Sonuc
Print/PDF ciktisinda kapak sayfasi ve ardindaki bos sayfa ortadan kalkacak. Icerik dogrudan ilk sayfadan baslayacak.
