-- ═══════════════════════════════════════════════════════════════════════════
-- AŞAMA 1: user_category_rules TABLOSU OLUŞTUR
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.user_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Kural tanımı
  pattern TEXT NOT NULL,
  category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  rule_type TEXT DEFAULT 'contains' CHECK (rule_type IN ('contains', 'startsWith', 'exact', 'regex')),
  
  -- Koşullar
  amount_condition TEXT DEFAULT 'any' CHECK (amount_condition IN ('positive', 'negative', 'any')),
  
  -- Ortak tanımlama için
  is_partner_rule BOOLEAN DEFAULT FALSE,
  partner_type TEXT CHECK (partner_type IN ('OUT', 'IN', 'BOTH')),
  
  -- Meta
  description TEXT,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pattern, amount_condition)
);

-- İndeksler
CREATE INDEX idx_user_rules_user_active ON public.user_category_rules(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_rules_priority ON public.user_category_rules(user_id, priority);

-- RLS
ALTER TABLE public.user_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules" ON public.user_category_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules" ON public.user_category_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules" ON public.user_category_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules" ON public.user_category_rules
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_user_category_rules_updated_at
  BEFORE UPDATE ON public.user_category_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- AŞAMA 2: GELİR KATEGORİLERİ - KEYWORDS GÜNCELLE
-- ═══════════════════════════════════════════════════════════════════════════

-- SBT Tracker
UPDATE public.transaction_categories SET keywords = ARRAY[
  'SBT', 'SBT TRACKER', 'KARBON', 'CARBON', 'AYAK İZİ', 'AYAKİZİ', 
  'EMİSYON', 'EMISSION', 'TRACKER', 'GHG', 'SERA GAZI', 'SCOPE', 'CDP', 'NET ZERO',
  'SBT TRACKER YAZILIM', 'SBT YAZ', 'SBT YZL', 'SBT YAZLM',
  'SBT HIZ', 'SBT HİZ', 'SBT HZMT', 'SBT HZM', 'SBT BED', 'SBT BDL',
  'TRACKER YAZ', 'TRACKER HIZ', 'TRACKER HİZ',
  'KARBON YAZ', 'KARBON HİZ', 'KARBON HIZ',
  'CARBON TRACK', 'CARBON SOFT', 'CARBON SW',
  'EMİS', 'EMIS', 'KARBONAYAK', 'KARB AYK',
  'GHG CALC', 'GHG HESAP', 'SERA GAZ', 'NET ZR', 'NETZERO', 'NET-ZERO'
] WHERE code = 'SBT';

-- ZDHC InCheck
UPDATE public.transaction_categories SET keywords = ARRAY[
  'ZDHC', 'INCHECK', 'IN CHECK', 'IN-CHECK', 'MRSL', 'GATEWAY',
  'KİMYASAL', 'CHEMICAL', 'DOĞRULAMA', 'VERIFICATION', 'WASTEWATER', 'ATIKSU',
  'ZDHC DOĞRULAMA', 'ZDHC DOĞ', 'ZDHC DOGR', 'ZDHC DGRLM', 'ZDHC DGRM',
  'ZDHC VER', 'ZDHC VERIF', 'ZDHC VRF', 'ZDHC VRFY',
  'ZDHC HIZ', 'ZDHC HİZ', 'ZDHC HZM', 'ZDHC HZMT', 'ZDHC BED', 'ZDHC BDL',
  'INCHECK DOĞ', 'INCHECK DOĞR', 'INCHECK VER', 'INCHECK VERIF',
  'INCHECK HIZ', 'INCHECK HİZ', 'INCHECK HZM',
  'INCHK', 'INCHCK', 'IN CHK', 'IN-CHK',
  'CHEM VER', 'CHEM VERIF', 'KİM DOĞ', 'KİM DOĞR', 'KİM VER',
  'MRSL VER', 'MRSL DOĞ', 'MRSL CHK', 'MRSL CHECK',
  'KIMYASAL DOG', 'KIMYASAL VER', 'WASTEWATER VER', 'ATIKSU DOĞ', 'ATIKSU VER'
] WHERE code = 'ZDHC';

-- Leadership & Sustainability
UPDATE public.transaction_categories SET keywords = ARRAY[
  'LEADERSHIP', 'LEADERSHİP', 'L&S', 'L%S', 'L S', 'SUSTAINABILITY',
  'PERFORMANCE', 'VERIFICATION', 'ASSESSMENT',
  'LEADERSHIP VER', 'LEADERSHIP VERIF', 'LEADERSHIP DOĞ', 'LEADERSHIP DOĞR',
  'LEADERSHIP HIZ', 'LEADERSHIP HİZ', 'LEADERSHIP HZM',
  'LEADERSHIP BED', 'LEADERSHIP BDL',
  'L&S VER', 'L&S DOĞ', 'L&S HIZ', 'L&S HİZ',
  'L&S DEN', 'L&S DENETIM', 'L&S DENET', 'L&S DNT',
  'SUSTAIN VER', 'SUSTAIN DOĞ', 'SUSTAIN HIZ',
  'LEAD VER', 'LEAD VERIF', 'LEAD DOĞ', 'LEAD HIZ',
  'LDSHP', 'LDRSHP', 'LEADRSHP',
  'SUST', 'SUSTNB', 'SUSTNBLTY',
  'PERF VER', 'PERF VERIF', 'PERF DOĞ', 'PERF ASSESS',
  'ASSESS', 'ASSMT', 'ASSMNT'
] WHERE code = 'L&S';

-- Danışmanlık Geliri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'DANIŞMANLIK GELİR', 'DANIŞMANLIK HİZMET', 'CONSULTING FEE', 
  'CONSULTANCY', 'MÜŞAVIR GELİR', 'HİZMET GELİR', 'SERVICE INCOME', 'ADVISORY',
  'DAN HIZ BED', 'DAN HİZ BED', 'DAN HZM BED', 'DAN HZM BDL',
  'DANIS HIZ', 'DANIS HİZ', 'DANIS HZM', 'DANIS HZMT',
  'DANŞM HIZ', 'DANŞM HİZ', 'DANŞM HZM',
  'DNŞ HIZ', 'DNŞ HİZ', 'DNŞ HZM', 'DNŞ BED',
  'DANIS', 'DANŞM', 'DANSMN', 'DANIŞM', 'DANŞ',
  'DNŞ', 'DNSM', 'DNSMN', 'DNSMNLK',
  'CONSULT', 'CNSLT', 'CNSLTNCY', 'CNSLTNG',
  'MÜŞVR', 'MUSVR', 'MUSAVIR', 'ADVISOR', 'ADVSR', 'ADVSRY',
  'HİZM', 'HIZM', 'HZM', 'HZMT'
] WHERE code = 'DANIS';

