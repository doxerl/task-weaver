import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEOUT_MS = 300000; // 5 dakika timeout

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileType, fileName, batchIndex, totalBatches } = await req.json();
    
    const isBatchMode = typeof batchIndex === 'number' && typeof totalBatches === 'number';
    console.log(`Step 1: Request received ${isBatchMode ? `(Batch ${batchIndex + 1}/${totalBatches})` : ''}`);
    console.log(`File: ${fileName}, Type: ${fileType}, Content length: ${fileContent?.length || 0}`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Sen bir Türk bankası hesap ekstresi analiz uzmanısın. Görevin verilen banka hesap hareketlerini analiz edip JSON formatında çıkarmak.

ÇIKTI FORMATI:
Her işlem için şu alanları çıkar:
- date: İşlem tarihi (DD.MM.YYYY formatında koru)
- description: İşlem açıklaması (tam metin, kısaltma yapma)
- amount: Tutar (sayı olarak, pozitif=gelir/alacak, negatif=gider/borç)
- balance: Bakiye (varsa, sayı olarak, yoksa null)
- reference: Referans/dekont numarası (varsa, yoksa null)
- counterparty: Karşı taraf ismi (EFT/Havale/FAST işlemlerinden çıkar, yoksa null)

TÜRK BANKASI FORMAT KURALLARI:
- Tarih formatları: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
- Binlik ayracı: nokta (.) → 1.234.567 = 1234567
- Ondalık ayracı: virgül (,) → 1.234,56 = 1234.56
- Negatif gösterimi: - işareti veya parantez ()
- "Borç" veya çıkış kolonundaki tutar → negatif
- "Alacak" veya giriş kolonundaki tutar → pozitif

ÖZEL İŞLEM TİPLERİ (açıklamadan tespit et):
- EFT/FAST/Havale işlemleri → Karşı taraf ismini counterparty alanına yaz
- Banka içi transferler → BANKA İÇİ olarak işaretle
- Kredi/Taksit → Açıklamadan al

ÖNEMLİ:
- Tüm işlemleri çıkar, hiçbirini atlama
- Tutarları sayı olarak döndür (string değil)
- Açıklamaları olduğu gibi koru, kısaltma yapma
- Emin olmadığın alanlar için null döndür

SADECE JSON ARRAY DÖNDÜR, başka açıklama ekleme.
[{"date":"15.03.2025","description":"AÇIKLAMA","amount":1234.56,"balance":5678.90,"reference":"123456","counterparty":"ŞIRKET ADI"}]`;

    console.log('Step 2: Calling Lovable AI Gateway (Gemini 2.5 Pro)...');

    // AbortController for timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Dosya tipi: ${fileType}\nDosya adı: ${fileName}\n\nİçerik:\n${fileContent}` }
        ],
        max_tokens: 100000, // Geniş output limiti
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit aşıldı, lütfen biraz bekleyin.',
          retryAfter: 60,
          transactions: []
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Kredi yetersiz, lütfen Lovable hesabınıza kredi ekleyin.',
          transactions: []
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Step 3: Lovable AI response received');
    
    // OpenAI uyumlu format: choices[0].message.content
    const fullText = data.choices?.[0]?.message?.content || '';
    
    console.log('Step 4: Full text length:', fullText.length);
    console.log('Step 4b: Text preview (first 500 chars):', fullText.substring(0, 500));
    console.log('Step 4c: Text preview (last 500 chars):', fullText.substring(Math.max(0, fullText.length - 500)));
    
    // Extract JSON array from response
    let transactions = [];
    
    // Clean up response text - daha agresif temizlik
    let cleanedText = fullText;
    
    // Remove markdown code blocks (multiple patterns)
    cleanedText = cleanedText.replace(/^```json\s*/gi, '');
    cleanedText = cleanedText.replace(/^```\s*/gm, '');
    cleanedText = cleanedText.replace(/```\s*$/gm, '');
    cleanedText = cleanedText.trim();
    
    // Find first [ and last ]
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      let jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
      console.log('Step 5a: Extracted JSON length:', jsonString.length);
      
      try {
        transactions = JSON.parse(jsonString);
        console.log('Step 5b: Parsed successfully:', transactions.length, 'transactions');
      } catch (e) {
        console.log('Step 5c: Initial parse failed, trying to fix truncated JSON');
        
        // Try to fix truncated JSON by finding last complete object
        // Look for the last valid },{  or }] pattern
        const lastCompletePattern = jsonString.lastIndexOf('},');
        const lastObjectEnd = jsonString.lastIndexOf('}]');
        
        if (lastCompletePattern > lastObjectEnd && lastCompletePattern > 0) {
          // JSON was truncated mid-object, cut at last complete object
          jsonString = jsonString.substring(0, lastCompletePattern + 1) + ']';
          console.log('Step 5d: Fixed truncated JSON, new length:', jsonString.length);
          try {
            transactions = JSON.parse(jsonString);
            console.log('Step 5e: Parsed fixed JSON:', transactions.length, 'transactions');
          } catch (e2) {
            console.error('Step 5f: Fixed JSON still failed:', e2);
          }
        } else if (lastObjectEnd === -1 && lastCompletePattern > 0) {
          // No proper ending found
          jsonString = jsonString.substring(0, lastCompletePattern + 1) + ']';
          try {
            transactions = JSON.parse(jsonString);
            console.log('Step 5g: Parsed with forced closure:', transactions.length, 'transactions');
          } catch (e3) {
            console.error('Step 5h: Forced closure failed:', e3);
          }
        }
        
        // If still no transactions, try more aggressive cleanup
        if (transactions.length === 0) {
          console.log('Step 6a: Trying aggressive cleanup');
          // Remove any trailing incomplete object
          const aggressiveClean = jsonString.replace(/,\s*\{[^}]*$/, ']');
          try {
            transactions = JSON.parse(aggressiveClean);
            console.log('Step 6b: Aggressive cleanup worked:', transactions.length, 'transactions');
          } catch (e4) {
            console.error('Step 6c: All parse attempts failed');
            console.error('First 500 chars:', jsonString.substring(0, 500));
            console.error('Last 500 chars:', jsonString.substring(Math.max(0, jsonString.length - 500)));
          }
        }
      }
    } else {
      console.error('Step 5x: No JSON array brackets found in response');
      console.error('Cleaned text preview:', cleanedText.substring(0, 1000));
    }
    
    console.log('Step 7: Total transactions found:', transactions.length);

    // Normalize amounts (handle Turkish number format)
    transactions = transactions.map((t: any, index: number) => ({
      index,
      date: t.date || null,
      description: t.description || '',
      amount: typeof t.amount === 'string' 
        ? parseFloat(t.amount.replace(/\./g, '').replace(',', '.'))
        : (typeof t.amount === 'number' ? t.amount : 0),
      balance: t.balance != null ? (typeof t.balance === 'string'
        ? parseFloat(t.balance.replace(/\./g, '').replace(',', '.'))
        : t.balance) : null,
      reference: t.reference || null,
      counterparty: t.counterparty || null
    }));

    console.log('Step 8: Returning', transactions.length, 'normalized transactions');

    return new Response(JSON.stringify({ 
      success: true,
      transactions, 
      count: transactions.length,
      batchIndex: isBatchMode ? batchIndex : undefined,
      metadata: {
        fileName: fileName || 'unknown',
        fileType: fileType || 'unknown',
        transactionCount: transactions.length,
        processedAt: new Date().toISOString(),
        model: 'google/gemini-2.5-pro'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Timeout hatasını özel olarak handle et
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('parse-bank-statement timeout after', TIMEOUT_MS, 'ms');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'İşlem zaman aşımına uğradı (5 dakika). Lütfen daha küçük bir dosya deneyin.',
        transactions: [] 
      }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.error('parse-bank-statement error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transactions: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
