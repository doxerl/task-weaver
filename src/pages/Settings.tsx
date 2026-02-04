import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { GitHubIntegration } from '@/components/GitHubIntegration';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AppHeader } from '@/components/AppHeader';
import { ArrowLeft, Loader2, Save, User, Globe, Clock, Wallet, CreditCard, Plus, DollarSign, Building2, Languages, Settings as SettingsIcon } from 'lucide-react';
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
  const { t } = useTranslation('common');
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
      toast.error(t('settings.toast.requiredFields'));
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
      toast.error(t('settings.toast.profileUpdateFailed'));
      return;
    }

    toast.success(t('settings.toast.profileUpdated'));
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
      <AppHeader
        title={t('settings.title')}
        icon={<SettingsIcon className="h-5 w-5 text-primary" />}
        backPath="/today"
      />

      <main className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('settings.profile.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.profile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('settings.profile.firstName')}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('settings.profile.firstName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('settings.profile.lastName')}</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('settings.profile.lastName')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.profile.email')}</Label>
              <Input value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">{t('settings.profile.emailHint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t('settings.language.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.language.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector showLabel={false} />
          </CardContent>
        </Card>

        {/* Timezone & Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.timezone.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.timezone.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.timezone.label')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.timezone.label')} />
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
                  {t('settings.timezone.start')}
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
                  {t('settings.timezone.end')}
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
              {t('buttons.saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t('buttons.save')}
            </>
          )}
        </Button>

        <Separator />

        {/* Fixed Expense Definitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('settings.fixedExpenses.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.fixedExpenses.description')}
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
              {t('settings.fixedExpenses.addNew')}
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
                {t('settings.fixedExpenses.noExpenses')}
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
              {t('settings.exchangeRates.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.exchangeRates.description')}
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
              {t('settings.balanceSheet.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.balanceSheet.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingCashOnHand">{t('settings.balanceSheet.openingCash')}</Label>
              <Input
                id="openingCashOnHand"
                type="number"
                value={balanceSettings.opening_cash_on_hand}
                onChange={(e) => setBalanceSettings(p => ({ ...p, opening_cash_on_hand: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBankBalance">{t('settings.balanceSheet.openingBankBalance')}</Label>
              <Input
                id="openingBankBalance"
                type="number"
                value={balanceSettings.opening_bank_balance}
                onChange={(e) => setBalanceSettings(p => ({ ...p, opening_bank_balance: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="vehiclesPurchaseDate">{t('settings.balanceSheet.vehiclesPurchaseDate')}</Label>
              <Input
                id="vehiclesPurchaseDate"
                type="date"
                value={balanceSettings.vehicles_purchase_date}
                onChange={(e) => setBalanceSettings(p => ({ ...p, vehicles_purchase_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixturesPurchaseDate">{t('settings.balanceSheet.fixturesPurchaseDate')}</Label>
              <Input
                id="fixturesPurchaseDate"
                type="date"
                value={balanceSettings.fixtures_purchase_date}
                onChange={(e) => setBalanceSettings(p => ({ ...p, fixtures_purchase_date: e.target.value }))}
              />
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
              {t('buttons.save')}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t('settings.finance.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.finance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/finance/categories')}>
              <span>{t('settings.finance.manageCategories')}</span>
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
            <CardTitle className="text-destructive">{t('settings.account.signOut')}</CardTitle>
            <CardDescription>
              {t('settings.account.signOutDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              {t('settings.account.signOut')}
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
            <AlertDialogTitle>{t('confirm.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense}>{t('buttons.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