-- Masraf Yansıtma
UPDATE public.transaction_categories SET keywords = ARRAY[
  'MASRAF İADE', 'MASRAF GERİ', 'EXPENSE REFUND', 'MASRAF YANSITMA',
  'GİDER İADE', 'REIMBURSEMENT', 'EXPENSE RETURN',
  'MSR İAD', 'MSR IAD', 'MSR GERİ', 'MSR GERI',
  'MSRF İAD', 'MSRF IAD', 'MSRF YNS', 'MSRF YANS',
  'EXP REF', 'EXP REFND', 'EXP RFN', 'EXP RTN',
  'GDR İAD', 'GDR IAD', 'GİDR İAD',
  'REIMB', 'REMBRS', 'REIMBRSMT'
] WHERE code = 'MASRAF';

-- Eğitim Geliri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'EĞİTİM GELİR', 'EĞİTİM HİZMET', 'TRAINING INCOME', 'TRAINING FEE',
  'SEMİNER GELİR', 'WORKSHOP GELİR', 'KURS GELİR', 'COURSE FEE', 'WEBINAR',
  'EGT HIZ', 'EĞT HİZ', 'EĞİT HIZ', 'EĞİT HİZ',
  'EGT HZM', 'EĞT HZM', 'EĞİT HZM',
  'EGT BED', 'EĞT BED', 'EĞİT BED',
  'TRAIN HIZ', 'TRAIN HİZ', 'TRAIN FEE',
  'SEM HIZ', 'SEM HİZ', 'SEM FEE',
  'WRKSHP', 'WRKS', 'WKSHP',
  'EGITIM', 'EGTM', 'EĞT', 'EGIT',
  'TRAIN', 'TRNG', 'TRNNG',
  'SEMIN', 'SEMNR', 'SEM',
  'WEBINR', 'WEBNR', 'WEB SEM'
] WHERE code = 'EGITIM_IN';

-- Rapor/Belge Geliri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'RAPOR GELİR', 'RAPOR HİZMET', 'REPORT FEE', 'REPORT SERVICE',
  'SERTİFİKA GELİR', 'CERTIFICATE FEE', 'BELGE GELİR', 'DOCUMENT FEE',
  'RPR HIZ', 'RPR HİZ', 'RPR HZM', 'RPR BED',
  'RAPOR HIZ', 'RAPOR HİZ', 'RAPOR HZM',
  'SERT HIZ', 'SERT HİZ', 'SERT HZM', 'SERT BED',
  'CERT FEE', 'CERT SVC',
  'DOC FEE', 'DOC SVC', 'DOKÜM HIZ',
  'RPR', 'RAPR', 'RPRT', 'REP',
  'SERT', 'SRTFK', 'SERTF', 'CERT', 'CRTF',
  'BELG', 'BLG', 'DOC', 'DOCMT', 'DKMN'
] WHERE code = 'RAPOR';

