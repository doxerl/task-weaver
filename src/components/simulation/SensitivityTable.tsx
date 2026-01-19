import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { EnhancedSensitivityAnalysis } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface SensitivityTableProps {
  analysis: EnhancedSensitivityAnalysis;
  baseProfit: number;
}

export function SensitivityTable({ analysis, baseProfit }: SensitivityTableProps) {
  const getColorClass = (value: number, isProfit: boolean) => {
    if (isProfit) {
      if (value > 0) return 'text-emerald-400 bg-emerald-500/10';
      if (value < 0) return 'text-red-400 bg-red-500/10';
      return 'text-muted-foreground';
    }
    // For runway - higher is better
    if (value >= 18) return 'text-emerald-400 bg-emerald-500/10';
    if (value >= 12) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const formatChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Duyarlılık Analizi
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gelir değişiminin ana metriklere etkisi
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Gelir Değişimi</TableHead>
              <TableHead className="text-right">Net Kâr</TableHead>
              <TableHead className="text-right">Marj</TableHead>
              <TableHead className="text-right">Değerleme</TableHead>
              <TableHead className="text-right">MOIC</TableHead>
              <TableHead className="text-right">Runway</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.revenueImpact.map((scenario, idx) => (
              <TableRow 
                key={idx} 
                className={scenario.change === 0 ? 'bg-primary/5 font-medium' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getChangeIcon(scenario.change)}
                    <Badge 
                      variant={scenario.change === 0 ? 'default' : 'outline'}
                      className={scenario.change === 0 ? '' : 'text-xs'}
                    >
                      {formatChange(scenario.change)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-0.5 rounded ${getColorClass(scenario.profit, true)}`}>
                    {formatCompactUSD(scenario.profit)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-0.5 rounded ${getColorClass(scenario.margin, true)}`}>
                    %{scenario.margin.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatCompactUSD(scenario.valuation)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-0.5 rounded ${scenario.moic >= 2 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                    {scenario.moic.toFixed(2)}x
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-0.5 rounded ${getColorClass(scenario.runway, false)}`}>
                    {scenario.runway > 99 ? '∞' : `${scenario.runway} ay`}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Kritik Değişken:</span>{' '}
            Gelir %20 düşerse kâr {formatCompactUSD(analysis.revenueImpact[0]?.profit || 0)} olur
            {(analysis.revenueImpact[0]?.profit || 0) < 0 && (
              <span className="text-red-400"> (zarar)</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
