import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEOUT_MS = 120000; // 2 dakika timeout (reduced for faster retry)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        console.warn(`Attempt ${attempt + 1} timed out after ${TIMEOUT_MS}ms`);
      } else {
        console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);
      }
      
      // If we have retries left, wait before retrying
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

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

    const systemPrompt = `Sen bir Türk bankası hesap ekstresi analiz uzmanısın. Excel dosyasından çıkarılan ham metin verisini analiz edip, TÜM işlem satırlarını JSON formatında döndüreceksin.

═══════════════════════════════════════════════════════════════════
⚠️ EN ÖNEMLİ KURAL - ASLA İHLAL ETME:
═══════════════════════════════════════════════════════════════════
1. HİÇBİR İŞLEM SATIRI ES GEÇİLMEYECEK
2. Para hareketi içeren HER SATIR çıktıda olmalı
3. Şüpheli satırları da dahil et, "needs_review": true işaretle
4. Toplam işlem sayısını doğrulama için raporla
5. [ROW X] formatındaki HER satırı işle - hiçbirini atlama
═══════════════════════════════════════════════════════════════════

ÇİFT SATIRLI İŞLEMLER - KRİTİK:
- Bazı işlemler 2 satıra yayılmış olabilir (ana satır + açıklama devamı)
- İlk satır genellikle tarih ve tutar içerir
- İkinci satır açıklama devamı veya referans numarası içerir
- Her iki satırı da BİRLEŞTİRİP tek işlem olarak kaydet
- row_number olarak ANA satırın (para hareketi olan) numarasını kullan
- İkinci satırdaki bilgiyi description alanına ekle

ÇIKTI FORMATI:
{
  "transactions": [
    {
      "row_number": number,
      "date": "YYYY-MM-DD",
      "original_date": "string",
      "description": "string",
      "amount": number,
      "original_amount": "string",
      "balance": number | null,
      "reference": "string | null",
      "counterparty": "string | null",
      "transaction_type": "string",
      "channel": "string | null",
      "needs_review": boolean,
      "confidence": number
    }
  ],
  "summary": {
    "total_rows_in_file": number,
    "header_rows_skipped": number,
    "footer_rows_skipped": number,
    "empty_rows_skipped": number,
    "transaction_count": number,
    "needs_review_count": number,
    "total_income": number,
    "total_expense": number,
    "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "skipped_rows": [{ "row_number": number, "reason": "string" }]
  },
  "bank_info": {
    "detected_bank": "string | null",
    "account_number": "string | null",
    "iban": "string | null",
    "currency": "TRY"
  }
}

TÜRK BANKASI FORMAT KURALLARI:
- Binlik ayracı: nokta (.) → 1.234.567 = 1234567
- Ondalık ayracı: virgül (,) → 1.234,56 = 1234.56

⚠️ KRİTİK TUTAR KORUMA KURALI:
- Excel'deki sayısal değerin İŞARETİNİ %100 KORU
- Eğer Excel'de tutar POZİTİF yazılmışsa → amount POZİTİF kalmalı
- Eğer Excel'de tutar NEGATİF yazılmışsa → amount NEGATİF kalmalı
- ASLA açıklamadaki "GİDEN", "GELEN", "EFT", "HAVALE" gibi kelimelere göre işaret DEĞİŞTİRME
- Sayının işaretini YALNIZCA Excel'deki sayısal değerden al

SÜTUN YAPISI ANALİZİ (SADECE AYRI SÜTUNLAR İÇİN):
- Bazı bankalar (İş Bankası, Akbank, Ziraat) Borç ve Alacak sütunlarını AYRI tutar
- Bu durumda sayılar her zaman pozitif yazılır
- Borç/Çıkış/Çekilen sütunundaki değer → NEGATİF yapılmalı
- Alacak/Giriş/Yatırılan sütunundaki değer → POZİTİF kalmalı
- TEK SÜTUN VARSA (Garanti gibi): Sayının işaretine dokunma!

İŞLEM TÜRLERİ: EFT, HAVALE, FAST, POS, ATM, VIRMAN, FAIZ, KOMISYON, MAAS, KIRA, FATURA, VERGI, KREDI, OTHER

KARŞI TARAF ÇIKARIMI:
- "EFT GÖNDERİM-AHMET YILMAZ" → counterparty: "AHMET YILMAZ"
- "GELEN EFT-ABC LTD.ŞTİ." → counterparty: "ABC LTD.ŞTİ."
- IBAN'dan sonra gelen isim

BANKA TESPİTİ (Sütun yapısından):
- GARANTİ: Tarih | Açıklama | Tutar | Bakiye
- İŞ BANKASI: Tarih | Valör | Açıklama | Borç | Alacak | Bakiye
- ZİRAAT: Tarih | Açıklama | Çekilen | Yatırılan | Bakiye
- AKBANK: Tarih | Valör | Açıklama | Borç | Alacak | Bakiye

ATLAMA KURALLARI:
- ATLA: Başlıklar, sütun isimleri, toplam satırları, boş satırlar
- ATLAMA: Para hareketi içeren HER satır dahil edilmeli
- Atlanan satırları "skipped_rows" arrayinde listele

[ROW X] formatındaki satırları dikkate al. row_number alanına X değerini yaz.

SATIR SAYISI DOĞRULAMA - KRİTİK:
- Input'ta kaç adet [ROW X] satırı varsa say
- Output'taki transaction sayısı + skipped_rows sayısı = toplam [ROW X] sayısına EŞİT OLMALI
- Eksik satır olmamalı!

ŞÜPHE DURUMUNDA:
- needs_review: true işaretle
- confidence: 0.0-1.0 (1.0=kesin, 0.2=çok belirsiz)

DOĞRULAMA:
- total_income = tüm pozitif tutarların toplamı
- total_expense = tüm negatif tutarların mutlak değer toplamı

SADECE JSON döndür, markdown code block kullanma, Türkçe karakterleri koru.`;

    console.log('Step 2: Calling Lovable AI Gateway (Gemini 2.5 Pro) with retry...');

    const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
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
        max_tokens: 100000,
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit aşıldı, lütfen biraz bekleyin.',
          retryAfter: 60,
          transactions: [],
          summary: null,
          bank_info: null
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Kredi yetersiz, lütfen Lovable hesabınıza kredi ekleyin.',
          transactions: [],
          summary: null,
          bank_info: null
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
    
    const fullText = data.choices?.[0]?.message?.content || '';
    
    console.log('Step 4: Full text length:', fullText.length);
    console.log('Step 4b: Text preview (first 500 chars):', fullText.substring(0, 500));
    
    // Parse the JSON response
    let result = {
      transactions: [] as any[],
      summary: null as any,
      bank_info: null as any
    };
    
    // Clean up response text
    let cleanedText = fullText;
    cleanedText = cleanedText.replace(/^```json\s*/gi, '');
    cleanedText = cleanedText.replace(/^```\s*/gm, '');
    cleanedText = cleanedText.replace(/```\s*$/gm, '');
    cleanedText = cleanedText.trim();
    
    // Find the JSON object
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let jsonString = cleanedText.substring(firstBrace, lastBrace + 1);
      console.log('Step 5a: Extracted JSON length:', jsonString.length);
      
      try {
        const parsed = JSON.parse(jsonString);
        result.transactions = parsed.transactions || [];
        result.summary = parsed.summary || null;
        result.bank_info = parsed.bank_info || null;
        console.log('Step 5b: Parsed successfully:', result.transactions.length, 'transactions');
      } catch (e) {
        console.log('Step 5c: JSON parse failed, trying array extraction');
        
        // Fallback: Try to extract just the transactions array
        const firstBracket = cleanedText.indexOf('[');
        const lastBracket = cleanedText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          let arrayString = cleanedText.substring(firstBracket, lastBracket + 1);
          try {
            result.transactions = JSON.parse(arrayString);
            console.log('Step 5d: Parsed array:', result.transactions.length, 'transactions');
          } catch (e2) {
            // Try to fix truncated JSON
            const lastCompletePattern = arrayString.lastIndexOf('},');
            if (lastCompletePattern > 0) {
              arrayString = arrayString.substring(0, lastCompletePattern + 1) + ']';
              try {
                result.transactions = JSON.parse(arrayString);
                console.log('Step 5e: Parsed fixed array:', result.transactions.length, 'transactions');
              } catch (e3) {
                console.error('Step 5f: All parse attempts failed');
              }
            }
          }
        }
      }
    }
    
    console.log('Step 6: Total transactions found:', result.transactions.length);

    // Normalize transactions
    const normalizedTransactions = result.transactions.map((t: any, index: number) => {
      // Parse original_amount first (this is the raw value from Excel)
      let originalAmountRaw = t.original_amount || String(t.amount) || '';
      let originalAmountParsed: number | null = null;
      if (typeof originalAmountRaw === 'string' && originalAmountRaw.trim()) {
        originalAmountParsed = parseFloat(originalAmountRaw.replace(/\./g, '').replace(',', '.'));
      } else if (typeof originalAmountRaw === 'number') {
        originalAmountParsed = originalAmountRaw;
      }
      
      // Parse amount from AI response
      let amount = t.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
      }
      
      // ⚠️ KRİTİK: Excel'deki işareti koru!
      // Eğer original_amount pozitif ama AI amount'u negatif yaptıysa (veya tersi),
      // bu muhtemelen AI'ın hatalı yorumudur. Original değeri koru!
      if (originalAmountParsed !== null && typeof amount === 'number' && !isNaN(originalAmountParsed)) {
        const originalIsPositive = originalAmountParsed > 0;
        const amountIsPositive = amount > 0;
        
        if (originalIsPositive !== amountIsPositive && originalAmountParsed !== 0 && amount !== 0) {
          console.warn(`⚠️ İşaret uyumsuzluğu tespit edildi - Satır ${t.row_number || index + 1}: original=${originalAmountParsed}, AI_amount=${amount}, korunan=${originalAmountParsed}`);
          amount = originalAmountParsed; // Orijinal Excel değerini koru
        }
      }
      
      // Parse balance
      let balance = t.balance;
      if (typeof balance === 'string') {
        balance = parseFloat(balance.replace(/\./g, '').replace(',', '.'));
      }
      
      return {
        index,
        row_number: t.row_number || index + 1,
        date: t.date || null,
        original_date: t.original_date || t.date || '',
        description: t.description || '',
        amount: typeof amount === 'number' && !isNaN(amount) ? amount : 0,
        original_amount: originalAmountRaw,
        balance: typeof balance === 'number' ? balance : null,
        reference: t.reference || null,
        counterparty: t.counterparty || null,
        transaction_type: t.transaction_type || 'OTHER',
        channel: t.channel || null,
        needs_review: t.needs_review || false,
        confidence: t.confidence || 0.8
      };
    });

    // Calculate summary if not provided
    const summary = result.summary || {
      total_rows_in_file: normalizedTransactions.length,
      header_rows_skipped: 0,
      footer_rows_skipped: 0,
      empty_rows_skipped: 0,
      transaction_count: normalizedTransactions.length,
      needs_review_count: normalizedTransactions.filter((t: any) => t.needs_review).length,
      total_income: normalizedTransactions.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0),
      total_expense: normalizedTransactions.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0),
      date_range: {
        start: normalizedTransactions.length > 0 ? normalizedTransactions[0].date : null,
        end: normalizedTransactions.length > 0 ? normalizedTransactions[normalizedTransactions.length - 1].date : null
      }
    };

    const bank_info = result.bank_info || {
      detected_bank: null,
      account_number: null,
      iban: null,
      currency: 'TRY'
    };

    console.log('Step 7: Returning', normalizedTransactions.length, 'normalized transactions');

    return new Response(JSON.stringify({ 
      success: true,
      transactions: normalizedTransactions,
      summary,
      bank_info,
      count: normalizedTransactions.length,
      batchIndex: isBatchMode ? batchIndex : undefined,
      metadata: {
        fileName: fileName || 'unknown',
        fileType: fileType || 'unknown',
        transactionCount: normalizedTransactions.length,
        processedAt: new Date().toISOString(),
        model: 'google/gemini-2.5-pro'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('parse-bank-statement timeout after', TIMEOUT_MS, 'ms');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'İşlem zaman aşımına uğradı (5 dakika). Lütfen daha küçük bir dosya deneyin.',
        transactions: [],
        summary: null,
        bank_info: null
      }), {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.error('parse-bank-statement error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transactions: [],
      summary: null,
      bank_info: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