-- Faiz Geliri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'FAİZ GELİR', 'FAİZ GELİRİ', 'INTEREST INCOME', 'MEVDUAT FAİZ',
  'DEPOSIT INTEREST', 'YENİ ORAN %', 'FAİZ %', 'NEMA',
  'FAİZ GL', 'FAİZ GLR', 'FAIZ GEL', 'FAIZ GLR',
  'FZ GEL', 'FZ GLR', 'FZ INC',
  'INT INC', 'INT INCM', 'INTRST INC',
  'MEVD FAİZ', 'MEVD FZ', 'MVD FZ', 'MVD FAİZ',
  'DEP INT', 'DPST INT', 'DPS INT'
] WHERE code = 'FAIZ_IN';

-- Döviz Satış Geliri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'DÖVİZ SATIŞ', 'DÖVİZ SAT', 'FX SELL', 'FOREX SELL',
  'USD SATIŞ', 'EUR SATIŞ', 'GBP SATIŞ', 'CURRENCY SELL',
  'DVZ SAT', 'DVZ SATIŞ', 'DVZ SATS', 'DÖV SAT',
  'FX SL', 'FX SEL', 'FOREX SL',
  'USD SAT', 'USD SL', 'EUR SAT', 'EUR SL', 'GBP SAT', 'GBP SL',
  'CURR SL', 'CURR SELL', 'CUR SL'
] WHERE code = 'DOVIZ_IN';

-- ═══════════════════════════════════════════════════════════════════════════
-- AŞAMA 3: GİDER KATEGORİLERİ - KEYWORDS GÜNCELLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Harici Danışmanlık Gideri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'HARİCİ DANIŞMANLIK', 'HARİCİ DANIŞMAN', 'EXTERNAL CONSULTANT',
  'DIŞ HİZMET', 'OUTSOURCE', 'TAŞERON', 'SUB-CONTRACT', 'FREELANCE',
  'SERBEST', 'PROJE BAZLI', 'YÖNLENDİRME', 'REFERRAL',
  'HAR DAN HIZ', 'HAR DAN HİZ', 'HAR DAN HZM',
  'HAR DANIS HIZ', 'HAR DANIS HİZ',
  'HRC DAN', 'HRC DANIS', 'HRC DANŞM',
  'DIŞ HIZ', 'DIŞ HİZ', 'DIS HİZ', 'DIS HIZ',
  'EXT CONS', 'EXT CNSLT', 'EXT SVC',
  'HARİCİ', 'HARICI', 'HRC', 'HRCI', 'EXT',
  'OUTSRC', 'OTSR', 'OUTSRCE',
  'TAŞRN', 'TSRN', 'TSERON',
  'SUBCONT', 'SUB CONT', 'SUBCNTRCT',
  'FREELANC', 'FRLNC', 'FRLNCR',
  'SERBST', 'SRBT', 'SERB'
] WHERE code = 'HARICI';

-- Danışmanlık Gideri (Genel)
UPDATE public.transaction_categories SET keywords = ARRAY[
  'DANIŞMANLIK ÖDEME', 'DANIŞMANLIK GİDER', 'CONSULTING EXPENSE',
  'HİZMET BEDELİ', 'SERVICE FEE', 'PROFESSIONAL FEE', 'ADVISORY FEE',
  'DAN HIZ BED', 'DAN HİZ BED', 'DAN HZM BED',
  'DANIS HIZ BED', 'DANIS HİZ BED', 'DANIS HZM BED',
  'DANŞM HIZ BED', 'DANŞM HİZ BED',
  'DNŞ HIZ BED', 'DNŞ HİZ BED',
  'DAN ÖD', 'DAN OD', 'DAN GDR', 'DAN GİD',
  'DANIS ÖD', 'DANIS OD', 'DANIS GDR',
  'DANŞM ÖD', 'DANŞM GDR',
  'DNŞ ÖD', 'DNŞ GDR',
  'CONS EXP', 'CNSLT EXP', 'CNSLT FEE',
  'SVC FEE', 'SRVC FEE', 'SERV FEE',
  'PROF FEE', 'PRFSSNL FEE',
  'ADV FEE', 'ADVSR FEE'
] WHERE code = 'DANIS_OUT';

-- Seyahat/Konaklama
UPDATE public.transaction_categories SET keywords = ARRAY[
  'SEYAHAT', 'OTEL', 'HOTEL', 'THY', 'TURKISH AIRLINES', 'PEGASUS',
  'BOOKING', 'TURİZM', 'KONAKLAMA', 'ACCOMMODATION', 'UÇAK', 'FLIGHT',
  'SANTA TUR', 'JOLLY TUR', 'ETS TUR', 'TRAVEL', 'TRANSFERİ',
  'HAVAALANI', 'AIRPORT', 'HOSTEL', 'AIRBNB', 'TRIVAGO',
  'SEY', 'SEYHT', 'SYHT', 'TRV', 'TRVL',
  'OTL', 'HTL', 'HOTL',
  'UCK', 'FLGHT', 'FLT',
  'KONK', 'KNKLM', 'ACCOM', 'ACCMD',
  'TURZM', 'TUR', 'TRZM',
  'HAVAALN', 'HVALANI', 'ARPT', 'AIRPRT',
  'TRF', 'TRNSFR', 'TRANSFER'
] WHERE code = 'SEYAHAT';

