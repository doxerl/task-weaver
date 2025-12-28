import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple XOR encryption for token storage (in production, use proper encryption)
function encryptToken(token: string): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!!';
  let result = '';
  for (let i = 0; i < token.length; i++) {
    result += String.fromCharCode(token.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token: patToken } = await req.json();

    if (!patToken) {
      return new Response(JSON.stringify({ error: 'GitHub token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Validating GitHub token for user:', user.id);

    // Verify token with GitHub API
    const githubResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${patToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lovable-App'
      }
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API error:', githubResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'GitHub token doğrulanamadı. Token geçersiz veya süresi dolmuş olabilir.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const githubUser = await githubResponse.json();
    console.log('GitHub user verified:', githubUser.login);

    // Encrypt and store the token
    const encryptedToken = encryptToken(patToken);
    const tokenLast4 = patToken.slice(-4);

    // Upsert the connection
    const { error: upsertError } = await supabase
      .from('integrations_github')
      .upsert({
        user_id: user.id,
        mode: 'pat',
        token_encrypted: encryptedToken,
        token_last4: tokenLast4,
        scopes: ['repo', 'read:user'],
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return new Response(JSON.stringify({ error: 'Bağlantı kaydedilemedi' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'GitHub bağlantısı kuruldu',
      githubUser: githubUser.login
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('GitHub connect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
