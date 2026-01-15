import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Users, Pencil, Trash2, AlertCircle, Check } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';
import { useManualEntry } from '@/hooks/finance/useManualEntry';
import { BottomTabBar } from '@/components/BottomTabBar';
import { BankTransaction } from '@/types/finance';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.abs(n)) + ' ₺';

const MONTHS = [
  { value: '1', label: 'Ocak' },
  { value: '2', label: 'Şubat' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayıs' },
  { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' },
  { value: '8', label: 'Ağustos' },
  { value: '9', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
];

const YEARS = ['2024', '2025', '2026'];

const VAT_RATES = [
  { value: '0', label: 'KDV Yok (%0)' },
  { value: '1', label: '%1 KDV' },
  { value: '10', label: '%10 KDV' },
  { value: '20', label: '%20 KDV' },
];

const ICON_OPTIONS = ['💰', '📊', '🔍', '💼', '✅', '🏪', '🚗', '✈️', '📱', '🛡️', '📝', '💱', '🏠', '💳', '📦', '🎯'];

export default function ManualEntry() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const { grouped, hierarchical, isLoading: catLoading, createCategory, parentCategories } = useCategories();
  const { addTransaction, addPartnerTransaction, updateTransaction, deleteTransaction, recentTransactions, isLoading } = useManualEntry(selectedYear);

  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'partner'>('income');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [partnerType, setPartnerType] = useState<'OUT' | 'IN'>('OUT');

  // Edit state
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    month: 1,
    year: 2025,
    amount: '',
    vatRate: '20',
    description: '',
    categoryId: ''
  });

  // New category dialog state
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    code: '',
    icon: '💰',
    color: '#6b7280'
  });

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.code) return;
    
    await createCategory.mutateAsync({
      name: newCategory.name,
      code: newCategory.code,
      icon: newCategory.icon,
      color: newCategory.color,
      type: transactionType === 'income' ? 'INCOME' : 'EXPENSE'
    });
    
    setShowNewCategoryDialog(false);
    setNewCategory({ name: '', code: '', icon: '💰', color: '#6b7280' });
  };

  // Calculate VAT separation
  const calculateVatSeparation = (grossAmount: number, rate: number) => {
    if (rate === 0) return { net: grossAmount, vat: 0 };
    const net = grossAmount / (1 + rate / 100);
    const vat = grossAmount - net;
    return { net, vat };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const transactionDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`;
    const grossAmount = parseFloat(amount);
    const vatRateNum = Number(vatRate);
    const { net: netAmount, vat: vatAmount } = calculateVatSeparation(grossAmount, vatRateNum);

    if (transactionType === 'partner') {
      await addPartnerTransaction.mutateAsync({
        transaction_date: transactionDate,
        transaction_type: partnerType,
        amount: grossAmount,
        description
      });
    } else {
      if (!categoryId) return;
      await addTransaction.mutateAsync({
        transaction_date: transactionDate,
        description,
        amount: grossAmount,
        net_amount: netAmount,
        vat_amount: vatAmount,
        vat_rate: vatRateNum,
        category_id: categoryId,
        is_income: transactionType === 'income'
      });
    }

    // Reset form
    setAmount('');
    setDescription('');
    setCategoryId('');
    setVatRate('20');
  };

  // Handle edit click
  const handleEditClick = (tx: BankTransaction) => {
    const txDate = new Date(tx.transaction_date);
    setEditFormData({
      month: txDate.getMonth() + 1,
      year: txDate.getFullYear(),
      amount: String(Math.abs(tx.amount || 0)),
      vatRate: String(tx.vat_rate || 20),
      description: tx.description || '',
      categoryId: tx.category_id || ''
    });
    setEditingTransaction(tx);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingTransaction || !editFormData.amount) return;

    const transactionDate = `${editFormData.year}-${String(editFormData.month).padStart(2, '0')}-15`;
    const grossAmount = parseFloat(editFormData.amount);
    const vatRateNum = Number(editFormData.vatRate);
    const { net: netAmount, vat: vatAmount } = calculateVatSeparation(grossAmount, vatRateNum);

    // Determine sign based on original transaction
    const finalAmount = editingTransaction.amount && editingTransaction.amount < 0 ? -grossAmount : grossAmount;

    await updateTransaction.mutateAsync({
      id: editingTransaction.id,
      transaction_date: transactionDate,
      amount: finalAmount,
      net_amount: netAmount,
      vat_amount: vatAmount,
      vat_rate: vatRateNum,
      description: editFormData.description,
      category_id: editFormData.categoryId || undefined
    });

    setEditingTransaction(null);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  // Get categories based on transaction type (hierarchical)
  const getCategories = () => {
    const typeFilter = transactionType === 'income' 
      ? ['INCOME', 'FINANCING'] 
      : ['EXPENSE', 'INVESTMENT'];
    return hierarchical.filter(c => typeFilter.includes(c.type));
  };

  const categories = getCategories();

  // VAT preview calculation
  const grossAmountNum = parseFloat(amount) || 0;
  const vatRateNum = Number(vatRate);
  const { net: previewNet, vat: previewVat } = calculateVatSeparation(grossAmountNum, vatRateNum);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Manuel İşlem Ekle</h1>
        </div>

        {/* Year Warning */}
        {selectedYear > 2025 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Dikkat:</strong> {selectedYear} yılına işlem ekliyorsunuz.{' '}
              <button 
                type="button"
                className="underline font-medium"
                onClick={() => setSelectedYear(2025)}
              >
                2025'e geç
              </button>
            </p>
          </div>
        )}

        {/* Transaction Type Selection */}
        <Card>
          <CardContent className="p-4">
            <RadioGroup 
              value={transactionType} 
              onValueChange={(v) => {
                setTransactionType(v as 'income' | 'expense' | 'partner');
                setCategoryId('');
              }}
              className="flex gap-2"
            >
              <div className="flex-1">
                <RadioGroupItem value="income" id="income" className="peer sr-only" />
                <Label 
                  htmlFor="income" 
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-xs font-medium">Gelir</span>
                </Label>
              </div>
              <div className="flex-1">
                <RadioGroupItem value="expense" id="expense" className="peer sr-only" />
                <Label 
                  htmlFor="expense" 
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-xs font-medium">Gider</span>
                </Label>
              </div>
              <div className="flex-1">
                <RadioGroupItem value="partner" id="partner" className="peer sr-only" />
                <Label 
                  htmlFor="partner" 
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-medium">Ortak</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Entry Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {transactionType === 'income' ? '💰 Gelir Ekle' : 
               transactionType === 'expense' ? '📤 Gider Ekle' : '👤 Ortak Cari'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ay</Label>
                  <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Yıl</Label>
                  <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Partner Type (only for partner transactions) */}
              {transactionType === 'partner' && (
                <div className="space-y-2">
                  <Label>İşlem Tipi</Label>
                  <RadioGroup 
                    value={partnerType} 
                    onValueChange={(v) => setPartnerType(v as 'OUT' | 'IN')}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="OUT" id="out" />
                      <Label htmlFor="out" className="text-red-600 cursor-pointer">➖ Ortağa Verilen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="IN" id="in" />
                      <Label htmlFor="in" className="text-green-600 cursor-pointer">➕ Ortaktan Alınan</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Category (not for partner) */}
              {transactionType !== 'partner' && (
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select 
                    value={categoryId} 
                    onValueChange={(v) => {
                      if (v === 'NEW') {
                        setShowNewCategoryDialog(true);
                      } else {
                        setCategoryId(v);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        cat.children && cat.children.length > 0 ? (
                          <SelectGroup key={cat.id}>
                            <SelectLabel className="flex items-center gap-2 text-sm font-medium">
                              {cat.icon} {cat.name}
                              {cat.account_subcode && <span className="text-muted-foreground">({cat.account_subcode})</span>}
                            </SelectLabel>
                            {cat.children.map(child => (
                              <SelectItem key={child.id} value={child.id} className="pl-6">
                                <span className="flex items-center gap-2">
                                  <span className="text-muted-foreground">├</span>
                                  {child.icon} {child.name}
                                  {child.account_subcode && <span className="text-muted-foreground text-xs ml-1">({child.account_subcode})</span>}
                                </span>
                              </SelectItem>
                            ))}
                            <SelectItem value={cat.id} className="pl-6 border-t mt-1 pt-1 text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <span>└</span>
                                {cat.icon} Genel {cat.name}
                              </span>
                            </SelectItem>
                          </SelectGroup>
                        ) : (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              {cat.icon} {cat.name}
                              {cat.account_subcode && <span className="text-muted-foreground text-xs ml-1">({cat.account_subcode})</span>}
                              {cat.is_financing && <span className="text-muted-foreground ml-2">(Finansman)</span>}
                            </span>
                          </SelectItem>
                        )
                      ))}
                      <SelectItem value="NEW" className="text-primary font-medium border-t mt-2 pt-2">
                        ➕ Yeni Kategori Ekle
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount & VAT Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tutar (KDV Dahil) ₺</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                  />
                </div>
                {transactionType !== 'partner' && (
                  <div className="space-y-2">
                    <Label>KDV Oranı</Label>
                    <Select value={vatRate} onValueChange={setVatRate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* VAT Preview */}
              {transactionType !== 'partner' && amount && vatRateNum > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brüt Tutar:</span>
                    <span className="font-medium">{formatCurrency(grossAmountNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KDV (%{vatRate}):</span>
                    <span className="font-medium text-amber-600">{formatCurrency(previewVat)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Net Tutar:</span>
                    <span className="font-bold">{formatCurrency(previewNet)}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea 
                  placeholder="İşlem açıklaması..."
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={addTransaction.isPending || addPartnerTransaction.isPending || (!categoryId && transactionType !== 'partner') || !amount}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Son Eklenenler</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz işlem eklenmedi</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.slice(0, 10).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{tx.category?.icon || '💰'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tx.description || tx.category?.name || 'İşlem'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                          {tx.vat_rate != null && tx.vat_rate > 0 && (
                            <span className="ml-1 text-amber-600">(%{tx.vat_rate} KDV)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${(tx.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(tx.amount || 0) >= 0 ? '+' : ''}{formatCurrency(tx.amount || 0)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(tx)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(tx.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Transaction Sheet */}
      <Sheet open={editingTransaction !== null} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>İşlem Düzenle</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {/* Month & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ay</Label>
                <Select 
                  value={String(editFormData.month)} 
                  onValueChange={v => setEditFormData({...editFormData, month: Number(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Yıl</Label>
                <Select 
                  value={String(editFormData.year)} 
                  onValueChange={v => setEditFormData({...editFormData, year: Number(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount & VAT Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tutar (₺)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={editFormData.amount} 
                  onChange={e => setEditFormData({...editFormData, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>KDV Oranı</Label>
                <Select 
                  value={editFormData.vatRate} 
                  onValueChange={v => setEditFormData({...editFormData, vatRate: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* VAT Preview for Edit */}
            {editFormData.amount && Number(editFormData.vatRate) > 0 && (() => {
              const gross = parseFloat(editFormData.amount) || 0;
              const rate = Number(editFormData.vatRate);
              const { net, vat } = calculateVatSeparation(gross, rate);
              return (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brüt:</span>
                    <span className="font-medium">{formatCurrency(gross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KDV (%{rate}):</span>
                    <span className="font-medium text-amber-600">{formatCurrency(vat)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Net:</span>
                    <span className="font-bold">{formatCurrency(net)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Description */}
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input 
                value={editFormData.description} 
                onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                placeholder="İşlem açıklaması..."
              />
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveEdit} 
              className="w-full"
              disabled={updateTransaction.isPending || !editFormData.amount}
            >
              <Check className="h-4 w-4 mr-2" /> Kaydet
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ekle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori Adı</Label>
              <Input 
                placeholder="Örn: Yazılım Hizmeti"
                value={newCategory.name}
                onChange={e => setNewCategory({...newCategory, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Kısa Kod</Label>
              <Input 
                placeholder="Örn: YAZILIM"
                value={newCategory.code}
                onChange={e => setNewCategory({...newCategory, code: e.target.value.toUpperCase()})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>İkon</Label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategory({...newCategory, icon})}
                    className={`p-2 rounded border transition-colors ${
                      newCategory.icon === icon 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Renk</Label>
              <Input 
                type="color" 
                value={newCategory.color}
                onChange={e => setNewCategory({...newCategory, color: e.target.value})}
                className="h-10 w-20"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleCreateCategory} 
              disabled={createCategory.isPending || !newCategory.name || !newCategory.code}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
}
