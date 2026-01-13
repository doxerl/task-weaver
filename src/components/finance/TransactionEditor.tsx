import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Save, CheckCircle, ArrowUpCircle, ArrowDownCircle, Sparkles, PenLine, Settings2, AlertTriangle, Info, BarChart3, FileText, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { ParsedTransaction, BalanceImpact } from '@/types/finance';

export interface EditableTransaction extends ParsedTransaction {
  categoryId: string | null;
  isSelected: boolean;
  isManuallyChanged?: boolean;
}

interface TransactionEditorProps {
  transactions: ParsedTransaction[];
  onSave: (transactions: EditableTransaction[]) => void;
  isSaving?: boolean;
}

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(Math.abs(n));

const formatDate = (d: string | null) => {
  if (!d) return '-';
  if (d.includes('.')) return d;
  const parts = d.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return d;
};

export function TransactionEditor({ transactions, onSave, isSaving }: TransactionEditorProps) {
  const { grouped, categories } = useCategories();
  const [editableTransactions, setEditableTransactions] = useState<EditableTransaction[]>(
    transactions.map(t => ({ 
      ...t, 
      categoryId: t.suggestedCategoryId || null,
      isSelected: false,
      isManuallyChanged: false
    }))
  );

  // Sync editableTransactions when transactions prop changes (e.g., after recategorization)
  useEffect(() => {
    setEditableTransactions(prev => {
      // Create a map of previous transactions by index for quick lookup
      const prevMap = new Map(prev.map(t => [t.index, t]));
      
      return transactions.map(t => {
        const existing = prevMap.get(t.index);
        
        // If user manually changed this transaction, preserve their choice
        if (existing?.isManuallyChanged) {
          return {
            ...t,
            categoryId: existing.categoryId,
            isSelected: existing.isSelected,
            isManuallyChanged: true
          };
        }
        
        // Otherwise, use the new values from props
        return { 
          ...t, 
          categoryId: t.suggestedCategoryId || null,
          isSelected: existing?.isSelected || false,
          isManuallyChanged: false
        };
      });
    });
  }, [transactions]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Amount editing state
  const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');

  const getRelevantCategories = (amount: number) => {
    if (amount > 0) {
      return {
        primary: { label: 'Gelir', items: grouped.income },
        partner: { 
          label: 'Ortaktan Gelen', 
          items: grouped.partner.filter(c => 
            c.code?.includes('IN') || 
            c.name.toLowerCase().includes('tahsilat') ||
            c.name.toLowerCase().includes('iade')
          )
        },
        financing: { label: 'Finansman', items: grouped.financing },
        excluded: { label: 'Hariç Tut', items: grouped.excluded }
      };
    }
    
    return {
      primary: { label: 'Gider', items: grouped.expense },
      partner: { 
        label: 'Ortağa Giden', 
        items: grouped.partner.filter(c => 
          c.code?.includes('OUT') || 
          c.name.toLowerCase().includes('ödeme') ||
          c.name.toLowerCase().includes('tediye')
        )
      },
      investment: { label: 'Yatırım', items: grouped.investment },
      excluded: { label: 'Hariç Tut', items: grouped.excluded }
    };
  };

  const getBulkCategories = () => {
    const selectedTxs = editableTransactions.filter(t => t.isSelected);
    if (selectedTxs.length === 0) return null;
    
    const allPositive = selectedTxs.every(t => t.amount > 0);
    const allNegative = selectedTxs.every(t => t.amount < 0);
    
    if (allPositive) return getRelevantCategories(1);
    if (allNegative) return getRelevantCategories(-1);
    
    return null;
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    setEditableTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, categoryId, isManuallyChanged: true } : t)
    );
  };

  const handleSelectChange = (index: number, selected: boolean) => {
    setEditableTransactions(prev =>
      prev.map((t, i) => i === index ? { ...t, isSelected: selected } : t)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectAll(selected);
    setEditableTransactions(prev =>
      prev.map(t => ({ ...t, isSelected: selected }))
    );
  };

  const handleBulkCategory = (categoryId: string) => {
    setEditableTransactions(prev =>
      prev.map(t => t.isSelected ? { ...t, categoryId, isManuallyChanged: true } : t)
    );
  };

  // Amount editing handlers
  const handleAmountEdit = (index: number) => {
    const tx = editableTransactions[index];
    setEditingAmountIndex(index);
    setTempAmount(Math.abs(tx.amount).toString());
  };

  const handleAmountSave = (index: number, newAmount: number, isPositive: boolean) => {
    const finalAmount = isPositive ? Math.abs(newAmount) : -Math.abs(newAmount);
    setEditableTransactions(prev =>
      prev.map((t, i) => {
        if (i === index) {
          return { 
            ...t, 
            amount: finalAmount,
            isAmountManuallyChanged: true,
            originalAmountValue: t.originalAmountValue ?? t.amount // Store original on first edit
          };
        }
        return t;
      })
    );
    setEditingAmountIndex(null);
    setTempAmount('');
  };

  const handleAmountCancel = () => {
    setEditingAmountIndex(null);
    setTempAmount('');
  };

  const selectedCount = editableTransactions.filter(t => t.isSelected).length;
  const categorizedCount = editableTransactions.filter(t => t.categoryId).length;
  const totalIncome = editableTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = editableTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  
  const pnlIncomeCount = editableTransactions.filter(t => t.affectsPnl && t.amount > 0).length;
  const pnlExpenseCount = editableTransactions.filter(t => t.affectsPnl && t.amount < 0).length;
  const balanceOnlyCount = editableTransactions.filter(t => t.affectsPnl === false).length;
  const lowConfidenceCount = editableTransactions.filter(t => (t.aiConfidence || 0) < 0.7).length;
  const amountCorrectedCount = editableTransactions.filter(t => t.isAmountManuallyChanged).length;

  const sortedTransactions = useMemo(() => {
    return [...editableTransactions].sort((a, b) => {
      const aConf = a.aiConfidence || 1;
      const bConf = b.aiConfidence || 1;
      return aConf - bConf;
    });
  }, [editableTransactions]);

  const getOriginalIndex = (tx: EditableTransaction) => {
    return editableTransactions.findIndex(t => t.index === tx.index);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const bulkCategories = getBulkCategories();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">İşlemleri Etiketle</CardTitle>
            <Link to="/finance/categories">
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Kategorileri Yönet">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{categorizedCount}/{editableTransactions.length} etiketli</Badge>
            <Badge variant="outline" className="text-green-600">
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              +{formatCurrency(totalIncome)} ₺
            </Badge>
            <Badge variant="outline" className="text-red-600">
              <ArrowDownCircle className="h-3 w-3 mr-1" />
              -{formatCurrency(totalExpense)} ₺
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Card */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Toplam</p>
                <p className="text-xl font-bold">{editableTransactions.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Gelir (K/Z ↑)
                </p>
                <p className="text-xl font-bold text-green-600">{pnlIncomeCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Gider (K/Z ↓)
                </p>
                <p className="text-xl font-bold text-red-600">{pnlExpenseCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Bilanço
                </p>
                <p className="text-xl font-bold text-blue-600">{balanceOnlyCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kontrol Gereken</p>
                <p className={cn(
                  "text-xl font-bold",
                  lowConfidenceCount > 0 ? "text-amber-600" : "text-green-600"
                )}>
                  {lowConfidenceCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <PenLine className="h-3 w-3" /> Tutar Düzeltildi
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  amountCorrectedCount > 0 ? "text-purple-600" : "text-muted-foreground"
                )}>
                  {amountCorrectedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low confidence warning */}
        {lowConfidenceCount > 0 && (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {lowConfidenceCount} işlem düşük güvenle kategorilendi. Sarı ile işaretli satırları kontrol edin.
            </AlertDescription>
          </Alert>
        )}

        {/* Bulk actions */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectAll}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
          />
          <span className="text-sm font-medium">Tümünü Seç</span>
          
          {selectedCount > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground">{selectedCount} seçili</span>
              <Select onValueChange={handleBulkCategory}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="Toplu kategori ata" />
                </SelectTrigger>
                <SelectContent>
                  {bulkCategories ? (
                    <>
                      {bulkCategories.primary.items.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{bulkCategories.primary.label}</SelectLabel>
                          {bulkCategories.primary.items.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {bulkCategories.partner.items.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{bulkCategories.partner.label}</SelectLabel>
                          {bulkCategories.partner.items.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {'financing' in bulkCategories && bulkCategories.financing.items.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{bulkCategories.financing.label}</SelectLabel>
                          {bulkCategories.financing.items.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {'investment' in bulkCategories && bulkCategories.investment.items.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{bulkCategories.investment.label}</SelectLabel>
                          {bulkCategories.investment.items.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {bulkCategories.excluded.items.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{bulkCategories.excluded.label}</SelectLabel>
                          {bulkCategories.excluded.items.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectGroup>
                        <SelectLabel>Gelir</SelectLabel>
                        {grouped.income.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Gider</SelectLabel>
                        {grouped.expense.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Ortak / Finansman</SelectLabel>
                        {[...grouped.partner, ...grouped.financing].map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Hariç Tut</SelectLabel>
                        {grouped.excluded.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Transaction list */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {sortedTransactions.map((tx) => {
            const originalIndex = getOriginalIndex(tx);
            const isLowConfidence = (tx.aiConfidence || 0) < 0.7;
            const isEditingAmount = editingAmountIndex === originalIndex;
            
            return (
              <div
                key={tx.index}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                  tx.isSelected && "bg-muted/50 border-primary/50",
                  tx.categoryId && "border-green-500/30",
                  isLowConfidence && "bg-amber-50 dark:bg-amber-950/20 border-amber-300"
                )}
              >
                <Checkbox
                  checked={tx.isSelected}
                  onCheckedChange={(checked) => handleSelectChange(originalIndex, checked as boolean)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      {tx.counterparty && (
                        <p className="text-xs text-muted-foreground truncate">→ {tx.counterparty}</p>
                      )}
                      {tx.reference && (
                        <p className="text-xs text-muted-foreground">Ref: {tx.reference}</p>
                      )}
                    </div>
                    
                    {/* Amount section with edit capability */}
                    <div className="text-right shrink-0 min-w-[140px]">
                      {isEditingAmount ? (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleAmountSave(originalIndex, parseFloat(tempAmount) || 0, true)}
                            title="Gelir olarak kaydet (+)"
                          >
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleAmountSave(originalIndex, parseFloat(tempAmount) || 0, false)}
                            title="Gider olarak kaydet (-)"
                          >
                            <ArrowDownCircle className="h-4 w-4 text-red-600" />
                          </Button>
                          <Input
                            type="number"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            className="w-20 h-6 text-sm text-right"
                            autoFocus
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleAmountCancel}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <div>
                            <p className={cn(
                              "text-sm font-semibold",
                              tx.amount > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {tx.amount > 0 ? '+' : '-'}{formatCurrency(tx.amount)} ₺
                            </p>
                            {tx.isAmountManuallyChanged && tx.originalAmountValue !== undefined && (
                              <p className="text-xs text-muted-foreground line-through">
                                {tx.originalAmountValue > 0 ? '+' : '-'}{formatCurrency(tx.originalAmountValue)} ₺
                              </p>
                            )}
                            {tx.balance != null && (
                              <p className="text-xs text-muted-foreground">Bakiye: {formatCurrency(tx.balance)} ₺</p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                            onClick={() => handleAmountEdit(originalIndex)}
                            title="Tutarı düzelt"
                          >
                            <PenLine className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {tx.isAmountManuallyChanged && !isEditingAmount && (
                        <Badge variant="outline" className="text-xs mt-1 text-purple-600 border-purple-300">
                          Düzeltildi
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const relevantCats = getRelevantCategories(tx.amount);
                  return (
                    <Select
                      value={tx.categoryId || undefined}
                      onValueChange={(value) => handleCategoryChange(originalIndex, value)}
                    >
                      <SelectTrigger className="w-40 h-8 shrink-0">
                        <SelectValue placeholder="Kategori seç">
                          {getCategoryName(tx.categoryId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {relevantCats.primary.items.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{relevantCats.primary.label}</SelectLabel>
                            {relevantCats.primary.items.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span>{c.icon}</span>
                                  <span>{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {relevantCats.partner.items.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{relevantCats.partner.label}</SelectLabel>
                            {relevantCats.partner.items.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span>{c.icon}</span>
                                  <span>{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {'financing' in relevantCats && relevantCats.financing.items.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{relevantCats.financing.label}</SelectLabel>
                            {relevantCats.financing.items.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span>{c.icon}</span>
                                  <span>{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {'investment' in relevantCats && relevantCats.investment.items.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{relevantCats.investment.label}</SelectLabel>
                            {relevantCats.investment.items.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span>{c.icon}</span>
                                  <span>{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {relevantCats.excluded.items.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{relevantCats.excluded.label}</SelectLabel>
                            {relevantCats.excluded.items.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span>{c.icon}</span>
                                  <span>{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()}

                {/* AI/Manual indicator with reasoning tooltip */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Balance impact badge */}
                  {tx.affectsPnl !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        tx.affectsPnl ? "border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400" : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {tx.affectsPnl ? '📊 K/Z' : '📋 Bilanço'}
                    </Badge>
                  )}
                  
                  {/* Confidence with reasoning tooltip */}
                  {tx.categoryId && tx.aiConfidence && tx.aiConfidence > 0 && !tx.isManuallyChanged && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs gap-1 cursor-help",
                              tx.aiConfidence >= 0.8 && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              tx.aiConfidence >= 0.5 && tx.aiConfidence < 0.8 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              tx.aiConfidence < 0.5 && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}
                          >
                            <Sparkles className="h-3 w-3" />
                            {Math.round(tx.aiConfidence * 100)}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs font-medium">AI Gerekçesi</p>
                          <p className="text-xs text-muted-foreground">{tx.aiReasoning || 'Gerekçe belirtilmedi'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {tx.isManuallyChanged && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <PenLine className="h-3 w-3" />
                      Manuel
                    </Badge>
                  )}
                  {tx.categoryId && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <Button
          onClick={() => onSave(editableTransactions)}
          className="w-full"
          disabled={categorizedCount === 0 || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Kaydediliyor...' : `${categorizedCount} İşlemi Kaydet`}
        </Button>
      </CardContent>
    </Card>
  );
}
