
# Eksik i18n Ceviri Anahtarlarinin Duzeltilmesi

## Tespit Edilen Sorunlar

### 1. Eksik Anahtar: `comparison.savedConfigSummary`
- `InvestmentConfigSummary.tsx` satirda `t('simulation:comparison.savedConfigSummary')` kullaniliyor
- Bu anahtar ne TR ne EN dosyasinda mevcut
- Ekranda ham anahtar ismi gorunuyor

### 2. Yanlis Anahtar: `focusProject.personnel`
- `InvestmentConfigSummary.tsx` satirda `t('simulation:focusProject.personnel')` kullaniliyor
- JSON dosyasinda bu anahtar yok, dogru anahtar `focusProject.hiring`
- Sonuc: "focusProject.personnel" metni gorunuyor

### 3. Yanlis Anahtar: `focusProject.operational`
- `InvestmentConfigSummary.tsx` satirda `t('simulation:focusProject.operational')` kullaniliyor
- JSON dosyasinda bu anahtar yok, dogru anahtar `focusProject.operations`
- Sonuc: "focusProject.operational" metni gorunuyor

---

## Cozum

### Dosya 1: `src/i18n/locales/tr/simulation.json`
`comparison` bolumune eksik anahtar eklenmesi:
```json
"savedConfigSummary": "Kayitli Yapilandirma Ozeti"
```

### Dosya 2: `src/i18n/locales/en/simulation.json`
`comparison` bolumune eksik anahtar eklenmesi:
```json
"savedConfigSummary": "Saved Configuration Summary"
```

### Dosya 3: `src/components/simulation/InvestmentConfigSummary.tsx`
Yanlis anahtar referanslarinin duzeltilmesi:
- `focusProject.personnel` -> `focusProject.hiring`
- `focusProject.operational` -> `focusProject.operations`

---

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/i18n/locales/tr/simulation.json` | `comparison.savedConfigSummary` anahtari eklenmesi |
| `src/i18n/locales/en/simulation.json` | `comparison.savedConfigSummary` anahtari eklenmesi |
| `src/components/simulation/InvestmentConfigSummary.tsx` | `personnel` -> `hiring`, `operational` -> `operations` duzeltmesi |
