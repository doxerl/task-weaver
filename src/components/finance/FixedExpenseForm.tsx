import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FixedExpenseDefinition } from '@/hooks/finance/useFixedExpenses';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface FixedExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: FixedExpenseDefinition | null;
  categories: Category[];
  onSave: (data: Partial<FixedExpenseDefinition>) => void;
  isSaving?: boolean;
}

export function FixedExpenseForm({ 
  open, 
  onOpenChange, 
  expense, 
  categories, 
  onSave,
  isSaving 
}: FixedExpenseFormProps) {
  const [expenseName, setExpenseName] = useState('');
  const [expenseType, setExpenseType] = useState<'fixed' | 'semi_fixed' | 'installment'>('fixed');
  const [categoryId, setCategoryId] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentMonths, setInstallmentMonths] = useState('');
  const [installmentsPaid, setInstallmentsPaid] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      setExpenseName(expense.expense_name || '');
      setExpenseType(expense.expense_type || 'fixed');
      setCategoryId(expense.category_id || '');
      setMonthlyAmount(expense.monthly_amount?.toString() || '');
      setTotalAmount(expense.total_amount?.toString() || '');
      setInstallmentMonths(expense.installment_months?.toString() || '');
      setInstallmentsPaid(expense.installments_paid?.toString() || '');
      setStartDate(expense.start_date ? new Date(expense.start_date) : undefined);
      setNotes(expense.notes || '');
    } else {
      // Reset form for new expense
      setExpenseName('');
      setExpenseType('fixed');
      setCategoryId('');
      setMonthlyAmount('');
      setTotalAmount('');
      setInstallmentMonths('');
      setInstallmentsPaid('');
      setStartDate(undefined);
      setNotes('');
    }
  }, [expense, open]);

  const handleSubmit = () => {
    if (!expenseName.trim()) return;

    const data: Partial<FixedExpenseDefinition> = {
      expense_name: expenseName.trim(),
      expense_type: expenseType,
      category_id: categoryId || null,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      notes: notes.trim() || null,
    };

    if (expenseType === 'installment') {
      data.total_amount = totalAmount ? parseFloat(totalAmount) : null;
      data.installment_months = installmentMonths ? parseInt(installmentMonths) : null;
      data.installments_paid = installmentsPaid ? parseInt(installmentsPaid) : 0;
      data.monthly_amount = null;
    } else {
      data.monthly_amount = monthlyAmount ? parseFloat(monthlyAmount) : null;
      data.total_amount = null;
      data.installment_months = null;
      data.installments_paid = null;
    }

    if (expense?.id) {
      data.id = expense.id;
    }

    onSave(data);
  };

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {expense ? 'Sabit Gideri Düzenle' : 'Yeni Sabit Gider'}
          </SheetTitle>
          <SheetDescription>
            Aylık sabit gider veya taksitli ödeme tanımlayın
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="name">Gider Adı *</Label>
            <Input
              id="name"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="örn. Ofis Kirası, Kredi Taksiti"
            />
          </div>

          <div className="space-y-2">
            <Label>Gider Tipi</Label>
            <Select value={expenseType} onValueChange={(v) => setExpenseType(v as typeof expenseType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Sabit (Her ay aynı)</SelectItem>
                <SelectItem value="semi_fixed">Yarı-Sabit (Değişken)</SelectItem>
                <SelectItem value="installment">Taksitli (Toplam belirli)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {expenseType === 'installment' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="total">Toplam Tutar (₺)</Label>
                <Input
                  id="total"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="örn. 120000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="months">Taksit Sayısı</Label>
                  <Input
                    id="months"
                    type="number"
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(e.target.value)}
                    placeholder="örn. 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid">Ödenen Taksit</Label>
                  <Input
                    id="paid"
                    type="number"
                    value={installmentsPaid}
                    onChange={(e) => setInstallmentsPaid(e.target.value)}
                    placeholder="örn. 3"
                  />
                </div>
              </div>

              {totalAmount && installmentMonths && (
                <p className="text-sm text-muted-foreground">
                  Aylık Taksit: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(parseFloat(totalAmount) / parseInt(installmentMonths))}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="monthly">Aylık Tutar (₺)</Label>
              <Input
                id="monthly"
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="örn. 15000"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Başlangıç Tarihi</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: tr }) : 'Tarih seçin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek bilgi veya notlar..."
              rows={3}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={!expenseName.trim() || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? 'Güncelle' : 'Ekle'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
