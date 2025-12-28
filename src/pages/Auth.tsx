import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Calendar, Mic } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/today');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error('Email ve şifre gerekli');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Giriş başarısız';
      if (errorMessage.includes('Invalid login credentials')) {
        toast.error('Email veya şifre hatalı');
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error('Email adresinizi onaylayın');
      } else {
        toast.error(errorMessage);
      }
      return;
    }

    toast.success('Giriş başarılı!');
    navigate('/today');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail || !signupPassword || !signupFirstName || !signupLastName) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFirstName, signupLastName);
    setIsLoading(false);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kayıt başarısız';
      if (errorMessage.includes('already registered')) {
        toast.error('Bu email adresi zaten kayıtlı');
      } else {
        toast.error(errorMessage);
      }
      return;
    }

    toast.success('Kayıt başarılı! Giriş yapılıyor...');
    navigate('/today');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Calendar className="h-10 w-10 text-primary" />
          <Mic className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Sesli Planlama</h1>
        <p className="mt-2 text-muted-foreground">Sesli komutlarla gününüzü planlayın</p>
      </div>

      <Card className="w-full max-w-md">
        <Tabs defaultValue="login">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Giriş Yap</TabsTrigger>
              <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <CardDescription className="text-center">
                  Hesabınıza giriş yapın
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Şifre</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    'Giriş Yap'
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                <CardDescription className="text-center">
                  Yeni hesap oluşturun
                </CardDescription>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">Ad</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="Ahmet"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Soyad</Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Yılmaz"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Şifre</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="En az 6 karakter"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={6}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kayıt olunuyor...
                    </>
                  ) : (
                    'Kayıt Ol'
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