-- Fuar/Reklam/Pazarlama
UPDATE public.transaction_categories SET keywords = ARRAY[
  'FUAR', 'FAIR', 'EXHIBITION', 'STAND', 'KARTVİZİT', 'KARTVIZIT',
  'BUSINESS CARD', 'REKLAM', 'ADVERTISING', 'GOOGLE ADS', 'META ADS',
  'FACEBOOK', 'ÖRÜMCEK', 'BANNER', 'BILLBOARD', 'PATENT', 'MARKA TESCİL',
  'TRADEMARK', 'BROŞÜR', 'KATALOG', 'PROMOSYON', 'PROMOTIONAL',
  'LINKEDIN', 'INSTAGRAM', 'YOUTUBE ADS', 'INFLUENCER',
  'FR', 'FUR', 'EXHIB', 'EXHB', 'EXHIBTN',
  'STND', 'STN',
  'KRTV', 'KRTVZT', 'KARTVZ', 'BSNS CRD', 'BIZ CARD',
  'RKLM', 'REKLM', 'REKL', 'ADV', 'ADVRT', 'ADVRTSG',
  'GOGL ADS', 'GOOG ADS', 'G ADS',
  'META AD', 'FB ADS', 'FCBK ADS',
  'ÖRMCK', 'ORUMCEK', 'BNNR',
  'BLBRD', 'BILLBRD',
  'PTNT', 'PATEN', 'MRKA', 'MARKA', 'TM',
  'BROSR', 'BROSUR', 'BROCHURE', 'BROCH',
  'KTLG', 'KATALG', 'CAT', 'CATLOG',
  'PROMO', 'PROMOSYN', 'PRMSYN',
  'LNKDN', 'LINKDN', 'LI ADS',
  'INSTA', 'IG ADS', 'INSTGRM',
  'YT ADS', 'YOUTB ADS', 'YOUTUBE',
  'INFLNCR', 'INFLNSR'
] WHERE code = 'FUAR';

-- HGS/Ulaşım/Yakıt
UPDATE public.transaction_categories SET keywords = ARRAY[
  'HGS', 'OGS', 'YAKIT', 'PETROL', 'BENZİN', 'MOTORİN', 'DIESEL',
  'SHELL', 'BP', 'OPET', 'TOTAL', 'AYTEMIZ', 'PETLINE', 'PO',
  'KÖPRÜ', 'BRIDGE', 'OTOPARK', 'PARKING', 'VALE', 'GARAJ',
  'AVRASYA', 'AVRASYA TÜNELİ', 'KUZEY MARMARA', 'KMO', 'FSM',
  'GEBZE İZMİR', 'GEBZE IZMIR', 'OSMANGAZİ', 'OSMAN GAZİ', 'YAVUZ SULTAN',
  'OTOYOL', 'GEÇİŞ', 'TOLL', 'BAKIYE YÜKLEME',
  'YKT', 'YAKT', 'FUEL', 'PTRL', 'PETRL', 'PET',
  'BNZN', 'BENZN', 'GAS', 'MTRN', 'MOTRN', 'DSL', 'DISL',
  'KÖPR', 'KOPR', 'BRDG', 'OTPRK', 'OPRK', 'PARK', 'PRK', 'PRKNG',
  'AVRS', 'AVRSY', 'AVR TÜN', 'KZY MRM', 'K MARM', 'KMR',
  'GBZ İZM', 'GBZ IZM', 'G İZMİR', 'G IZMIR',
  'OSMNGZ', 'OSMGZ', 'OSM GAZ', 'OTYOL', 'OTYL', 'HWAY', 'HIGHWAY',
  'GEÇ', 'GECIS', 'GEÇIŞ', 'TL', 'BAK YÜK', 'BAKY', 'BAKIYE', 'TOPUP'
] WHERE code = 'HGS';

-- Sigorta
UPDATE public.transaction_categories SET keywords = ARRAY[
  'SİGORTA', 'SIGORTA', 'INSURANCE', 'KASKO', 'TRAFİK', 'TRAFIK',
  'POLİÇE', 'POLICE', 'POLICY', 'EUREKO', 'ALLIANZ', 'AXA',
  'ANADOLU SİGORTA', 'MAPFRE', 'HDI', 'ZURICH', 'GROUPAMA',
  'SOMPO', 'ERGO', 'DASK', 'DEPREM', 'PRİM TAHSİLATI', 'PREMIUM',
  'TSS', 'SAĞLIK SİGORTA', 'BES', 'HAYAT SİGORTA', 'LIFE INSURANCE',
  'FERDİ KAZA', 'KONUT',
  'SGR', 'SGRTA', 'SİG', 'SIG', 'INS', 'INSRNC',
  'KSK', 'KASK', 'TRFK', 'TRAFK', 'TRFC',
  'POL', 'POLC', 'PLCY', 'PRM', 'PRIM', 'PREM', 'PREMM',
  'SGLK', 'SAGLK', 'HLTH', 'HEALTH', 'HYT', 'HAYAT', 'LIFE',
  'FRD KZA', 'FRDI KZ', 'PERS ACC'
] WHERE code = 'SIGORTA';

