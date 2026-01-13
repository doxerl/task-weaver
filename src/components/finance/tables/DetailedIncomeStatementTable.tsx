import { forwardRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailedIncomeStatementData, DetailedIncomeStatementLine } from '@/types/reports';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  data: DetailedIncomeStatementData;
  formatAmount: (n: number) => string;
}

export const DetailedIncomeStatementTable = forwardRef<HTMLDivElement, Props>(
  ({ data, formatAmount }, ref) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (code: string) => {
      setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
        }
        return next;
      });
    };

    // Format value with parentheses for negative
    const formatValue = (value: number | undefined, isNegative?: boolean) => {
      if (value === undefined) return '';
      if (value === 0) return '0,00';
      const absValue = Math.abs(value);
      const formatted = formatAmount(absValue);
      return isNegative || value < 0 ? `(${formatted})` : formatted;
    };

    // Build visible lines with expansion logic
    const getVisibleLines = (): DetailedIncomeStatementLine[] => {
      const result: DetailedIncomeStatementLine[] = [];
      
      for (const line of data.lines) {
        // Skip empty sub-items
        if (line.isSubItem && !line.isExpandable) {
          if (line.subAmount === undefined || line.subAmount === 0) continue;
        }
        
        // Always show headers, bold totals, and expandable items
        if (line.isBold || line.isHeader || line.isExpandable) {
          result.push(line);
        } else if (line.isSubItem) {
          // Check if parent is expanded
          if (line.parentCode && expandedRows.has(line.parentCode)) {
            result.push(line);
          } else if (!line.parentCode) {
            // No parent code = always visible
            if (line.subAmount !== undefined && line.subAmount !== 0) {
              result.push(line);
            }
          }
        } else {
          // Other rows with values
          if ((line.subAmount !== undefined && line.subAmount !== 0) || 
              (line.totalAmount !== undefined && line.totalAmount !== 0)) {
            result.push(line);
          }
        }
      }
      
      return result;
    };

    const visibleLines = getVisibleLines();

    // Calculate indentation based on depth
    const getIndentClass = (line: DetailedIncomeStatementLine) => {
      const depth = line.depth || 0;
      if (line.isSubItem) {
        return `pl-${8 + depth * 4}`;
      }
      if (depth > 0) {
        return `pl-${depth * 4}`;
      }
      return '';
    };

    return (
      <div ref={ref} className="bg-background rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            ({data.periodStart} - {data.periodEnd} DÖNEMİ)
          </p>
          <h2 className="text-lg font-bold mt-1">AYRINTILI GELİR TABLOSU</h2>
          <p className="text-sm font-semibold mt-1">{data.companyName}</p>
        </div>

        {/* Table - Single amount column (Resmi format) */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16 text-center font-bold">Kod</TableHead>
              <TableHead className="font-bold">AÇIKLAMA</TableHead>
              <TableHead className="w-40 text-right font-bold">
                <div className="text-xs">CARİ DÖNEM</div>
                <div className="text-xs">({data.year})</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLines.map((line, idx) => {
              // Determine the display value (use subAmount for sub-items, totalAmount for headers/totals)
              const displayValue = line.isSubItem ? line.subAmount : line.totalAmount;
              const isNegativeValue = line.isNegative || (displayValue !== undefined && displayValue < 0);
              const isExpanded = expandedRows.has(line.code);
              const depth = line.depth || 0;
              
              return (
                <TableRow 
                  key={idx} 
                  className={`
                    ${line.isBold && !line.isHeader ? 'bg-muted/20 font-semibold' : ''}
                    ${line.isExpandable ? 'cursor-pointer hover:bg-muted/10' : ''}
                    ${depth > 0 ? 'bg-muted/5' : ''}
                  `}
                  onClick={line.isExpandable ? () => toggleRow(line.code) : undefined}
                >
                  <TableCell className="text-center font-mono text-sm">
                    {line.code}
                  </TableCell>
                  <TableCell className={`${line.isSubItem ? 'pl-8' : ''} ${line.isBold ? 'font-semibold' : ''}`}>
                    <div className="flex items-center gap-1" style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
                      {line.isExpandable && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(line.code);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <span>{line.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${isNegativeValue ? 'text-destructive' : ''} ${line.isBold ? 'font-semibold' : ''}`}>
                    {formatValue(displayValue, line.isNegative)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="p-2 border-t text-right text-xs text-muted-foreground">
          Sayfa No: 1/1
        </div>
      </div>
    );
  }
);

DetailedIncomeStatementTable.displayName = 'DetailedIncomeStatementTable';
