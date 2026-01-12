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
    const { imageUrl } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch file and convert to base64 data URL
    console.log('Fetching file and converting to base64...');
    const { dataUrl, mimeType } = await fetchAsBase64(imageUrl);
    
    // Validate mime type - now includes PDF
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const isSupported = supportedTypes.some(t => {
      if (t === 'application/pdf') return mimeType.includes('pdf');
      return mimeType.includes(t.split('/')[1]);
    });
    
    if (!isSupported) {
      return new Response(JSON.stringify({ 
        error: `Desteklenmeyen dosya formatı: ${mimeType}. Lütfen JPG, PNG, WebP, GIF veya PDF yükleyin.`,
        supportedFormats: supportedTypes
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const isPdf = mimeType.includes('pdf');
    if (isPdf) {
      console.log('Processing PDF file with Gemini...');
    }

    const systemPrompt = `Sen Türk fiş/fatura OCR uzmanısın.

GÖREV: Verilen fiş/fatura görüntüsünden bilgileri çıkar.

ÇIKARILACAK ALANLAR:
- vendorName: Mağaza/Firma adı (üst kısımda genellikle)
- vendorTaxNo: Vergi numarası (VKN/TCKN, 10-11 hane)
- receiptDate: Tarih (DD.MM.YYYY formatında)
- receiptNo: Fiş/Fatura numarası
- totalAmount: Toplam tutar (sayı olarak)
- taxAmount: KDV tutarı (sayı olarak)
- currency: Para birimi (varsayılan TRY)

İPUÇLARI:
- "TOPLAM", "GENEL TOPLAM", "ÖDENECEK" → totalAmount
- "KDV", "VERGİ" → taxAmount
- VKN: Vergi Kimlik No (10-11 hane)
- Üst kısımdaki büyük yazı genellikle firma adı

ÇIKTI FORMAT:
Sadece JSON object döndür:
{"vendorName":"X","vendorTaxNo":"Y","receiptDate":"01.01.2025","receiptNo":"Z","totalAmount":123.45,"taxAmount":20.57,"currency":"TRY","confidence":0.9}

Okunamayan alanlar için null kullan.`;

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
                text: `${systemPrompt}\n\nBu fiş/faturayı analiz et.` 
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
        
        // Normalize amounts
        if (result.totalAmount && typeof result.totalAmount === 'string') {
          result.totalAmount = parseFloat(result.totalAmount.replace(/\./g, '').replace(',', '.'));
        }
        if (result.taxAmount && typeof result.taxAmount === 'string') {
          result.taxAmount = parseFloat(result.taxAmount.replace(/\./g, '').replace(',', '.'));
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
