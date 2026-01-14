import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Divide } from 'lucide-react';
import { ProjectionItem, QuarterlyAmounts } from '@/types/simulation';
import { cn } from '@/lib/utils';

interface ProjectionTableProps {
  title: string;
  items: ProjectionItem[];
  onUpdate: (id: string, updates: Partial<ProjectionItem>) => void;
  onRemove: (id: string) => void;
  type: 'revenue' | 'expense';
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function ProjectionTable({ title, items, onUpdate, onRemove, type }: ProjectionTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleQuarterlyChange = (
    id: string, 
    quarter: keyof QuarterlyAmounts, 
    value: number,
    currentQuarterly: QuarterlyAmounts
  ) => {
    const newQuarterly = { ...currentQuarterly, [quarter]: value };
    onUpdate(id, { projectedQuarterly: newQuarterly });
  };

  const handleDistributeEvenly = (id: string, totalAmount: number) => {
    const perQuarter = Math.round(totalAmount / 4);
    const newQuarterly: QuarterlyAmounts = {
      q1: perQuarter,
      q2: perQuarter,
      q3: perQuarter,
      q4: totalAmount - (perQuarter * 3),
    };
    onUpdate(id, { projectedQuarterly: newQuarterly });
  };

  // Calculate quarterly totals
  const quarterlyTotals = items.reduce(
    (acc, item) => {
      const q = item.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 };
      return {
        q1: acc.q1 + q.q1,
        q2: acc.q2 + q.q2,
        q3: acc.q3 + q.q3,
        q4: acc.q4 + q.q4,
      };
    },
    { q1: 0, q2: 0, q3: 0, q4: 0 }
  );

  const total2025 = items.reduce((sum, item) => sum + item.baseAmount, 0);
  const total2026 = items.reduce((sum, item) => sum + item.projectedAmount, 0);
  const totalGrowth = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;

  return (
    <div className="space-y-2">
      {title && <h3 className="font-semibold text-lg">{title}</h3>}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead>Kalem</TableHead>
              <TableHead className="text-right w-24">2025</TableHead>
              <TableHead className="text-right w-20 text-xs">Q1</TableHead>
              <TableHead className="text-right w-20 text-xs">Q2</TableHead>
              <TableHead className="text-right w-20 text-xs">Q3</TableHead>
              <TableHead className="text-right w-20 text-xs">Q4</TableHead>
              <TableHead className="text-right w-28">2026 Toplam</TableHead>
              <TableHead className="text-right w-20">Δ%</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const quarterly = item.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 };
              const calculatedTotal = quarterly.q1 + quarterly.q2 + quarterly.q3 + quarterly.q4;
              const growth = item.baseAmount > 0 
                ? ((calculatedTotal - item.baseAmount) / item.baseAmount) * 100 
                : (calculatedTotal > 0 ? 100 : 0);
              const isExpanded = expandedRows.has(item.id);
              const isPositiveGrowth = growth >= 0;
              const GrowthIcon = isPositiveGrowth ? ArrowUpRight : ArrowDownRight;

              return (
                <>
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRow(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.category}</span>
                        {item.isNew && (
                          <Badge variant="secondary" className="text-xs">Yeni</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {item.isNew ? '-' : formatCompact(item.baseAmount)}
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        type="number"
                        value={quarterly.q1 || ''}
                        onChange={(e) => handleQuarterlyChange(
                          item.id, 'q1', parseFloat(e.target.value) || 0, quarterly
                        )}
                        className="w-16 text-right text-xs h-8 px-1"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        type="number"
                        value={quarterly.q2 || ''}
                        onChange={(e) => handleQuarterlyChange(
                          item.id, 'q2', parseFloat(e.target.value) || 0, quarterly
                        )}
                        className="w-16 text-right text-xs h-8 px-1"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        type="number"
                        value={quarterly.q3 || ''}
                        onChange={(e) => handleQuarterlyChange(
                          item.id, 'q3', parseFloat(e.target.value) || 0, quarterly
                        )}
                        className="w-16 text-right text-xs h-8 px-1"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        type="number"
                        value={quarterly.q4 || ''}
                        onChange={(e) => handleQuarterlyChange(
                          item.id, 'q4', parseFloat(e.target.value) || 0, quarterly
                        )}
                        className="w-16 text-right text-xs h-8 px-1"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUSD(calculatedTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "inline-flex items-center text-sm font-medium",
                        type === 'revenue' 
                          ? (isPositiveGrowth ? "text-green-600" : "text-red-600")
                          : (isPositiveGrowth ? "text-red-600" : "text-green-600")
                      )}>
                        <GrowthIcon className="h-3 w-3" />
                        {Math.abs(growth).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDistributeEvenly(item.id, calculatedTotal)}
                          title="Eşit böl"
                        >
                          <Divide className="h-3 w-3" />
                        </Button>
                        {item.isNew && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => onRemove(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${item.id}-desc`} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={9}>
                        <Textarea
                          value={item.description}
                          onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                          placeholder="Açıklama ekleyin... (örn: 2 yazılımcı alacağım, Q2'den itibaren aylık $4K x2)"
                          className="min-h-[50px] text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            
            {/* Total Row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell></TableCell>
              <TableCell>TOPLAM</TableCell>
              <TableCell className="text-right">{formatCompact(total2025)}</TableCell>
              <TableCell className="text-right text-sm">{formatCompact(quarterlyTotals.q1)}</TableCell>
              <TableCell className="text-right text-sm">{formatCompact(quarterlyTotals.q2)}</TableCell>
              <TableCell className="text-right text-sm">{formatCompact(quarterlyTotals.q3)}</TableCell>
              <TableCell className="text-right text-sm">{formatCompact(quarterlyTotals.q4)}</TableCell>
              <TableCell className="text-right">{formatUSD(total2026)}</TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "inline-flex items-center",
                  type === 'revenue'
                    ? (totalGrowth >= 0 ? "text-green-600" : "text-red-600")
                    : (totalGrowth >= 0 ? "text-red-600" : "text-green-600")
                )}>
                  {totalGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(totalGrowth).toFixed(0)}%
                </span>
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
