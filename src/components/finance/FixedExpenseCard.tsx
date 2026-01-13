import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FixedExpenseDefinition } from '@/hooks/finance/useFixedExpenses';
import { Pencil, Trash2, CreditCard, Calendar, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FixedExpenseCardProps {
  expense: FixedExpenseDefinition;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const expenseTypeLabels: Record<string, string> = {
  fixed: 'Sabit',
  semi_fixed: 'Yarı-Sabit',
  installment: 'Taksitli',
};

const expenseTypeColors: Record<string, string> = {
  fixed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  semi_fixed: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  installment: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function FixedExpenseCard({ expense, categoryName, onEdit, onDelete }: FixedExpenseCardProps) {
  const isInstallment = expense.expense_type === 'installment';
  const monthlyAmount = isInstallment && expense.total_amount && expense.installment_months
    ? expense.total_amount / expense.installment_months
    : expense.monthly_amount || 0;
  
  const remainingMonths = isInstallment && expense.installment_months
    ? expense.installment_months - (expense.installments_paid || 0)
    : null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted">
              {isInstallment ? (
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Receipt className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{expense.expense_name}</h4>
                <Badge 
                  variant="outline" 
                  className={expenseTypeColors[expense.expense_type]}
                >
                  {expenseTypeLabels[expense.expense_type]}
                </Badge>
              </div>
              
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                <p>
                  Aylık: <span className="font-medium text-foreground">{formatCurrency(monthlyAmount)}</span>
                  {isInstallment && remainingMonths !== null && (
                    <span className="ml-2">
                      | Kalan: <span className="font-medium">{remainingMonths}/{expense.installment_months}</span> ay
                    </span>
                  )}
                </p>
                
                {isInstallment && expense.total_amount && (
                  <p>Toplam: {formatCurrency(expense.total_amount)}</p>
                )}
                
                {expense.start_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Başlangıç: {format(new Date(expense.start_date), 'MMM yyyy', { locale: tr })}
                  </p>
                )}
                
                {categoryName && (
                  <p>Kategori: {categoryName}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