-- Telekomünikasyon
UPDATE public.transaction_categories SET keywords = ARRAY[
  'TURKCELL', 'TRKCLL', 'VODAFONE', 'TÜRK TELEKOM', 'TURK TELEKOM',
  'TT', 'SUPERONLINE', 'INTERNET', 'MOBILE', 'CEP TELEFON',
  'GSM', 'DATA', 'FIBER', 'ADSL', 'VDSL', 'TTNET', 'TURKSAT',
  'D-SMART', 'TIVIBU', 'BIMCELL', 'PTTCELL', 'HAT', 'SIM',
  'TRKC', 'TRKCL', 'TCELL', 'T-CELL',
  'VODA', 'VDF', 'VODF',
  'TRK TEL', 'T TEL', 'TURKT',
  'SUPRONL', 'SPRLN', 'SPRONL',
  'INT', 'INTRNT', 'INTNET',
  'MOB', 'MOBIL', 'MBL',
  'CEPT', 'CEP T', 'TEL',
  'FBR', 'FIBR'
] WHERE code = 'TELEKOM';

-- Banka Masrafları
UPDATE public.transaction_categories SET keywords = ARRAY[
  'KESİNTİ VE EKLERİ', 'KESINTI VE EKLERI', 'KOMİSYON', 'KOMISYON',
  'COMMISSION', 'EFT MASRAF', 'HAVALE MASRAF', 'TRANSFER FEE',
  'HESAP İŞLETİM', 'ACCOUNT FEE', 'GİDEN FON TRANSFERİ', 'SWIFT',
  'TAHSİS ÜCRETİ', 'TEMİNAT TESİS', 'KART AİDAT', 'CARD FEE',
  'ANNUAL FEE', 'YILLIK', 'EKS MASRAF', 'ATM FEE', 'İŞLEM MASRAFI',
  'TRANSACTION FEE', 'VALÖR',
  'KESNT', 'KSNT', 'KST VE EKL', 'KOM', 'KOMSYN', 'KOMSY', 'COMM', 'CMSN',
  'EFT MSR', 'EFT MSRF', 'EFT MAS', 'HVL MSR', 'HVL MSRF', 'HVL MAS',
  'TRF FEE', 'TRNS FEE', 'TRNSFR FEE', 'HSP İŞL', 'HSP ISLTM', 'ACC FEE', 'ACCT FEE',
  'GDN FON', 'GIDEN FON', 'THSS', 'TAHSIS', 'THSIS',
  'TEMNT', 'TEMINAT', 'TEMNAT', 'KRT AİD', 'KART AID', 'CRD FEE',
  'YILLK', 'YLK', 'ANN FEE', 'ANNL', 'ATM MS', 'ATM FE',
  'İŞLM MSR', 'ISLM MSR', 'TXN FEE', 'VLR', 'VALOR'
] WHERE code = 'BANKA';

-- Vergi/Harç
UPDATE public.transaction_categories SET keywords = ARRAY[
  'VERGİ', 'VERGI', 'TAX', 'KDV', 'VAT', 'STOPAJ', 'WITHHOLDING',
  'GEÇİCİ VERGİ', 'KURUMLAR', 'GELİR VERGİSİ', 'MTV', 'DAMGA',
  'STAMP', 'HARÇ', 'FEE', 'BSMV', 'ÖTV', 'ÖİV', 'GİB',
  'VERGİ DAİRESİ', 'TAX OFFICE', 'BEYANNAME', 'CEZA', 'PENALTY',
  'GECİKME ZAMMI', 'INTEREST',
  'VRG', 'VRGI', 'VRGİ', 'TX',
  'STPJ', 'STOPJ', 'WTHHLD', 'WHT',
  'GEÇ VRG', 'GEC VRG', 'GECICI', 'PROV TAX',
  'KURM', 'KURMLAR', 'CORP TAX',
  'GEL VRG', 'GELIR V', 'INC TAX',
  'DMG', 'DAMG', 'STMP',
  'HRÇ', 'HARC', 'HARCI',
  'VRG DAİ', 'V DAİRESİ', 'TAX OFF',
  'BEYNN', 'BYNNM', 'DECL',
  'CZ', 'PEN', 'PNLTY',
  'GEC ZM', 'GECIKME', 'GCK ZAM', 'LATE FEE'
] WHERE code = 'VERGI';

