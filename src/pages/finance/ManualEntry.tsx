import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';
import { useManualEntry } from '@/hooks/finance/useManualEntry';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.abs(n)) + ' ₺';

export default function ManualEntry() {
  const [year] = useState(new Date().getFullYear());
  const { grouped, isLoading: catLoading } = useCategories();
  const { addTransaction, addPartnerTransaction, recentTransactions, isLoading } = useManualEntry(year);

  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'partner'>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [partnerType, setPartnerType] = useState<'OUT' | 'IN'>('OUT');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    if (transactionType === 'partner') {
      await addPartnerTransaction.mutateAsync({
        transaction_date: date,
        transaction_type: partnerType,
        amount: parseFloat(amount),
        description
      });
    } else {
      if (!categoryId) return;
      await addTransaction.mutateAsync({
        transaction_date: date,
        description,
        amount: parseFloat(amount),
        category_id: categoryId,
        is_income: transactionType === 'income'
      });
    }

    // Reset form
    setAmount('');
    setDescription('');
    setCategoryId('');
  };

  // Get categories based on transaction type
  const getCategories = () => {
    if (transactionType === 'income') {
      return [...(grouped.income || []), ...(grouped.financing || [])];
    }
    return [...(grouped.expense || []), ...(grouped.investment || [])];
  };

  const categories = getCategories();

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
              {/* Date */}
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
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
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                          {c.is_financing && <span className="text-muted-foreground ml-2">(Finansman)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label>Tutar (₺)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
              </div>

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
                    <div className="flex items-center gap-2">
                      <span>{tx.category?.icon || '💰'}</span>
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.category?.name || 'İşlem'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomTabBar />
    </div>
  );
}
