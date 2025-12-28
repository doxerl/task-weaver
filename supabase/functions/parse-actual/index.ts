import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sen bir Türkçe zaman takip asistanısın. Kullanıcının "şu an yaptığım" veya "az önce yaptığım" aktivitelerini JSON formatına dönüştürüyorsun.

GÖREV: Kullanıcının komutunu analiz et ve aşağıdaki JSON formatında yanıt ver. Sadece JSON döndür, başka hiçbir şey yazma.

ZAMAN TAHMİN KURALLARI:
- "şu an" / "şimdi" → şu anki saat başlangıç, varsayılan 30 dk süre
- "az önce" → şu an - 15 dakika başlangıç
- "biraz önce" → şu an - 10 dakika başlangıç  
- "1 saat önce" → şu an - 60 dakika başlangıç
- "X dakika önce" → şu an - X dakika başlangıç
- "X saat sürdü" / "X dakika sürdü" → süreyi buna göre ayarla
- Net saat verilirse (örn: "12:10-12:45") onu kullan

JSON FORMATI:
{
  "operations": [
    {
      "op": "addActual",
      "title": "string",
      "startAt": "ISO8601 datetime",
      "endAt": "ISO8601 datetime",
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

    const { text, date, timezone, now } = await req.json();
    console.log('Parse actual request:', { text, date, timezone, now, userId: user.id });

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

    const userPrompt = `Bugünün tarihi: ${date}
Şu anki zaman: ${now}
Timezone: ${timezone}

Kullanıcı komutu: "${text}"

Bu komutu analiz et ve gerçekleşen aktivite olarak JSON formatında döndür. Zamanları şu ana göre hesapla.`;

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

    // Parse AI response
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
      
      await supabaseAdmin.from('command_events').insert({
        user_id: user.id,
        source: 'text',
        raw_transcript: text,
        task: 'parseActual',
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
      if (op.op === 'addActual') {
        const { data, error } = await supabaseAdmin.from('actual_entries').insert({
          user_id: user.id,
          title: op.title,
          start_at: op.startAt,
          end_at: op.endAt,
          tags: op.tags || [],
          notes: op.notes || null,
          source: 'voice',
        }).select().single();

        if (error) {
          console.error('Insert error:', error);
        } else {
          results.push(data);
          console.log('Inserted actual entry:', data.id);
        }
      }
    }

    // Log command event
    await supabaseAdmin.from('command_events').insert({
      user_id: user.id,
      source: 'text',
      raw_transcript: text,
      normalized_text: text,
      task: 'parseActual',
      ai_json_output: parsedPatch,
      ai_parse_ok: true,
      apply_status: 'applied',
      diff_summary: { added: results.length },
    });

    console.log('Successfully added', results.length, 'entries');

    return new Response(JSON.stringify({
      success: true,
      message: `${results.length} aktivite kaydedildi`,
      items: results,
      warnings: parsedPatch.warnings || [],
      clarifyingQuestions: parsedPatch.clarifyingQuestions || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse actual error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