-- Muhasebe/Mali Müşavir
UPDATE public.transaction_categories SET keywords = ARRAY[
  'MUHASEBE', 'ACCOUNTING', 'YMM', 'SMMM', 'MALİ MÜŞAVİR', 'MALI MUSAVIR',
  'BEYANNAME', 'DECLARATION', 'BA BS', 'E-DEFTER', 'E-FATURA',
  'DENETİM', 'AUDIT', 'VERGİ DANIŞMAN', 'TAX ADVISOR',
  'KEP', 'E-İMZA', 'E-SIGNATURE', 'LUCA', 'LOGO', 'MIKRO',
  'ETA', 'PARAŞÜT', 'BIZIM HESAP', 'UYUMSOFT',
  'MHS', 'MUHSB', 'MUHSBE', 'ACCT', 'ACCNT', 'ACCNTNG',
  'MLI MSV', 'MALI MSV', 'MALI MUS',
  'BYNNM', 'BEYNN', 'DECL',
  'BA-BS', 'BABS',
  'E-DFT', 'E DFT', 'EDEFTER',
  'E-FTR', 'E FTR', 'EFATURA',
  'DNT', 'DNTM', 'DENETM', 'AUD', 'AUDT',
  'VRG DAN', 'VRG DANS', 'TAX ADV'
] WHERE code = 'MUHASEBE';

-- Hukuk/Noter
UPDATE public.transaction_categories SET keywords = ARRAY[
  'AVUKAT', 'LAWYER', 'ATTORNEY', 'HUKUK', 'LEGAL', 'LAW FIRM',
  'NOTER', 'NOTARY', 'DAVA', 'LAWSUIT', 'VEKİL', 'VEKALET',
  'MAHKEME', 'COURT', 'İCRA', 'ENFORCEMENT', 'ARBİTRASYON',
  'SÖZLEŞME', 'CONTRACT', 'PATENT VEKİL', 'TESCİL',
  'AVK', 'AVKT', 'AVUKT', 'LWY', 'LWYR', 'ATT', 'ATTRNY',
  'HKK', 'HUKK', 'LGL', 'LEGL',
  'NTR', 'NOTR', 'NTRY',
  'DV', 'LWST', 'SUIT',
  'VKL', 'VEKL', 'VEKIL',
  'MHKM', 'MAHKM', 'CRT',
  'İCR', 'ICRA', 'ENFRC',
  'ARB', 'ARBITR', 'ARBTRSY',
  'SÖZL', 'SOZLESME', 'CNTRCT', 'CONTRCT'
] WHERE code = 'HUKUK';

-- Kargo/Nakliye
UPDATE public.transaction_categories SET keywords = ARRAY[
  'KARGO', 'CARGO', 'NAKLİYE', 'SHIPPING', 'FREIGHT', 'LOGISTICS',
  'ARAS', 'MNG', 'YURTIÇI', 'YURTİÇİ', 'UPS', 'DHL', 'FEDEX', 'TNT',
  'PTT', 'POSTA', 'SÜRAT', 'HEPSİJET', 'TRENDYOL EXPRESS',
  'GETİR', 'SCOTTY', 'KURYE', 'COURIER', 'DELIVERY', 'TESLİMAT',
  'KRG', 'KARG', 'CRG', 'CRGO',
  'NKL', 'NAKLYE', 'NKLY', 'SHIP', 'SHPNG',
  'FRT', 'FREGHT', 'FRGHT',
  'LOG', 'LOGSTC', 'LGSTCS',
  'YRTİÇİ', 'YRTICI', 'YURTI',
  'KRYE', 'COURR',
  'DLVRY', 'DELIVRY', 'DEL',
  'TSLMT', 'TESLIMT'
] WHERE code = 'KARGO';

-- Ofis/Kırtasiye
UPDATE public.transaction_categories SET keywords = ARRAY[
  'KIRTASİYE', 'OFİS', 'TONER', 'KAĞIT', 'STATIONERY', 'OFFICE SUPPLIES',
  'KALEM', 'DOSYA', 'KLASİK', 'PANO', 'BEYAZ EŞYA', 'OFIS MALZEME',
  'KRTSY', 'KIRTAS', 'STTNRY',
  'OFS', 'OFIS', 'OFF',
  'TNR', 'TONR',
  'KGT', 'KAGIT', 'PAPER',
  'KLM', 'PEN', 'PENCIL',
  'DESY', 'DOSYA', 'FILE', 'FOLDER',
  'OFF SUP', 'OFF SPPLY', 'SUPPLIES'
] WHERE code = 'OFIS';

-- Yazılım/Abonelik
UPDATE public.transaction_categories SET keywords = ARRAY[
  'YAZILIM', 'SOFTWARE', 'ADOBE', 'MICROSOFT', 'MS 365', 'OFFICE 365',
  'GOOGLE', 'WORKSPACE', 'GMAIL', 'ZOOM', 'TEAMS', 'SLACK',
  'AWS', 'AMAZON WEB', 'AZURE', 'CLOUD', 'HOSTING', 'DOMAIN',
  'SUBSCRIPTION', 'ABONELİK', 'SAAS', 'LICENSE', 'LİSANS',
  'DROPBOX', 'NOTION', 'ASANA', 'TRELLO', 'JIRA', 'GITHUB',
  'CANVA', 'FIGMA', 'CHATGPT', 'OPENAI', 'ANTHROPIC', 'API',
  'SSL', 'SECURITY', 'ANTIVIRUS', 'VPN', 'CLOUDFLARE', 'VERCEL',
  'LOVABLE', 'SUPABASE', 'FIREBASE', 'NETLIFY', 'HEROKU',
  'YZL', 'YAZLM', 'YAZLIM', 'YAZ', 'SW', 'SFTWR', 'SOFT',
  'MS', 'MSFT', 'MICRO', 'O365', 'M365',
  'GOOGL', 'GOOG', 'GWS', 'GWRKSPC',
  'SUBSCR', 'SUBS', 'SUBSCRPTN',
  'ABN', 'ABNLK', 'ABONELK',
  'LIC', 'LICNS', 'LISNS',
  'CLUD', 'CLD',
  'HSTNG', 'HST', 'HOST',
  'DMN', 'DOMN',
  'ANTIVRS', 'AV', 'SCRTY'
] WHERE code = 'YAZILIM';

