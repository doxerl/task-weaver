import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { GitHubIntegration } from '@/components/GitHubIntegration';
import { ArrowLeft, Loader2, Save, User, Globe, Clock, Wallet, CreditCard, Plus, DollarSign, Building2 } from 'lucide-react';
import { ExchangeRateEditor } from '@/components/finance/ExchangeRateEditor';
import { toast } from 'sonner';
import { useFixedExpenses, FixedExpenseDefinition } from '@/hooks/finance/useFixedExpenses';
import { useFinancialSettings } from '@/hooks/finance/useFinancialSettings';
import { useCategories } from '@/hooks/finance/useCategories';
import { FixedExpenseForm } from '@/components/finance/FixedExpenseForm';
import { FixedExpenseCard } from '@/components/finance/FixedExpenseCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'İstanbul (UTC+3)' },
  { value: 'Europe/London', label: 'Londra (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
];

const WORKING_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00'
];

export default function Settings() {
  const navigate = useNavigate();
  const { profile, updateProfile, signOut } = useAuthContext();
  
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Europe/Istanbul');
  const [workingStart, setWorkingStart] = useState(profile?.working_hours_start || '08:00');
  const [workingEnd, setWorkingEnd] = useState(profile?.working_hours_end || '22:00');
  const [isSaving, setIsSaving] = useState(false);
  
  // Fixed expense management
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpenseDefinition | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  
  const { definitions, summary, createDefinition, updateDefinition, deleteDefinition } = useFixedExpenses();
  const { categories } = useCategories();
  const { settings: financialSettings, upsertSettings: upsertFinancialSettings } = useFinancialSettings();
  
  // Balance sheet settings state
  const [balanceSettings, setBalanceSettings] = useState({
    opening_bank_balance: 0,
    opening_cash_on_hand: 0,
    vehicles_purchase_date: '',
    fixtures_purchase_date: '',
  });
  const [isBalanceSettingsLoaded, setIsBalanceSettingsLoaded] = useState(false);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Ad ve soyad zorunlu');
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      timezone,
      working_hours_start: workingStart,
      working_hours_end: workingEnd,
    });
    setIsSaving(false);

    if (error) {
      toast.error('Profil güncellenemedi');
      return;
    }

    toast.success('Profil güncellendi');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSaveExpense = async (data: Partial<FixedExpenseDefinition>) => {
    if (data.id) {
      await updateDefinition.mutateAsync(data as FixedExpenseDefinition);
    } else {
      await createDefinition.mutateAsync(data);
    }
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async () => {
    if (deletingExpenseId) {
      await deleteDefinition.mutateAsync(deletingExpenseId);
      setDeletingExpenseId(null);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // Load balance settings when financial settings are ready
  if (!isBalanceSettingsLoaded && financialSettings.id) {
    setBalanceSettings({
      opening_bank_balance: financialSettings.opening_bank_balance || 0,
      opening_cash_on_hand: (financialSettings as any).opening_cash_on_hand || 0,
      vehicles_purchase_date: financialSettings.vehicles_purchase_date || '',
      fixtures_purchase_date: financialSettings.fixtures_purchase_date || '',
    });
    setIsBalanceSettingsLoaded(true);
  }

  const handleSaveBalanceSettings = () => {
    upsertFinancialSettings.mutate({
      opening_bank_balance: balanceSettings.opening_bank_balance,
      opening_cash_on_hand: balanceSettings.opening_cash_on_hand,
      vehicles_purchase_date: balanceSettings.vehicles_purchase_date || null,
      fixtures_purchase_date: balanceSettings.fixtures_purchase_date || null,
    } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/today')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Ayarlar</h1>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil Bilgileri
            </CardTitle>
            <CardDescription>
              Kişisel bilgilerinizi düzenleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Adınız"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Soyadınız"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email değiştirilemez</p>
            </div>
          </CardContent>
        </Card>

        {/* Timezone & Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Zaman Ayarları
            </CardTitle>
            <CardDescription>
              Timezone ve çalışma saatlerinizi ayarlayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Timezone seçin" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Çalışma Başlangıcı
                </Label>
                <Select value={workingStart} onValueChange={setWorkingStart}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKING_HOURS.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Çalışma Bitişi
                </Label>
                <Select value={workingEnd} onValueChange={setWorkingEnd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKING_HOURS.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button 
          onClick={handleSaveProfile} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Değişiklikleri Kaydet
            </>
          )}
        </Button>

        <Separator />

        {/* Fixed Expense Definitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Sabit Gider Tanımları
            </CardTitle>
            <CardDescription>
              Aylık sabit giderlerinizi ve taksitli ödemelerinizi yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setEditingExpense(null);
                setShowExpenseForm(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Sabit Gider Ekle
            </Button>

            {definitions.length > 0 ? (
              <div className="space-y-3">
                {definitions.map(def => (
                  <FixedExpenseCard
                    key={def.id}
                    expense={def}
                    categoryName={getCategoryName(def.category_id)}
                    onEdit={() => {
                      setEditingExpense(def);
                      setShowExpenseForm(true);
                    }}
                    onDelete={() => setDeletingExpenseId(def.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Henüz sabit gider tanımı eklenmemiş
              </p>
            )}

            {definitions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aylık Sabit:</span>
                    <span>{formatCurrency(summary.monthlyFixed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aylık Taksit:</span>
                    <span>{formatCurrency(summary.monthlyInstallments)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Aylık Toplam:</span>
                    <span>{formatCurrency(summary.totalMonthly)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Yıllık Projeksiyon:</span>
                    <span>{formatCurrency(summary.yearlyProjected)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Exchange Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Döviz Kurları (USD/TRY)
            </CardTitle>
            <CardDescription>
              Aylık ortalama USD/TRY kurlarını yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExchangeRateEditor />
          </CardContent>
        </Card>

        <Separator />

        {/* Balance Sheet Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bilanço Ayarları
            </CardTitle>
            <CardDescription>
              Açılış bakiyesi ve varlık alım tarihlerini yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingCashOnHand">2024 Yıl Sonu Kasa Bakiyesi (Açılış) (₺)</Label>
              <Input
                id="openingCashOnHand"
                type="number"
                value={balanceSettings.opening_cash_on_hand}
                onChange={(e) => setBalanceSettings(p => ({ ...p, opening_cash_on_hand: Number(e.target.value) }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                2025 yılı başındaki kasa bakiyenizi girin (resmi bilanço değeri: ₺33.118,55).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBankBalance">2024 Yıl Sonu Banka Bakiyesi (Açılış) (₺)</Label>
              <Input
                id="openingBankBalance"
                type="number"
                value={balanceSettings.opening_bank_balance}
                onChange={(e) => setBalanceSettings(p => ({ ...p, opening_bank_balance: Number(e.target.value) }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                2025 yılı başındaki banka bakiyenizi girin (resmi bilanço değeri: ₺68.194,77).
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="vehiclesPurchaseDate">Taşıtlar Alım Tarihi</Label>
              <Input
                id="vehiclesPurchaseDate"
                type="date"
                value={balanceSettings.vehicles_purchase_date}
                onChange={(e) => setBalanceSettings(p => ({ ...p, vehicles_purchase_date: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Mevcut taşıtlarınızın ortalama alım tarihi. Amortisman hesaplaması için gereklidir.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixturesPurchaseDate">Demirbaşlar Alım Tarihi</Label>
              <Input
                id="fixturesPurchaseDate"
                type="date"
                value={balanceSettings.fixtures_purchase_date}
                onChange={(e) => setBalanceSettings(p => ({ ...p, fixtures_purchase_date: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Mevcut demirbaşlarınızın ortalama alım tarihi. Amortisman hesaplaması için gereklidir.
              </p>
            </div>

            <Button 
              onClick={handleSaveBalanceSettings} 
              disabled={upsertFinancialSettings.isPending}
              className="w-full"
            >
              {upsertFinancialSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Bilanço Ayarlarını Kaydet
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Finans Ayarları
            </CardTitle>
            <CardDescription>
              Finansal kategorileri ve ayarları yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/finance/categories')}>
              <span>Kategorileri Yönet</span>
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* GitHub Integration */}
        <GitHubIntegration />

        <Separator />

        {/* Sign Out */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Çıkış Yap</CardTitle>
            <CardDescription>
              Hesabınızdan çıkış yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              Çıkış Yap
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Fixed Expense Form Sheet */}
      <FixedExpenseForm
        open={showExpenseForm}
        onOpenChange={(open) => {
          setShowExpenseForm(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
        categories={categories}
        onSave={handleSaveExpense}
        isSaving={createDefinition.isPending || updateDefinition.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingExpenseId} onOpenChange={(open) => !open && setDeletingExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sabit Gideri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sabit gider tanımını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
