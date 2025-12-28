import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt token
function decryptToken(encrypted: string): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!!';
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
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

    console.log('Syncing GitHub for user:', user.id);

    // Get the stored GitHub connection
    const { data: connection, error: connError } = await supabase
      .from('integrations_github')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'GitHub bağlantısı bulunamadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt the token
    const githubToken = decryptToken(connection.token_encrypted);

    // Fetch assigned issues
    const issuesResponse = await fetch('https://api.github.com/issues?filter=assigned&state=open&per_page=50', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lovable-App'
      }
    });

    if (!issuesResponse.ok) {
      const errorText = await issuesResponse.text();
      console.error('GitHub issues error:', issuesResponse.status, errorText);
      
      if (issuesResponse.status === 401) {
        return new Response(JSON.stringify({ error: 'GitHub token geçersiz. Lütfen yeniden bağlanın.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'GitHub API hatası' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const issues = await issuesResponse.json();
    console.log(`Fetched ${issues.length} issues`);

    // Clear old cache for this user
    await supabase
      .from('github_work_items_cache')
      .delete()
      .eq('user_id', user.id);

    // Insert new items
    const workItems = issues.map((issue: any) => {
      const urlParts = issue.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      
      return {
        user_id: user.id,
        type: issue.pull_request ? 'pr' : 'issue',
        owner,
        repo,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        assignees: issue.assignees?.map((a: any) => a.login) || [],
        labels: issue.labels?.map((l: any) => l.name) || [],
        raw: issue,
      };
    });

    if (workItems.length > 0) {
      const { error: insertError } = await supabase
        .from('github_work_items_cache')
        .insert(workItems);

      if (insertError) {
        console.error('Insert error:', insertError);
      }
    }

    // Log command event
    await supabase.from('command_events').insert({
      user_id: user.id,
      source: 'system',
      task: 'githubSync',
      ai_parse_ok: true,
      apply_status: 'applied',
      diff_summary: { synced: workItems.length },
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${workItems.length} öğe senkronize edildi`,
      itemCount: workItems.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('GitHub sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