-- Müşteri İadesi
UPDATE public.transaction_categories SET keywords = ARRAY[
  'İADE', 'IADE', 'REFUND', 'RETURN', 'İPTAL', 'IPTAL', 'CANCEL',
  'GERİ ÖDEME', 'GERI ODEME', 'PAYBACK', 'CHARGEBACK',
  'MÜŞTERİ İADE', 'MUSTERI IADE', 'CUSTOMER REFUND',
  'FATURA İPTAL', 'CREDIT NOTE', 'ALACAK DEKONTU',
  'İAD', 'IAD', 'RFN', 'REFND', 'RFUND', 'RTN', 'RETRN',
  'İPT', 'IPT', 'CNCL',
  'GR ÖD', 'GR OD', 'GERI OD',
  'CHGBCK', 'CHRGBK', 'CB', 'MST İAD', 'MUST IAD', 'CUST REF',
  'FTR İPT', 'FTR IPT', 'INV CNCL', 'CR NOTE', 'CRDT NT', 'CREDIT N',
  'ALC DKN', 'ALACAK DK'
] WHERE code = 'IADE';

-- ═══════════════════════════════════════════════════════════════════════════
-- AŞAMA 4: FİNANSMAN KATEGORİLERİ - KEYWORDS GÜNCELLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Kredi Kullanım
UPDATE public.transaction_categories SET keywords = ARRAY[
  'TİCARİ AMAÇLI KRD.KULL', 'TICARI AMACLI KRD', 'KREDİ KULLANIM',
  'LOAN DISBURSEMENT', 'BR.KAMP.KULL', 'KREDİ AKTARIM', 'CREDIT TRANSFER',
  'LİMİT KULLANIM', 'LIMIT USAGE', 'KREDİLİ MEVDUAT',
  'OVERDRAFT', 'SPOT KREDİ', 'ROTATIF',
  'TİC KRD', 'TIC KRD', 'TICARI KRD', 'TİCARİ KRD',
  'KRD KUL', 'KRD KULL', 'KREDİ KUL', 'KREDI KUL',
  'LOAN DSB', 'LN DISB', 'LOAN DIS', 'BR KAMP', 'BRKAMP',
  'KRD AKT', 'KREDI AKT', 'CR TRANS', 'LMT KUL', 'LIMIT KUL', 'LIM USE',
  'KRDLİ MVD', 'KREDILI MVD', 'OVRDFT', 'OD',
  'SPT KRD', 'SPOT KR', 'SPOT', 'ROT', 'ROTATF', 'REVOLV'
] WHERE code = 'KREDI_IN';

-- Faiz Gideri
UPDATE public.transaction_categories SET keywords = ARRAY[
  'FAİZ TAHSİLATI', 'FAIZ TAHSILATI', 'INTEREST PAYMENT',
  'KREDİLİ HESAP FAİZ', 'KREDILI HESAP FAIZ', 'FAİZ GİDER', 'FAIZ GIDER',
  'INTEREST EXPENSE', 'FINANCE CHARGE', 'TEMERRÜT FAİZ',
  'DEFAULT INTEREST', 'GECİKME FAİZ',
  'FAİZ THS', 'FAIZ THS', 'FZ THSLT', 'FZ TAH',
  'INT PMT', 'INT PYMT', 'INTRST PMT', 'KRD HSP FZ', 'KREDILI FZ', 'KRDLİ FAİZ',
  'FZ GDR', 'FAİZ GD', 'FAIZ GD', 'INT EXP',
  'FIN CHG', 'FIN CHRG', 'FINANCE CH', 'TEMRT FZ', 'TEMERRUT', 'DFLT INT',
  'GEC FZ', 'GECIKME FZ', 'LATE INT'
] WHERE code = 'FAIZ_OUT';

