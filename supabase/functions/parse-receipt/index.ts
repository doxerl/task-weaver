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
    const urlLower = imageUrl.toLowerCase();
    const isHtmlByExtension = urlLower.endsWith('.html') || urlLower.endsWith('.htm');
    
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

ÇIKARILACAK ALANLAR:

SATICI BİLGİLERİ (Faturayı Kesen):
- sellerName: Satıcı firma adı (genellikle üst kısımda)
- sellerTaxNo: Satıcı VKN/TCKN (10-11 hane)
- sellerAddress: Satıcı adresi

ALICI BİLGİLERİ (Faturayı Alan):
- buyerName: Alıcı firma/kişi adı (varsa)
- buyerTaxNo: Alıcı VKN/TCKN (varsa)
- buyerAddress: Alıcı adresi (varsa)

BELGE BİLGİLERİ:
- receiptDate: Tarih (DD.MM.YYYY formatında)
- receiptNo: Fiş/Fatura numarası

TUTAR BİLGİLERİ:
- subtotal: Ara toplam (KDV hariç, sayı)
- vatRate: KDV oranı (%, örn: 20)
- vatAmount: KDV tutarı (sayı)
- withholdingTaxRate: Stopaj oranı (varsa, %)
- withholdingTaxAmount: Stopaj tutarı (varsa, sayı)
- stampTaxAmount: Damga vergisi (varsa, sayı)
- totalAmount: Genel toplam (sayı)

DİĞER:
- currency: Para birimi (TRY, USD, EUR vb.)
- confidence: Güven skoru (0-1 arası)

YURTDIŞI FATURA TESPİTİ (ÖNEMLİ):
- isForeign: true/false - Satıcı yurtdışında mı?
- foreignSellerCountry: Satıcının ülkesi (USA, Germany, UK vb.)

YURTDIŞI FATURA İPUÇLARI:
- Adres: "United States", "USA", "UK", "Germany", "Netherlands", yabancı şehir/ülke isimleri
- VKN formatı: Türk VKN değil (10-11 hane olmayan), EIN, VAT numarası
- Dil: İngilizce, Almanca vb. yazılmış
- Para birimi: USD, EUR, GBP vb.
- Firma isimleri: "Inc.", "LLC", "GmbH", "Ltd.", "BV" içeren
- KDV yok veya VAT/Sales Tax farklı oran
- YURTDIŞI FATURALARDA TÜRK KDV'Sİ OLMAZ - vatRate ve vatAmount null olmalı

BELGE TİPİ TESPİTİ:
- documentSubtype: "slip" veya "invoice"

FİŞ İPUÇLARI (slip) - Aşağıdakilerden biri varsa "slip":
- İçerik kelimeleri: YEMEK, BENZIN, BENZİN, DİZEL, MOTORIN, MOTORİN, AKARYAKIT, İÇECEK, KAHVE, SU, EKMEK, SİGARA, HAMBURGER, DÖNER, PİDE, LAHMACUN, AYRAN, COLA, KOLA, ÇAY, SANDVIÇ, TOST, PIZZA
- Mekan türleri: BÜFE, MARKET, RESTORAN, LOKANTA, ECZANE, PETROL, AKARYAKIT İSTASYONU, CAFE, KAFETERYA, BAKKAL, MANAV, KASAP, FIRIN
- Belge formatı: FİŞ, FİŞ NO, POS, EKÜ NO, Z NO, YAZAR KASA, PERAKENDESATIŞFİŞİ, ÖKC, PERAKENDE SATIŞ FİŞİ
- Kısa, basit format, tek sayfa, VKN ile başlayan

FATURA İPUÇLARI (invoice) - Aşağıdakilerden biri varsa "invoice":
- Kelimeler: FATURA, E-FATURA, E-ARŞİV, SATIŞ FATURASI, İRSALİYE, FATURA NO, GIB, TEVKİFAT, STOPAJ, INVOICE
- GIB numarası (uzun alfanumerik kod)
- Detaylı alıcı/satıcı bilgileri (her ikisinin de VKN ve adresi var)
- Stopaj veya damga vergisi bilgisi
- Uzun, resmi format, birden fazla sayfa olabilir

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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
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
