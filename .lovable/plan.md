

## Resmi Gelir Tablosu ve Bilanço Yükleme Sorunu - Düzeltme Planı

### Tespit Edilen Sorunlar

#### 1. "Maximum update depth exceeded" Hatası
**Dosya:** `src/components/finance/OfficialIncomeStatementForm.tsx`

**Sorun:** `useEffect` dependency array'indeki `emptyStatement` her render'da yeni bir obje oluşturuyor ve bu sonsuz döngüye neden oluyor.

```typescript
// SORUNLU KOD (satır 33-39)
useEffect(() => {
  if (officialStatement) {
    setFormData(officialStatement);
  } else {
    setFormData(emptyStatement);  // emptyStatement her render'da yeni obje
  }
}, [officialStatement, emptyStatement]);  // ← Sonsuz döngü!
```

#### 2. Bilanço Sekmesi Eksik Form
**Dosya:** `src/pages/finance/OfficialData.tsx`

**Sorun:** "Bilanço" sekmesi (satır 119-133) sadece `/finance/balance-sheet` sayfasına yönlendirme butonu içeriyor. Resmi bilanço verisi girişi için ayrı bir form yok.

---

### Çözüm Planı

#### 1. useOfficialIncomeStatement Hook Düzeltmesi
**Dosya:** `src/hooks/finance/useOfficialIncomeStatement.ts`

`emptyStatement`'ı `useMemo` ile sabit tutarak referans değişimini önle:

```typescript
// MEVCUT (satır 211)
emptyStatement: getEmptyStatement(year),

// YENİ
const emptyStatement = useMemo(() => getEmptyStatement(year), [year]);
// ...
return { ..., emptyStatement };
```

#### 2. OfficialIncomeStatementForm useEffect Düzeltmesi
**Dosya:** `src/components/finance/OfficialIncomeStatementForm.tsx`

Dependency array'i düzelt ve referans karşılaştırması kullan:

```typescript
// Referans karşılaştırması için stringify kullan veya emptyStatement'ı kaldır
useEffect(() => {
  if (officialStatement) {
    setFormData(officialStatement);
  } else {
    setFormData(emptyStatement);
  }
}, [officialStatement]); // emptyStatement kaldırıldı - artık useMemo ile stabil
```

#### 3. Yeni Bileşen: OfficialBalanceSheetForm
**Dosya:** `src/components/finance/OfficialBalanceSheetForm.tsx` (YENİ)

Resmi bilanço verisi girişi için form bileşeni:

```
┌─────────────────────────────────────────────────────────┐
│ 2025 Yılı Resmi Bilanço                      [Kaydet]  │
│ Tekdüzen hesap planına göre bilanço verilerini girin   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ DÖNEN VARLIKLAR (1xx)                                   │
│ ─────────────────────────────────────────────           │
│ 100  Kasa                            [____________] ₺   │
│ 102  Bankalar                        [____________] ₺   │
│ 120  Alıcılar                        [____________] ₺   │
│ 190  Devreden KDV                    [____________] ₺   │
│                                                         │
│ DURAN VARLIKLAR (2xx)                                   │
│ ─────────────────────────────────────────────           │
│ 254  Taşıtlar                        [____________] ₺   │
│ 255  Demirbaşlar                     [____________] ₺   │
│ 257  Birikmiş Amortisman (-)         [____________] ₺   │
│                                                         │
│ KISA VADELİ BORÇLAR (3xx)                              │
│ ─────────────────────────────────────────────           │
│ 300  Banka Kredileri                 [____________] ₺   │
│ 320  Satıcılar                       [____________] ₺   │
│ 335  Personele Borçlar               [____________] ₺   │
│ 360  Ödenecek Vergi                  [____________] ₺   │
│                                                         │
│ ÖZKAYNAKLAR (5xx)                                       │
│ ─────────────────────────────────────────────           │
│ 500  Sermaye                         [____________] ₺   │
│ 540  Yasal Yedekler                  [____________] ₺   │
│ 570  Geçmiş Yıl Karları             [____________] ₺   │
│                                                         │
│ ═══════════════════════════════════════════════════     │
│ Toplam Aktif:     ₺ 5,733,551.90                       │
│ Toplam Pasif:     ₺ 5,733,551.90                       │
│ Denge:            ✓ Dengeli                             │
│ ═══════════════════════════════════════════════════     │
│                     [Kaydet]  [Kaydet ve Kilitle]       │
└─────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Tekdüzen hesap planı grupları (Dönen/Duran Varlık, Kısa/Uzun Vadeli Borç, Özkaynak)
- Aktif = Pasif denge kontrolü
- Kaydet ve Kilitle fonksiyonları
- Mevcut `useYearlyBalanceSheet` hook'unu kullanır

#### 4. OfficialData Sayfa Güncellemesi
**Dosya:** `src/pages/finance/OfficialData.tsx`

"Bilanço" sekmesine (satır 119-133) yeni form bileşenini ekle:

```typescript
// MEVCUT
<TabsContent value="balance" className="mt-6">
  <Card>
    <CardContent>
      <Button onClick={() => navigate('/finance/balance-sheet')}>
        Bilanço Sayfasına Git
      </Button>
    </CardContent>
  </Card>
