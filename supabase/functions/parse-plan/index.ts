import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sen bir Türkçe planlama asistanısın. Kullanıcının sesli veya yazılı komutlarını JSON formatında plan öğelerine dönüştürüyorsun.

GÖREV: Kullanıcının komutunu analiz et ve aşağıdaki JSON formatında yanıt ver. Sadece JSON döndür, başka hiçbir şey yazma.

SAAT YORUMLAMA KURALLARI (ÇOK ÖNEMLİ):
- Türkçe'de günlük konuşmada "saat 1, 2, 3, 4, 5" ifadeleri genellikle ÖĞLEDEN SONRA saatlerini ifade eder (13:00, 14:00, 15:00, 16:00, 17:00)
- "öğlen", "öğleden sonra", "akşam" gibi kelimeler geçiyorsa saatler KESİNLİKLE 12:00 ve üzeri olmalı
- "saat 1 ile 3 arası" = 13:00-15:00 (öğleden sonra varsayılır)
- "saat 1 ile 3 arası öğlen" = 13:00-15:00
- "sabah 9" = 09:00
- "akşam 7" = 19:00
- "gece 1" veya "gece saat 1" = 01:00 (sadece "gece" açıkça söylenirse)
- Kullanıcı açıkça "sabah" veya "gece" demediği sürece, 1-5 arası saatleri 13:00-17:00 olarak yorumla
- 6-11 arası saatler: bağlama bak, "sabah" yoksa öğleden sonra olabilir (18:00-23:00)

TIMEZONE KURALI:
- Kullanıcı kendi yerel saatini söylüyor
- startAt ve endAt değerlerini kullanıcının timezone'unda döndür
- UTC'ye çevirme YAPMA, timezone offset'ini kullan

GENEL KURALLAR:
- Tarih belirtilmemişse hedef tarihi kullan
- Süre belirtilmemişse varsayılan 60 dakika kullan
- Türkçe komutları anla: "yarın", "bugün", "pazartesi", "saat 10'da", "öğleden sonra" vb.
- "Az önce", "şu an" gibi ifadeler bu fonksiyon için geçerli DEĞİL - bunlar actual için

GEÇMİŞ TARİH İÇİN EK KURALLAR:
- Eğer hedef tarih bugünden farklıysa, kullanıcı geçmiş bir gün için plan ekliyor demektir (retrospektif planlama)
- "yarın", "bugün" gibi göreli ifadeleri hedef tarihe göre yorumla
- TÜM ZAMANLARI HEDEF TARİH İÇİN OLUŞTUR

JSON FORMATI:
{
  "operations": [
    {
      "op": "add",
      "title": "string",
      "startAt": "ISO8601 datetime with timezone offset",
      "endAt": "ISO8601 datetime with timezone offset", 
      "type": "task|event|habit",
      "priority": "low|med|high",
      "tags": ["string"],
      "notes": "string veya null"
    }
  ],
  "warnings": ["uyarı mesajları"],
  "clarifyingQuestions": ["netleştirme soruları"]
}

