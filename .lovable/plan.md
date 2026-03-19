

# PlannerDeck Landing Page

## Ozet
Oturum acmamis ziyaretciler icin `/` rotasina bir landing page eklenecek. Giris yapmis kullanicilar otomatik olarak `/finance`'a yonlendirilecek.

## Teknik Tasarim

### Rotalama Degisikligi
`App.tsx`'de `"/"` rotasi `<Navigate to="/finance">` yerine yeni `LandingPage` bilesenini gosterecek. Kullanici giris yapmissa bilesenin icinde `/finance`'a yonlendirme yapilacak.

### Yeni Dosya: `src/pages/Landing.tsx`
Tek dosyada tum landing page. Auth durumunu kontrol edip giris yapmis kullaniciyi `/finance`'a yonlendirir.

#### Bolumler:

**1. Navbar** — Logo "PlannerDeck", sag tarafta "Giris Yap" ve "Ucretsiz Deneyin" butonlari.

**2. Hero Section** — Gradient arka plan, H1 baslik, alt baslik, iki CTA butonu ("Ucretsiz Deneyin" → `/auth`, "Nasil Calisir?" → sayfa ici scroll). Sag tarafta dashboard mockup (stilize edilmis kart/grafik bilesenlerinden olusan gorsel temsil).

**3. Ozellikler Vitrini** — 4 kategori kartlari (A: AI Veri Girisi/On Muhasebe, B: Finansal Raporlama, C: Buyume Simulasyonu, D: Yatirimci Hazirligi). Her kart: ikon, baslik, 2 madde aciklama.

**4. Nasil Calisir? (3 Adim)** — Yatay akis: 1) Verilerinizi Yukleyin, 2) Senaryonuzu Kurgulain, 3) Ciktinizi Alin. Her adim numara + ikon + kisa aciklama.

**5. Footer** — Navigasyon linkleri, yasal linkler, "Bir Alfa Zen LTD Projesidir" ibaresi.

### i18n Destegi
- `src/i18n/locales/tr/common.json` ve `src/i18n/locales/en/common.json` dosyalarina `"landing"` anahtari altinda tum metinler eklenecek.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/Landing.tsx` | **Yeni** — Tum landing page bilesenini icerir |
| `src/App.tsx` | `"/"` rotasi `Landing` sayfasina isaret edecek |
| `src/i18n/locales/tr/common.json` | `landing` cevirileri eklenmesi |
| `src/i18n/locales/en/common.json` | `landing` cevirileri eklenmesi |

## Gorunum
- Tamamen responsive (mobil, tablet, masaustu)
- Mevcut tema renklerini (primary, secondary, muted) kullanir
- Lucide ikonlari kullanilir
- Harici gorsel/resim gerektirmez — stilize edilmis UI bilesenlerinden mockup olusturulur

