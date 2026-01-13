import { IncomeStatementLine } from '@/types/reports';
import { cn } from '@/lib/utils';

interface IncomeStatementTableProps {
  lines: IncomeStatementLine[];
  year: number;
  formatAmount?: (n: number) => string;
}

const defaultFormatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export function IncomeStatementTable({ lines, year, formatAmount }: IncomeStatementTableProps) {
  const fmt = formatAmount || defaultFormatCurrency;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b">
        <h3 className="font-bold text-center">GELİR TABLOSU</h3>
        <p className="text-xs text-muted-foreground text-center">Dönem: 01.01.{year} - 31.12.{year}</p>
      </div>
      <div className="divide-y">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex justify-between items-center px-4 py-2 text-sm',
              line.isTotal && 'bg-muted/50 font-bold',
              line.isSubtotal && 'font-semibold bg-muted/30',
              !line.name && 'h-2'
            )}
          >
            <span style={{ paddingLeft: `${line.indent * 16}px` }}>{line.name}</span>
            {line.amount !== 0 && (
              <span className={cn(line.isNegative && 'text-destructive')}>
                {line.isNegative ? `(${fmt(Math.abs(line.amount))})` : fmt(line.amount)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
