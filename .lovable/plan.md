## Hedef
Banka ekstresi yükleme sayfasında kullanıcının aynı anda birden fazla Excel dosyasını (2., 3., 4. vb.) seçip tek bir oturumda birleştirmesini sağlamak.

## Şu anki durum
- Mevcut ekranda tek dosya seçilebiliyor.
- "Ek dosya" butonu ile aynı oturuma sırayla dosya eklenebiliyor, ancak her seferinde tek dosya seçiliyor.
- Oturum ve satır numarası çakışmasını önleyen altyapı (`useBankImportSession`) zaten var: açık oturum tekrar kullanılıyor ve yeni dosyanın satırlarına `rowOffset` ekleniyor.

## Yapılacaklar

### 1. Arayüz: çoklu dosya seçimi
**Dosya:** `src/pages/finance/BankImport.tsx`
- `selectedFile` state'i `selectedFiles` (File[]) dizisine çevrilecek.
- `<input type="file">` öğesine `multiple` özelliği eklenecek.
- Seçilen dosyalar liste şeklinde gösterilecek; her dosyanın adı ve boyutu görünecek, tek tek kaldırılabilecek.
- "AI ile Analiz Et" butonu tüm seçili dosyalar için çalışacak.

### 2. Upload hook: çoklu dosya işleme
**Dosya:** `src/hooks/finance/useBankFileUpload.ts`
- `uploadAndParse` mutation'ı tek `File` yerine `File | File[]` kabul edecek.
- İlk dosya yeni bir `bank_import_sessions` kaydı oluşturacak; sonraki dosyalar aynı açık oturuma eklenecek.
- Dosyalar sırayla işlenecek:
  1. Her dosyayı storage'a yükle.
  2. Her dosyayı `parseFile` ile oku.
  3. Her dosyanın işlemlerini `processBatches` ile çıkar.
  4. Tüm dosyaların işlemlerini tek bir dizide birleştir (mevcut `rowOffset` mekanizmasını kullanarak veritabanına kaydet).
  5. Birleştirilmiş tüm işlemleri tek seferde AI ile kategorile.
- İlerleme çubuğu ve durum metni, işlenen dosya sırası ve toplam dosya sayısını yansıtacak.

### 3. Hata yönetimi
- Bir dosya hata verirse işlem durmayacak; başarılı dosyalar işlenecek, hatalı dosyalar kullanıcıya listelenecek.
- Kullanıcı duraklatma istediğinde mevcut dosya işlendikten sonra duraklatma yapılacak.

### 4. Doğrulama
- `.xlsx` ve `.xls` dışındaki dosyalar reddedilecek (zaten mevcut kontrol var).
- Aynı dosyanın tekrar yüklenmesi durumunda mevcut onay dialogu korunacak.

## Teknik detaylar
- `useBankImportSession.createSession` zaten açık oturumu yeniden kullanıyor; bu mekanizma kullanılacak.
- `useBankImportSession.saveTransactions` zaten mevcut satır numaralarını kontrol edip `rowOffset` uyguluyor; bu sayede farklı dosyaların satırları çakışmayacak.
- `source_file_name` ve `source_bank` alanları zaten her işleme kaydediliyor; bu sayede hangi işlemin hangi dosyadan geldiği takip edilebiliyor.
- Değiştirilecek ana dosyalar: `src/pages/finance/BankImport.tsx`, `src/hooks/finance/useBankFileUpload.ts`.
- Test: Örnek 2-3 Excel dosyası seçilip aynı oturumda birleştirilerek işlemlerin doğru çıktığı ve kategorilendirildiği kontrol edilecek.