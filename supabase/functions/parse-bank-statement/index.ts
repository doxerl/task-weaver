import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileType, fileName } = await req.json();
    
    console.log('Step 1: Request received');
    console.log(`File: ${fileName}, Type: ${fileType}, Content length: ${fileContent?.length || 0}`);
    
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
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

    console.log('Step 2: Calling Claude API (standard mode for speed)...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [
          { 
            role: 'user', 
            content: `Dosya tipi: ${fileType}\n\nİçerik:\n${fileContent}` 
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
      if (response.status === 400) {
        const errorData = await response.json();
        console.error('Anthropic API error:', errorData);
        throw new Error(errorData.error?.message || 'Anthropic API error');
      }
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      throw new Error('Anthropic API error');
    }

    const data = await response.json();
    console.log('Step 3: Claude API response received');
    
    // Extended Thinking: thinking bloklarını atla, sadece text content'i al
    console.log('Step 4: Content blocks count:', data.content?.length || 0);
    
    // Tüm text bloklarını birleştir (bazen birden fazla olabilir)
    let fullText = '';
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        console.log('Block type:', block.type);
        if (block.type === 'text') {
          fullText += block.text;
        }
      }
    }
    
    console.log('Step 5: Full text length:', fullText.length);
    console.log('Step 5b: Text preview (first 500 chars):', fullText.substring(0, 500));
    console.log('Step 5c: Text preview (last 500 chars):', fullText.substring(Math.max(0, fullText.length - 500)));
    
    // Extract JSON array from response
    let transactions = [];
    
    // Clean up response text
    let cleanedText = fullText;
    
    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/gm, '');
    cleanedText = cleanedText.replace(/```\s*$/gm, '');
    cleanedText = cleanedText.trim();
    
    // Find first [ and last ]
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      let jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
      console.log('Step 6a: Extracted JSON length:', jsonString.length);
      
      try {
        transactions = JSON.parse(jsonString);
        console.log('Step 6b: Parsed successfully:', transactions.length, 'transactions');
      } catch (e) {
        console.log('Step 6c: Initial parse failed, trying to fix truncated JSON');
        
        // Try to fix truncated JSON by finding last complete object
        // Look for the last valid },{  or }] pattern
        const lastCompletePattern = jsonString.lastIndexOf('},');
        const lastObjectEnd = jsonString.lastIndexOf('}]');
        
        if (lastCompletePattern > lastObjectEnd && lastCompletePattern > 0) {
          // JSON was truncated mid-object, cut at last complete object
          jsonString = jsonString.substring(0, lastCompletePattern + 1) + ']';
          console.log('Step 6d: Fixed truncated JSON, new length:', jsonString.length);
          try {
            transactions = JSON.parse(jsonString);
            console.log('Step 6e: Parsed fixed JSON:', transactions.length, 'transactions');
          } catch (e2) {
            console.error('Step 6f: Fixed JSON still failed:', e2);
          }
        } else if (lastObjectEnd === -1 && lastCompletePattern > 0) {
          // No proper ending found
          jsonString = jsonString.substring(0, lastCompletePattern + 1) + ']';
          try {
            transactions = JSON.parse(jsonString);
            console.log('Step 6g: Parsed with forced closure:', transactions.length, 'transactions');
          } catch (e3) {
            console.error('Step 6h: Forced closure failed:', e3);
          }
        }
        
        // If still no transactions, try more aggressive cleanup
        if (transactions.length === 0) {
          console.log('Step 7a: Trying aggressive cleanup');
          // Remove any trailing incomplete object
          const aggressiveClean = jsonString.replace(/,\s*\{[^}]*$/, ']');
          try {
            transactions = JSON.parse(aggressiveClean);
            console.log('Step 7b: Aggressive cleanup worked:', transactions.length, 'transactions');
          } catch (e4) {
            console.error('Step 7c: All parse attempts failed');
            console.error('First 500 chars:', jsonString.substring(0, 500));
            console.error('Last 500 chars:', jsonString.substring(Math.max(0, jsonString.length - 500)));
          }
        }
      }
    } else {
      console.error('Step 6x: No JSON array brackets found in response');
    }
    
    console.log('Step 9: Total transactions found:', transactions.length);

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

    console.log('Step 6: Returning', transactions.length, 'normalized transactions');

    return new Response(JSON.stringify({ 
      success: true,
      transactions, 
      count: transactions.length,
      metadata: {
        fileName: fileName || 'unknown',
        fileType: fileType || 'unknown',
        transactionCount: transactions.length,
        processedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
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