-- Kredi Ödeme (Taksit)
UPDATE public.transaction_categories SET keywords = ARRAY[
  'KREDİ TAHS', 'KREDI TAHS', 'LOAN PAYMENT', 'TAKSİT', 'TAKSIT',
  'INSTALLMENT', 'O4-(TİCARİ AMAÇLI KREDİ', 'TİCARİ KREDİ',
  'COMMERCIAL LOAN', 'İHTİYAÇ KREDİSİ', 'CONSUMER LOAN',
  'KONUT KREDİSİ', 'TAŞIT KREDİSİ', 'AUTO LOAN', 'KREDİ KARTI TAKSİT',
  'KRD THS', 'KREDI TH', 'KREDİ TH', 'LN PMT', 'LOAN PMT',
  'TKS', 'TAKST', 'INST', 'INSTLMT',
  'O4', 'O4-TİC', 'O4-TIC', 'TİC KRD', 'COMM LN', 'COMM LOAN',
  'İHT KRD', 'IHT KRD', 'IHTIYAC', 'CONS LN',
  'KONUT KR', 'KNT KRD', 'MORTG', 'MORTGAGE',
  'TAŞIT KR', 'TASIT KR', 'AUTO LN', 'CAR LN', 'KK TKS', 'KK TAKSIT', 'CC INST'
] WHERE code = 'KREDI_OUT';

-- Döviz Alış
UPDATE public.transaction_categories SET keywords = ARRAY[
  'DÖVİZ ALIŞ', 'FX BUY', 'FOREX BUY', 'CURRENCY BUY',
  'USD ALIŞ', 'EUR ALIŞ', 'GBP ALIŞ',
  'DVZ ALIŞ', 'DVZ ALS', 'DÖV ALIŞ', 'DÖV ALS',
  'FX BY', 'FX PURCHASE', 'FOREX BY',
  'USD ALS', 'USD BY', 'EUR ALS', 'EUR BY', 'GBP ALS', 'GBP BY',
  'CURR BY', 'CURR BUY', 'CUR BY'
] WHERE code = 'DOVIZ_OUT';

-- ═══════════════════════════════════════════════════════════════════════════
-- AŞAMA 5: HARİÇ KATEGORİLERİ - KEYWORDS GÜNCELLE
-- ═══════════════════════════════════════════════════════════════════════════

-- İç Transfer
UPDATE public.transaction_categories SET keywords = ARRAY[
  'VİRMAN', 'VIRMAN', 'HESAPLAR ARASI', 'BETWEEN ACCOUNTS',
  'İÇ TRANSFER', 'IC TRANSFER', 'INTERNAL TRANSFER', 'KENDİ HESABIMA',
  'SELF TRANSFER', 'ACCOUNT TRANSFER', 'ARA HESAP',
  'VRM', 'VRMN', 'VIRM', 'HSP ARS', 'HSPLR ARS', 'BTWN ACC',
  'İÇ TR', 'IC TR', 'INT TR', 'INT TRANS',
  'KND HSP', 'KENDI HSP', 'SELF TR', 'ACC TR', 'ACCT TR', 'ACC TRANS',
  'ARA HSP', 'ARAHSP'
] WHERE code = 'IC_TRANSFER';

-- Hariç Tutulacak
UPDATE public.transaction_categories SET keywords = ARRAY[
  'MEVDUAT GERİ', 'MEVDUAT GERI', 'DEPOSIT RETURN', 'VAD.HES.AÇILIŞI',
  'VADELİ HESAP', 'VADELI HESAP', 'TERM DEPOSIT', 'REFERANS KAPAMA',
  'BAL TRN', 'BALANCE TRANSFER', 'TEKNİK DÜZELTME', 'CORRECTION',
  'İPTAL KAYIT', 'REVERSAL', 'TEST', 'DENEME', 'HATA DÜZELTME', 'ERROR FIX',
  'MVD GERİ', 'MVD GERI', 'MEVD GR', 'DEP RTN',
  'VAD HSP', 'VAD HS', 'VDL HSP', 'TERM DEP', 'TD',
  'REF KAP', 'REFKAP', 'REF KAPA', 'BAL TR', 'BALTRN',
  'TEK DÜZ', 'TEKNIK DZ', 'CORR', 'CRRCT', 'İPT KYT', 'IPT KYT', 'IPTAL K', 'REV', 'REVRS',
  'TST', 'DENM', 'DNM', 'HT DÜZ', 'HATA DZ', 'ERR FX', 'ERROR F'
] WHERE code = 'EXCLUDED';

-- Nakit Çekim
UPDATE public.transaction_categories SET keywords = ARRAY[
  'ATM', 'NAKİT ÇEKİM', 'NAKIT CEKIM', 'CASH WITHDRAWAL', 'BANKAMATİK',
  'BANKAMATIK', 'PARA ÇEK', 'PARA CEK', 'WITHDRAW', 'CASH OUT', 'NAKİT AVANS',
  'NKT ÇK', 'NKT CK', 'NAKIT CK', 'CASH WD', 'CASH WTHDRW',
  'BNKMT', 'BNKMTK', 'BANKMT', 'PR ÇK', 'PR CK', 'PARA C',
  'WTHDR', 'WTHDRL', 'WDRAW', 'CSH OUT', 'CSHOUT', 'NKT AVN', 'NAKIT AV', 'CASH ADV'
] WHERE code = 'NAKIT_CEKME';