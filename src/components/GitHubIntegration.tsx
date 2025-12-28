import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Link2, Unlink, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GitHubConnection {
  id: string;
  mode: string;
  token_last4: string | null;
  scopes: string[];
  connected_at: string;
}

interface GitHubWorkItem {
  id: string;
  type: 'issue' | 'pr';
  owner: string;
  repo: string;
  number: number;
  title: string;
  state: string;
  url: string;
}

export function GitHubIntegration() {
  const { user } = useAuthContext();
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [workItems, setWorkItems] = useState<GitHubWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [patToken, setPatToken] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConnection();
    }
  }, [user]);

  const fetchConnection = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('integrations_github')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching GitHub connection:', error);
    } else if (data) {
      setConnection(data as unknown as GitHubConnection);
      fetchWorkItems();
    }
    
    setLoading(false);
  };

  const fetchWorkItems = async () => {
    const { data, error } = await supabase
      .from('github_work_items_cache')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching work items:', error);
    } else {
      setWorkItems((data || []) as unknown as GitHubWorkItem[]);
    }
  };

  const handleConnect = async () => {
    if (!patToken.trim()) {
      toast.error('GitHub Personal Access Token gerekli');
      return;
    }

    if (!patToken.startsWith('ghp_') && !patToken.startsWith('github_pat_')) {
      toast.error('Geçersiz token formatı. Token "ghp_" veya "github_pat_" ile başlamalı');
      return;
    }

    setConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-connect', {
        body: { token: patToken }
      });

      if (error) {
        toast.error('Bağlantı başarısız: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success('GitHub bağlantısı kuruldu!');
        setPatToken('');
        setShowPatInput(false);
        fetchConnection();
      } else {
        toast.error(data?.error || 'Bağlantı başarısız');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    const { error } = await supabase
      .from('integrations_github')
      .delete()
      .eq('id', connection.id);

    if (error) {
      toast.error('Bağlantı kaldırılamadı');
      return;
    }

    // Also clear cached items
    await supabase
      .from('github_work_items_cache')
      .delete()
      .eq('user_id', user?.id);

    setConnection(null);
    setWorkItems([]);
    toast.success('GitHub bağlantısı kaldırıldı');
  };

  const handleSync = async () => {
    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-sync', {});

      if (error) {
        toast.error('Senkronizasyon başarısız: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success(`${data.itemCount || 0} öğe senkronize edildi`);
        fetchWorkItems();
      } else {
        toast.error(data?.error || 'Senkronizasyon başarısız');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Senkronizasyon hatası');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Entegrasyonu
        </CardTitle>
        <CardDescription>
          GitHub issue ve PR'larınızı planlarınıza bağlayın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <>
            {/* Connected State */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Bağlı</p>
                  <p className="text-sm text-muted-foreground">
                    Token: ****{connection.token_last4}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Work Items */}
            {workItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Atanan Öğeler</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {workItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-secondary/50 rounded hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">
                          {item.type === 'issue' ? 'Issue' : 'PR'}
                        </Badge>
                        <span className="text-sm truncate">{item.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {item.owner}/{item.repo}#{item.number}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {workItems.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Henüz senkronize edilmiş öğe yok</p>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  Şimdi senkronize et
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                GitHub hesabınız bağlı değil
              </p>
            </div>

            {showPatInput ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pat">Personal Access Token</Label>
                  <Input
                    id="pat"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gerekli izinler: <code>repo</code>, <code>read:user</code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleConnect}
                    disabled={connecting || !patToken.trim()}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bağlanıyor...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Bağlan
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowPatInput(false);
                      setPatToken('');
                    }}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPatInput(true)}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub ile Bağlan
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
