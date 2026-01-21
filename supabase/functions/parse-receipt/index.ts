import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert file to base64 data URL
async function fetchAsBase64(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  
  return {
    dataUrl: `data:${contentType};base64,${base64}`,
    mimeType: contentType
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, documentType = 'received' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch file and convert to base64 data URL
    console.log('Fetching file and converting to base64...');
    const { dataUrl, mimeType } = await fetchAsBase64(imageUrl);
    
    // Check file extension from URL for HTML files (storage may return text/plain)
    // Remove query string before checking extension
    const urlPath = imageUrl.split('?')[0].toLowerCase();
    const isHtmlByExtension = urlPath.endsWith('.html') || urlPath.endsWith('.htm');
    
    // Validate mime type - now includes PDF and HTML
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/html'];
    const isSupported = isHtmlByExtension || supportedTypes.some(t => {
      if (t === 'application/pdf') return mimeType.includes('pdf');
      if (t === 'text/html') return mimeType.includes('html');
      return mimeType.includes(t.split('/')[1]);
    });
    
    if (!isSupported) {
      return new Response(JSON.stringify({ 
        error: `Desteklenmeyen dosya formatı: ${mimeType}. Lütfen JPG, PNG, WebP, GIF, PDF veya HTML yükleyin.`,
        supportedFormats: supportedTypes
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const isPdf = mimeType.includes('pdf');
    const isHtml = isHtmlByExtension || mimeType.includes('html');
    
    if (isPdf) {
      console.log('Processing PDF file with Gemini...');
    }
    if (isHtml) {
      console.log('Processing HTML file with Gemini...');
    }

    const systemPrompt = `Sen Türk fiş/fatura OCR uzmanısın.

GÖREV: Verilen fiş/fatura görüntüsünden detaylı bilgileri çıkar.

VKN ve TCKN FARKI (ÇOK ÖNEMLİ):
- VKN (Vergi Kimlik Numarası): 10 haneli, şirketler/tüzel kişiler için
- TCKN (T.C. Kimlik Numarası): 11 haneli, şahıslar/gerçek kişiler için
- Her ikisi de TÜRKİYE'de YURTİÇİ belgedir!
- "VKN:" veya "TCKN:" etiketinden sonra gelen numarayı al
- Eğer 10 hane ise VKN (şirket), 11 hane ise TCKN (şahıs)

e-ARŞİV FATURA YAPISI:
- Sol üst köşe: SATAN (kesen) bilgileri - Ad/Ünvan, TCKN veya VKN, Adres
- Orta: e-Arşiv Fatura logosu, QR kod
- "SAYIN" yazısı altında: ALICI (alan) bilgileri - Ad/Ünvan, VKN, Adres
- Sağ üst kutu: Fatura No (GIB...), Tarih, Senaryo, Tip
- Tablo: Mal/Hizmet kalemleri
- Alt kısım: Toplam tutarlar, KDV

ÇIKARILACAK ALANLAR:

SATICI BİLGİLERİ (Faturayı Kesen):
- sellerName: Satıcı firma adı VEYA şahıs adı-soyadı
- sellerTaxNo: Satıcı VKN (10 hane) veya TCKN (11 hane)
- sellerAddress: Satıcı adresi

ALICI BİLGİLERİ (Faturayı Alan):
- buyerName: Alıcı firma/kişi adı (varsa)
- buyerTaxNo: Alıcı VKN (10 hane) veya TCKN (11 hane) (varsa)
- buyerAddress: Alıcı adresi (varsa)

BELGE BİLGİLERİ:
- receiptDate: Tarih (DD.MM.YYYY formatında)
- receiptNo: Fiş/Fatura numarası

TUTAR BİLGİLERİ:
- subtotal: Ara toplam (KDV hariç, sayı) - DÖVİZ CİNSİNDEN
- vatRate: KDV oranı (%, örn: 20)
- vatAmount: KDV tutarı (sayı) - DÖVİZ CİNSİNDEN
- withholdingTaxRate: Stopaj oranı (varsa, %)
- withholdingTaxAmount: Stopaj tutarı (varsa, sayı)
- stampTaxAmount: Damga vergisi (varsa, sayı)
- totalAmount: Genel toplam (sayı) - DÖVİZ CİNSİNDEN

TL KARŞILIKLARI (DÖVİZLİ FATURALARDA ÇOK ÖNEMLİ):
- subtotalTRY: Matrah TL tutarı (varsa, "Mal Hizmet Toplam Tutarı(TL)" satırından)
- vatAmountTRY: KDV TL tutarı (varsa, "Hesaplanan KDV(%)(TL)" satırından)
- amountTRY: Toplam TL tutarı (varsa, "Ödenecek Tutar(TL)" veya "Vergiler Dahil Toplam Tutar(TL)" satırından)
- exchangeRateFromInvoice: Faturadaki döviz kuru (varsa, "#EUR Kuru", "#USD Kuru", "Döviz Kuru" notlarından)

DİĞER:
- currency: Para birimi (TRY, USD, EUR vb.)
- confidence: Güven skoru (0-1 arası)

YURTİÇİ / YURTDIŞI TESPİTİ (ÇOK ÖNEMLİ):

YURTİÇİ FATURA İPUÇLARI (isForeign: false):
- VKN: 10 haneli numara (örn: 0511149566) → Türk şirketi = YURTİÇİ
- TCKN: 11 haneli numara (örn: 20612201206) → Türk vatandaşı/şahıs = YURTİÇİ
- Türk adresi: İstanbul, Ankara, İzmir vb. şehir isimleri
- Türk vergi dairesi adı
- TL veya TRY para birimi
- Türkçe yazılmış belge

YURTDIŞI FATURA İPUÇLARI (isForeign: true):
- Vergi numarası Türk formatında DEĞİL (10-11 hane değil)
- EIN, VAT, ABN gibi yabancı vergi numaraları
- Adres: "United States", "USA", "UK", "Germany", "Netherlands", yabancı şehir/ülke isimleri
- Dil: İngilizce, Almanca vb. yazılmış
- Para birimi: USD, EUR, GBP vb.
- Firma isimleri: "Inc.", "LLC", "GmbH", "Ltd.", "BV" içeren
- KDV yok veya VAT/Sales Tax farklı oran
- YURTDIŞI FATURALARDA TÜRK KDV'Sİ OLMAZ - vatRate ve vatAmount null olmalı

DÖVİZLİ YURTİÇİ FATURA TESPİTİ (ÇOK ÖNEMLİ):
- EUR veya USD cinsinden kesilen AMA Türk firmaya (VKN: 10-11 hane) kesilen faturalar
- Bu faturalarda HEM döviz HEM TL tutarları yazar - HER İKİSİNİ DE ÇIKAR!
- "Ödenecek Tutar(TL)", "Vergiler Dahil Toplam Tutar(TL)" satırlarını ara → amountTRY
- "Mal Hizmet Toplam Tutarı(TL)" satırını ara → subtotalTRY
- "Hesaplanan KDV(%)(TL)" satırını ara → vatAmountTRY
- NOTLAR bölümünde "#EUR Kuru : XX.XXXX TRY" veya "#USD Kuru" ara → exchangeRateFromInvoice
- Faturada TRY tutarları varsa ONLARI KULLAN, dışarıdan kur hesaplatma!

BELGE TİPİ TESPİTİ (ÇOK ÖNEMLİ):
- documentSubtype: "slip" veya "invoice"

FATURA İPUÇLARI (invoice) - Aşağıdakilerden BİRİ varsa FATURA:
- GIB ile başlayan herhangi bir numara (GIB2025*, GIB2024*, vb.) -> FATURA
- E-Arşiv, E-FATURA, e-Belge, E-ARŞİV FATURA kelimeleri -> FATURA
- HTML formatında belge (genellikle e-Arşiv) -> FATURA
- Alıcı VKN/TCKN bilgisi (buyerTaxNo) varsa -> FATURA
- Stopaj veya damga vergisi bilgisi varsa -> FATURA
- Fatura numarası formatları: FA*, SLS*, INV*, FTR* -> FATURA
- FATURA, SATIŞ FATURASI, İRSALİYE kelimeleri -> FATURA
- Detaylı alıcı/satıcı bilgileri (her ikisinin de VKN ve adresi var) -> FATURA
- PDF formatında resmi belge -> FATURA
- TEVKİFAT, INVOICE kelimeleri -> FATURA

FİŞ İPUÇLARI (slip) - SADECE aşağıdakilerin TÜMÜ geçerliyse FİŞ:
- Yazar kasa fişi, POS fişi, ÖKC fişi, EKÜ formatı
- Alıcı bilgisi (buyerName, buyerTaxNo) YOK
- Kısa format, tek sayfa, basit liste
- İçerik: YEMEK, BENZİN, AKARYAKIT, KAHVE, MARKET alışverişi
- Mekan: BÜFE, MARKET, RESTORAN, LOKANTA, ECZANE, PETROL
- Format: FİŞ NO, POS, EKÜ NO, Z NO, YAZAR KASA, PERAKENDESATIŞFİŞİ, ÖKC

ÖNEMLİ: Şüphe durumunda "invoice" tercih et. GIB numarası varsa KESİNLİKLE "invoice"!

ÇIKTI FORMAT:
Sadece JSON object döndür:
{
  "sellerName": "X Şirketi",
  "sellerTaxNo": "1234567890",
  "sellerAddress": "İstanbul",
  "buyerName": null,
  "buyerTaxNo": null,
  "buyerAddress": null,
  "receiptDate": "01.01.2025",
  "receiptNo": "A-123",
  "subtotal": 1000.00,
  "vatRate": 20,
  "vatAmount": 200.00,
  "subtotalTRY": null,
  "vatAmountTRY": null,
  "amountTRY": null,
  "exchangeRateFromInvoice": null,
  "withholdingTaxRate": null,
  "withholdingTaxAmount": null,
  "stampTaxAmount": null,
  "totalAmount": 1200.00,
  "currency": "TRY",
  "confidence": 0.9,
  "documentSubtype": "invoice",
  "isForeign": false,
  "foreignSellerCountry": null
}

Okunamayan alanlar için null kullan.
YURTDIŞI FATURADA: isForeign: true, vatRate: null, vatAmount: null olmalı!`;

    console.log('Calling Lovable AI Gateway with Gemini 2.5 Pro...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { 
            role: 'user', 
            content: [
              { 
                type: 'image_url', 
                image_url: { url: dataUrl } 
              },
              { 
                type: 'text', 
                text: `${systemPrompt}\n\nBu ${documentType === 'issued' ? 'kesilen faturayı' : 'fiş/faturayı'} analiz et.` 
              }
            ]
          }
        ],
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit aşıldı, lütfen biraz bekleyin.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Kredi yetersiz, lütfen Lovable hesabınıza kredi ekleyin.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Gateway response structure:', JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      finishReason: data.choices?.[0]?.finish_reason,
      contentLength: data.choices?.[0]?.message?.content?.length
    }));
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      // Log full response for debugging
      console.error('Empty AI response. Full data:', JSON.stringify(data).slice(0, 1000));
      
      // Check if there's an error in the response
      if (data.error) {
        throw new Error(`AI Gateway error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      // Check for content filtering
      if (data.choices?.[0]?.finish_reason === 'content_filter') {
        throw new Error('Content was filtered by AI safety system');
      }
      
      throw new Error('No content in AI response - the model may have failed to process the image');
    }
    
    // Extract JSON object from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result = null;
    
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
        
        // Normalize amounts - handle Turkish number format
        const normalizeAmount = (val: any) => {
          if (val === null || val === undefined) return null;
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            // Handle Turkish format: 1.234,56 -> 1234.56
            return parseFloat(val.replace(/\./g, '').replace(',', '.'));
          }
          return null;
        };
        
        result.subtotal = normalizeAmount(result.subtotal);
        result.totalAmount = normalizeAmount(result.totalAmount);
        result.vatAmount = normalizeAmount(result.vatAmount);
        result.withholdingTaxAmount = normalizeAmount(result.withholdingTaxAmount);
        result.stampTaxAmount = normalizeAmount(result.stampTaxAmount);
        
        // Normalize rates
        if (result.vatRate && typeof result.vatRate === 'string') {
          result.vatRate = parseFloat(result.vatRate.replace('%', ''));
        }
        if (result.withholdingTaxRate && typeof result.withholdingTaxRate === 'string') {
          result.withholdingTaxRate = parseFloat(result.withholdingTaxRate.replace('%', ''));
        }
        
        // Ensure documentSubtype is valid
        if (!result.documentSubtype || !['slip', 'invoice'].includes(result.documentSubtype)) {
          // Fallback detection based on parsed content
          const hasInvoiceMarkers = 
            result.buyerTaxNo || 
            result.withholdingTaxAmount || 
            result.stampTaxAmount ||
            (result.receiptNo && result.receiptNo.length > 15);
          
          result.documentSubtype = hasInvoiceMarkers ? 'invoice' : 'slip';
        }
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw text:', content);
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('parse-receipt error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