</TabsContent>

// YENİ
<TabsContent value="balance" className="mt-6">
  <OfficialBalanceSheetForm year={selectedYear} />
</TabsContent>
```

---

### Değiştirilecek Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `src/hooks/finance/useOfficialIncomeStatement.ts` | Güncelle | `useMemo` ile `emptyStatement` stabil yap |
| `src/components/finance/OfficialIncomeStatementForm.tsx` | Güncelle | `useEffect` dependency düzelt |
| `src/components/finance/OfficialBalanceSheetForm.tsx` | Yeni | Resmi bilanço giriş formu |
| `src/pages/finance/OfficialData.tsx` | Güncelle | Bilanço sekmesine form ekle |
| `src/types/officialFinance.ts` | Güncelle | `BALANCE_SHEET_GROUPS` sabiti ekle |

---

### Bilanço Hesap Grupları (types/officialFinance.ts)

```typescript
export const BALANCE_SHEET_GROUPS = [
  {
    title: 'DÖNEN VARLIKLAR (1xx)',
    accounts: [
      { code: '100', name: 'Kasa', field: 'cash_on_hand' },
      { code: '102', name: 'Bankalar', field: 'bank_balance' },
      { code: '120', name: 'Alıcılar', field: 'trade_receivables' },
      { code: '131', name: 'Ortaklardan Alacaklar', field: 'partner_receivables' },
      { code: '190', name: 'Devreden KDV', field: 'vat_receivable' },
      { code: '191', name: 'İndirilecek KDV', field: 'other_vat' },
    ],
  },
  {
    title: 'DURAN VARLIKLAR (2xx)',
    accounts: [
      { code: '254', name: 'Taşıtlar', field: 'vehicles' },
      { code: '255', name: 'Demirbaşlar', field: 'fixtures' },
      { code: '257', name: 'Birikmiş Amortisman (-)', field: 'accumulated_depreciation', isNegative: true },
    ],
  },
  {
    title: 'KISA VADELİ BORÇLAR (3xx)',
    accounts: [
      { code: '300', name: 'Banka Kredileri', field: 'short_term_loan_debt' },
      { code: '320', name: 'Satıcılar', field: 'trade_payables' },
      { code: '331', name: 'Ortaklara Borçlar', field: 'partner_payables' },
      { code: '335', name: 'Personele Borçlar', field: 'personnel_payables' },
      { code: '360', name: 'Ödenecek Vergi', field: 'tax_payables' },
      { code: '361', name: 'Ödenecek SGK', field: 'social_security_payables' },
      { code: '391', name: 'Hesaplanan KDV', field: 'vat_payable' },
    ],
  },
  {
    title: 'UZUN VADELİ BORÇLAR (4xx)',
    accounts: [
      { code: '400', name: 'Banka Kredileri', field: 'bank_loans' },
    ],
  },
  {
    title: 'ÖZKAYNAKLAR (5xx)',
    accounts: [
      { code: '500', name: 'Sermaye', field: 'paid_capital' },
      { code: '501', name: 'Ödenmemiş Sermaye (-)', field: 'unpaid_capital', isNegative: true },
      { code: '540', name: 'Yasal Yedekler', field: 'retained_earnings' },
      { code: '570', name: 'Geçmiş Yıllar Karları', field: 'retained_earnings' },
      { code: '590', name: 'Dönem Net Karı', field: 'current_profit' },
    ],
  },
] as const;
```

---

### Uygulama Sırası

| Sıra | Görev | Açıklama |
|------|-------|----------|
| 1 | useOfficialIncomeStatement düzelt | useMemo ekle |
| 2 | OfficialIncomeStatementForm düzelt | useEffect dependency düzelt |
| 3 | officialFinance.ts güncelle | BALANCE_SHEET_GROUPS ekle |
| 4 | OfficialBalanceSheetForm oluştur | Yeni form bileşeni |
| 5 | OfficialData.tsx güncelle | Bilanço sekmesine form ekle |

---

### Beklenen Sonuçlar

- "Maximum update depth exceeded" hatası düzelir
- Gelir Tablosu sekmesi doğru çalışır
- Bilanço sekmesinde doğrudan veri girişi yapılabilir
- Her iki tablo için kaydetme ve kilitleme çalışır
- Aktif = Pasif denge kontrolü gösterilir

