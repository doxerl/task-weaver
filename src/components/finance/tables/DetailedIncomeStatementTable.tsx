import { forwardRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailedIncomeStatementData } from '@/types/reports';

interface Props {
  data: DetailedIncomeStatementData;
  formatAmount: (n: number) => string;
}

export const DetailedIncomeStatementTable = forwardRef<HTMLDivElement, Props>(
  ({ data, formatAmount }, ref) => {
    const formatValue = (value: number | undefined, isNegative?: boolean) => {
      if (value === undefined || value === 0) return '';
      const absValue = Math.abs(value);
      const formatted = formatAmount(absValue);
      return isNegative || value < 0 ? `(${formatted})` : formatted;
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

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16 text-center font-bold">Kod</TableHead>
              <TableHead className="font-bold">AÇIKLAMA</TableHead>
              <TableHead className="w-32 text-right font-bold">
                <div className="text-xs">CARİ DÖNEM</div>
                <div className="text-xs">({data.year})</div>
              </TableHead>
              <TableHead className="w-32 text-right font-bold">
                <div className="text-xs">TOPLAM</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lines.map((line, idx) => (
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
                <TableCell className={`text-right font-mono text-sm ${line.isNegative ? 'text-red-600' : ''}`}>
                  {formatValue(line.subAmount, line.isNegative)}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm ${line.isNegative || (line.totalAmount && line.totalAmount < 0) ? 'text-red-600' : ''} ${line.isBold ? 'font-semibold' : ''}`}>
                  {formatValue(line.totalAmount, line.isNegative)}
                </TableCell>
              </TableRow>
            ))}
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
