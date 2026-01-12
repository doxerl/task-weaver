import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, CheckCircle, ArrowUpCircle, ArrowDownCircle, Sparkles, PenLine } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';

export interface ParsedTransaction {
  index: number;
  date: string | null;
  description: string;
  amount: number;
  balance: number | null;
  reference: string | null;
  counterparty: string | null;
  suggestedCategoryId?: string | null;
  aiConfidence?: number;
}

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
  // Already in DD.MM.YYYY format
  if (d.includes('.')) return d;
  // Convert YYYY-MM-DD to DD.MM.YYYY
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
      categoryId: t.suggestedCategoryId || null, // AI önerisini varsayılan yap
      isSelected: false,
      isManuallyChanged: false
    }))
  );
  const [selectAll, setSelectAll] = useState(false);

  // İşlem tutarına göre ilgili kategorileri getir
  const getRelevantCategories = (amount: number) => {
    if (amount > 0) {
      // Para girişi - Gelir kategorileri
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
    
    // Para çıkışı - Gider kategorileri
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

  // Toplu seçim için kategori belirleme
  const getBulkCategories = () => {
    const selectedTxs = editableTransactions.filter(t => t.isSelected);
    if (selectedTxs.length === 0) return null;
    
    const allPositive = selectedTxs.every(t => t.amount > 0);
    const allNegative = selectedTxs.every(t => t.amount < 0);
    
    if (allPositive) return getRelevantCategories(1);
    if (allNegative) return getRelevantCategories(-1);
    
    // Karışık seçim - tüm kategorileri göster
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

  const selectedCount = editableTransactions.filter(t => t.isSelected).length;
  const categorizedCount = editableTransactions.filter(t => t.categoryId).length;
  const totalIncome = editableTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = editableTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const bulkCategories = getBulkCategories();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">İşlemleri Etiketle</CardTitle>
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
                    // Filtrelenmiş kategoriler (hepsi + veya hepsi -)
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
                    // Karışık seçim - tüm kategoriler
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
          {editableTransactions.map((tx, index) => (
            <div
              key={tx.index}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                tx.isSelected && "bg-muted/50 border-primary/50",
                tx.categoryId && "border-green-500/30"
              )}
            >
              <Checkbox
                checked={tx.isSelected}
                onCheckedChange={(checked) => handleSelectChange(index, checked as boolean)}
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
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-semibold",
                      tx.amount > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {tx.amount > 0 ? '+' : '-'}{formatCurrency(tx.amount)} ₺
                    </p>
                    {tx.balance != null && (
                      <p className="text-xs text-muted-foreground">Bakiye: {formatCurrency(tx.balance)} ₺</p>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const relevantCats = getRelevantCategories(tx.amount);
                return (
                  <Select
                    value={tx.categoryId || undefined}
                    onValueChange={(value) => handleCategoryChange(index, value)}
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

              {/* AI/Manual indicator */}
              <div className="flex items-center gap-1 shrink-0">
                {tx.categoryId && tx.aiConfidence && tx.aiConfidence > 0 && !tx.isManuallyChanged && (
                  <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary">
                    <Sparkles className="h-3 w-3" />
                    {Math.round(tx.aiConfidence * 100)}%
                  </Badge>
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
          ))}
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
