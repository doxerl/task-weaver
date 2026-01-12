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
    const { fileContent, fileType } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const systemPrompt = `Sen Türk bankası hesap ekstresi analiz uzmanısın.

GÖREV: Verilen banka ekstresinden TÜM işlemleri çıkar.

FORMAT KURALLARI:
- Tarih: DD.MM.YYYY formatında
- Binlik ayracı: nokta (1.234.567)
- Ondalık ayracı: virgül (1.234,56)
- Pozitif tutar: gelir/yatırım (+)
- Negatif tutar: gider/çekim (-)

ÖNEMLİ:
- Her satırı ayrı bir işlem olarak değerlendir
- Açıklama kolonunu olduğu gibi al
- Tutar işaretini doğru belirle (alacak=pozitif, borç=negatif)
- Bakiye varsa ekle, yoksa null

ÇIKTI FORMAT:
Sadece JSON array döndür, başka metin yok.
[{"date":"15.03.2025","description":"AÇIKLAMA","amount":1234.56,"balance":5678.90}]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          { 
            role: 'user', 
            content: `${systemPrompt}\n\nDosya tipi: ${fileType}\n\nİçerik:\n${fileContent}` 
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
    const text = data.content?.[0]?.text || '';
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let transactions = [];
    
    if (jsonMatch) {
      try {
        transactions = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw text:', text);
      }
    }

    // Normalize amounts (handle Turkish number format)
    transactions = transactions.map((t: any) => ({
      ...t,
      amount: typeof t.amount === 'string' 
        ? parseFloat(t.amount.replace(/\./g, '').replace(',', '.'))
        : t.amount,
      balance: t.balance && typeof t.balance === 'string'
        ? parseFloat(t.balance.replace(/\./g, '').replace(',', '.'))
        : t.balance
    }));

    return new Response(JSON.stringify({ transactions, count: transactions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('parse-bank-statement error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
