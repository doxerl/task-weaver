

# AppHeader'a Settings Butonu Eklenmesi

## Sorun
Settings sayfasina sadece `/today` ve `/week` sayfalarindan erisilebiliyor. `/finance` ve diger sayfalardan erisim yok.

## Cozum
`AppHeader` bilesenine varsayilan olarak bir Settings ikonu eklemek. Boylece tum sayfalarda otomatik olarak gorunur.

### Dosya: `src/components/AppHeader.tsx`
- `useNavigate` import edilecek
- Sag tarafa (LanguageToggle'dan sonra, rightContent'ten once) her zaman gorunen bir Settings (disle) ikonu butonu eklenecek
- `/settings` sayfasindayken buton gizlenecek (gereksiz)
- `showSettings` prop'u opsiyonel olarak eklenip varsayilan `true` yapilacak

### Dosya: `src/pages/Today.tsx`
- `rightContent` icindeki ayarlar butonunu kaldir (artik AppHeader'da var)

### Dosya: `src/pages/Week.tsx`  
- `rightContent` icindeki ayarlar butonunu kaldir (artik AppHeader'da var)

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/components/AppHeader.tsx` | Settings ikonu butonu eklenmesi |
| `src/pages/Today.tsx` | Tekrar eden settings butonu kaldirilmasi |
| `src/pages/Week.tsx` | Tekrar eden settings butonu kaldirilmasi |

