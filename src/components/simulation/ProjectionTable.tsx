import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectionItem } from '@/types/simulation';
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

  const total2025 = items.reduce((sum, item) => sum + item.baseAmount, 0);
  const total2026 = items.reduce((sum, item) => sum + item.projectedAmount, 0);
  const totalGrowth = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{title}</h3>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead>Kalem</TableHead>
              <TableHead className="text-right w-32">2025 (USD)</TableHead>
              <TableHead className="text-right w-40">2026 Hedef (USD)</TableHead>
              <TableHead className="text-right w-24">Değişim</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const growth = item.baseAmount > 0 
                ? ((item.projectedAmount - item.baseAmount) / item.baseAmount) * 100 
                : (item.projectedAmount > 0 ? 100 : 0);
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
                        <span className="font-medium">{item.category}</span>
                        {item.isNew && (
                          <Badge variant="secondary" className="text-xs">Yeni</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.isNew ? '-' : formatUSD(item.baseAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={item.projectedAmount || ''}
                        onChange={(e) => onUpdate(item.id, { 
                          projectedAmount: parseFloat(e.target.value) || 0 
                        })}
                        className="w-32 text-right ml-auto"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "inline-flex items-center text-sm font-medium",
                        type === 'revenue' 
                          ? (isPositiveGrowth ? "text-green-600" : "text-red-600")
                          : (isPositiveGrowth ? "text-red-600" : "text-green-600")
                      )}>
                        <GrowthIcon className="h-4 w-4" />
                        {growth.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.isNew && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => onRemove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${item.id}-desc`} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={5}>
                        <Textarea
                          value={item.description}
                          onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                          placeholder="Açıklama ekleyin... (örn: 2 yazılımcı alacağım, aylık $4K x2)"
                          className="min-h-[60px] text-sm"
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
              <TableCell className="text-right">{formatUSD(total2025)}</TableCell>
              <TableCell className="text-right">{formatUSD(total2026)}</TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "inline-flex items-center",
                  type === 'revenue'
                    ? (totalGrowth >= 0 ? "text-green-600" : "text-red-600")
                    : (totalGrowth >= 0 ? "text-red-600" : "text-green-600")
                )}>
                  {totalGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {totalGrowth.toFixed(0)}%
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
