import { forwardRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailedIncomeStatementData } from '@/types/reports';

interface Props {
  data: DetailedIncomeStatementData;
  formatAmount: (n: number) => string;
}

export const DetailedIncomeStatementTable = forwardRef<HTMLDivElement, Props>(
  ({ data, formatAmount }, ref) => {
    // Format value with parentheses for negative
    const formatValue = (value: number | undefined, isNegative?: boolean) => {
      if (value === undefined) return '';
      if (value === 0) return '0,00';
      const absValue = Math.abs(value);
      const formatted = formatAmount(absValue);
      return isNegative || value < 0 ? `(${formatted})` : formatted;
    };

    // Filter out empty sub-items (keep headers and rows with values)
    const visibleLines = data.lines.filter(line => {
      // Always show headers and bold total rows
      if (line.isBold || line.isHeader) return true;
      // Show sub-items only if they have a value
      if (line.isSubItem) {
        return line.subAmount !== undefined && line.subAmount !== 0;
      }
      // Show other rows if they have any value
      return (line.subAmount !== undefined && line.subAmount !== 0) || 
             (line.totalAmount !== undefined && line.totalAmount !== 0);
    });

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
              
              return (
                <TableRow 
                  key={idx} 
                  className={line.isBold && !line.isHeader ? 'bg-muted/20 font-semibold' : ''}
                >
                  <TableCell className="text-center font-mono text-sm">
                    {line.code}
                  </TableCell>
                  <TableCell className={`${line.isSubItem ? 'pl-8' : ''} ${line.isBold ? 'font-semibold' : ''}`}>
                    {line.name}
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
