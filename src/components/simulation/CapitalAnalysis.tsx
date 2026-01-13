import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { InvestmentItem, SimulationSummary } from '@/types/simulation';
import { AddItemDialog } from './AddItemDialog';
import { cn } from '@/lib/utils';

interface CapitalAnalysisProps {
  investments: InvestmentItem[];
  summary: SimulationSummary;
  exchangeRate: number;
  onAddInvestment: (item: Omit<InvestmentItem, 'id'>) => void;
  onRemoveInvestment: (id: string) => void;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function CapitalAnalysis({ 
  investments, 
  summary, 
  exchangeRate, 
  onAddInvestment, 
  onRemoveInvestment 
}: CapitalAnalysisProps) {
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
  const projectedProfit = summary.projected.netProfit;
  const netCapitalNeed = totalInvestment - projectedProfit;
  const isPositive = netCapitalNeed <= 0;

  // Calculate ROI
  const roi = totalInvestment > 0 ? ((projectedProfit / totalInvestment) * 100) : 0;
  const paybackMonths = projectedProfit > 0 ? Math.ceil((totalInvestment / projectedProfit) * 12) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Sermaye & Yatırım Analizi</h3>
        <AddItemDialog type="investment" onAdd={onAddInvestment} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Investment List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Planlanan Yatırımlar</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz yatırım eklenmedi. "Ekle" butonuna tıklayarak yatırım ekleyebilirsiniz.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Yatırım</TableHead>
                    <TableHead>Ay</TableHead>
                    <TableHead className="text-right">Tutar (USD)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((inv) => (
                    <TableRow key={inv.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.name}</p>
                          {inv.description && (
                            <p className="text-xs text-muted-foreground">{inv.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{MONTH_NAMES[inv.month - 1]}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUSD(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => onRemoveInvestment(inv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>TOPLAM</TableCell>
                    <TableCell className="text-right">{formatUSD(totalInvestment)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Capital Summary */}
        <Card className={cn(
          isPositive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isPositive ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Sermaye Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Toplam Yatırım</span>
                <span className="font-medium">{formatUSD(totalInvestment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tahmini Net Kar</span>
                <span className="font-medium text-green-600">{formatUSD(projectedProfit)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Net Sermaye İhtiyacı</span>
                <span className={cn(
                  "font-bold",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {formatUSD(Math.abs(netCapitalNeed))}
                  {isPositive && ' fazla'}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TL Karşılığı</span>
                <span className="font-medium">
                  ₺{(Math.abs(netCapitalNeed) * exchangeRate).toLocaleString('tr-TR')}
                </span>
              </div>
              {totalInvestment > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ROI</span>
                    <span className={cn(
                      "font-medium",
                      roi >= 100 ? "text-green-600" : roi >= 50 ? "text-yellow-600" : "text-red-600"
                    )}>
                      %{roi.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Geri Dönüş Süresi</span>
                    <span className="font-medium">
                      {paybackMonths > 0 ? `${paybackMonths} ay` : '-'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {!isPositive && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3 text-sm">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Dikkat:</strong> Planlanan yatırımlar tahmini karı aşıyor. 
                  Dış sermaye ihtiyacınız: {formatUSD(netCapitalNeed)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