ÖNEMLİ: Yalnızca geçerli JSON döndür. Açıklama, markdown veya başka metin ekleme.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth header kontrolü
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase client'ları oluştur
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // User client - auth header ile
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client - DB işlemleri için
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Kullanıcıyı doğrula
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(JSON.stringify({ error: 'Authentication failed', details: authError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('No user found in token');
      return new Response(JSON.stringify({ error: 'Invalid token - no user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const { text, date, timezone, now, timezoneOffset, localTime } = await req.json();
    console.log('Parse plan request:', { text, date, timezone, now, timezoneOffset, localTime, userId: user.id });

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate user's local "today" based on their timezone offset
    // timezoneOffset is in minutes (e.g., -180 for UTC+3)
    const offsetHours = -(timezoneOffset || 0) / 60; // Convert to positive hours for UTC+X
    const offsetSign = offsetHours >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(Math.abs(Math.floor(offsetHours))).padStart(2, '0')}:00`;
    
    // Use client's local time to determine "today"
    const userLocalNow = localTime ? new Date(localTime) : new Date(new Date(now).getTime() - ((timezoneOffset || 0) * 60000));
    const userToday = localTime ? localTime.split('T')[0] : userLocalNow.toISOString().split('T')[0];
    const userLocalTimeString = localTime || userLocalNow.toISOString();
    
    const isToday = date === userToday;

    const userPrompt = isToday 
      ? `Bugünün tarihi (kullanıcının yerel saatine göre): ${date}
Kullanıcının şu anki yerel saati: ${userLocalTimeString}
Timezone: ${timezone} (UTC${offsetString})

ÖNEMLİ: 
- Kullanıcı yerel saat söylüyor (${timezone}). 
- TÜM SAATLERİ ${timezone} timezone'unda döndür!
- Format: ${date}T14:00:00${offsetString}
- Örnek: Kullanıcı "saat 1" diyorsa → ${date}T13:00:00${offsetString}

Kullanıcı komutu: "${text}"

Bu komutu analiz et ve plan öğesi olarak JSON formatında döndür.`
      : `Hedef tarih: ${date} (GEÇMİŞ BİR GÜN - Kullanıcının bugünü: ${userToday})
Kullanıcının timezone'u: ${timezone} (UTC${offsetString})

Bu GEÇMİŞ GÜN için plan ekleme (retrospektif planlama).
- "yarın" = ${date} tarihinin ertesi günü
- "bugün" = ${date} tarihi
- TÜM ZAMANLARI ${date} TARİHİ İÇİN OLUŞTUR!
- TÜM SAATLERİ ${timezone} timezone'unda döndür!
- Format: ${date}T14:00:00${offsetString}

Kullanıcı komutu: "${text}"

Bu komutu analiz et ve ${date} tarihi için plan öğesi olarak JSON formatında döndür.`;

    console.log('Calling AI gateway...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        console.error('AI credits exhausted');
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    console.log('AI response received:', content?.substring(0, 200));

    if (!content) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({ error: 'No AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response - extract JSON from possible markdown
    let parsedPatch;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedPatch = JSON.parse(jsonMatch[0]);
      console.log('Parsed operations:', parsedPatch.operations?.length || 0);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, content);
      
      // Log the command event with error
      await supabaseAdmin.from('command_events').insert({
        user_id: user.id,
        source: 'text',
        raw_transcript: text,
        task: 'parsePlan',
        ai_json_output: { raw: content },
        ai_parse_ok: false,
        error: 'JSON parse failed',
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Komut anlaşılamadı. Lütfen daha net ifade edin.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply operations to database
    const results = [];
    for (const op of parsedPatch.operations || []) {
      if (op.op === 'add') {
        const { data, error } = await supabaseAdmin.from('plan_items').insert({
          user_id: user.id,
          title: op.title,
          start_at: op.startAt,
          end_at: op.endAt,
          type: op.type || 'task',
          priority: op.priority || 'med',
          tags: op.tags || [],
          notes: op.notes || null,
          source: 'voice',
        }).select().single();

        if (error) {
          console.error('Insert error:', error);
        } else {
          results.push(data);
          console.log('Inserted plan item:', data.id);
        }
      }
    }

    // Log command event
    await supabaseAdmin.from('command_events').insert({
      user_id: user.id,
      source: 'text',
      raw_transcript: text,
      normalized_text: text,
      task: 'parsePlan',
      ai_json_output: parsedPatch,
      ai_parse_ok: true,
      apply_status: 'applied',
      diff_summary: { added: results.length },
    });

    console.log('Successfully added', results.length, 'items');

    return new Response(JSON.stringify({
      success: true,
      message: `${results.length} plan öğesi eklendi`,
      items: results,
      warnings: parsedPatch.warnings || [],
      clarifyingQuestions: parsedPatch.clarifyingQuestions || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse plan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
