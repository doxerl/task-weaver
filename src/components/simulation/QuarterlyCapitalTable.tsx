import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { formatCompactUSD } from '@/lib/formatters';
import { useTranslation } from 'react-i18next';

interface QuarterlyCapitalTableProps {
  quarterlyRevenueA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyRevenueB: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseB: { q1: number; q2: number; q3: number; q4: number };
  investmentAmount: number;
  scenarioAName: string;
  scenarioBName: string;
}

interface QuarterData {
  quarter: string;
  revenue: number;
  expense: number;
  net: number;
  cumulative: number;
  capitalNeed: number;
  isDeathValley: boolean;
}

export const QuarterlyCapitalTable: React.FC<QuarterlyCapitalTableProps> = ({
  quarterlyRevenueA,
  quarterlyExpenseA,
  quarterlyRevenueB,
  quarterlyExpenseB,
  investmentAmount,
  scenarioAName,
  scenarioBName,
}) => {
  const { t } = useTranslation(['simulation']);

  // Calculate quarterly data for both scenarios
  const { investedData, uninvestedData, summary } = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const revenuesA = [quarterlyRevenueA.q1, quarterlyRevenueA.q2, quarterlyRevenueA.q3, quarterlyRevenueA.q4];
    const expensesA = [quarterlyExpenseA.q1, quarterlyExpenseA.q2, quarterlyExpenseA.q3, quarterlyExpenseA.q4];
    const revenuesB = [quarterlyRevenueB.q1, quarterlyRevenueB.q2, quarterlyRevenueB.q3, quarterlyRevenueB.q4];
    const expensesB = [quarterlyExpenseB.q1, quarterlyExpenseB.q2, quarterlyExpenseB.q3, quarterlyExpenseB.q4];
    
    // Invested scenario (Positive/A) - starts with investment
    let cumulativeA = investmentAmount;
    let minCumulativeA = investmentAmount;
    let deathValleyQuarterA = '';
    
    const investedData: QuarterData[] = quarters.map((q, i) => {
      const net = revenuesA[i] - expensesA[i];
      cumulativeA += net;
      if (cumulativeA < minCumulativeA) {
        minCumulativeA = cumulativeA;
        deathValleyQuarterA = q;
      }
      return {
        quarter: q,
        revenue: revenuesA[i],
        expense: expensesA[i],
        net,
        cumulative: cumulativeA,
        capitalNeed: 0, // Invested scenario doesn't need additional capital
        isDeathValley: false,
      };
    });
    
    // Mark death valley for invested
    investedData.forEach(d => {
      d.isDeathValley = d.quarter === deathValleyQuarterA && minCumulativeA < investmentAmount;
    });
    
    // Uninvested scenario (Negative/B) - starts with 0
    let cumulativeB = 0;
    let minCumulativeB = 0;
    let deathValleyQuarterB = '';
    
    const uninvestedData: QuarterData[] = quarters.map((q, i) => {
      const net = revenuesB[i] - expensesB[i];
      cumulativeB += net;
      if (cumulativeB < minCumulativeB) {
        minCumulativeB = cumulativeB;
        deathValleyQuarterB = q;
      }
      const capitalNeed = cumulativeB < 0 ? Math.abs(cumulativeB) : 0;
      return {
        quarter: q,
        revenue: revenuesB[i],
        expense: expensesB[i],
        net,
        cumulative: cumulativeB,
        capitalNeed,
        isDeathValley: false,
      };
    });
    
    // Mark death valley for uninvested
    uninvestedData.forEach(d => {
      d.isDeathValley = d.quarter === deathValleyQuarterB && minCumulativeB < 0;
    });
    
    // Calculate summary
    const totalRevenueA = revenuesA.reduce((a, b) => a + b, 0);
    const totalExpenseA = expensesA.reduce((a, b) => a + b, 0);
    const totalRevenueB = revenuesB.reduce((a, b) => a + b, 0);
    const totalExpenseB = expensesB.reduce((a, b) => a + b, 0);
    
    return {
      investedData,
      uninvestedData,
      summary: {
        investedYearEnd: cumulativeA,
        uninvestedYearEnd: cumulativeB,
        difference: cumulativeA - cumulativeB,
        maxCapitalNeed: Math.abs(minCumulativeB),
        investedBreakEven: investedData.find(d => d.cumulative > investmentAmount)?.quarter || null,
        uninvestedBreakEven: uninvestedData.find(d => d.cumulative > 0 && d.net > 0)?.quarter || null,
      }
    };
  }, [quarterlyRevenueA, quarterlyExpenseA, quarterlyRevenueB, quarterlyExpenseB, investmentAmount]);

  const renderTable = (data: QuarterData[], title: string, isInvested: boolean) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isInvested ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        )}
        <span className={`text-sm font-medium ${isInvested ? 'text-emerald-400' : 'text-red-400'}`}>
          {title}
        </span>
        {isInvested && (
          <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
            {t('quarterlyTable.startingBalance', { amount: formatCompactUSD(investmentAmount) })}
          </Badge>
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t('quarterlyTable.quarter')}</TableHead>
            <TableHead className="text-right">{t('quarterlyTable.revenue')}</TableHead>
            <TableHead className="text-right">{t('quarterlyTable.expense')}</TableHead>
            <TableHead className="text-right">{t('quarterlyTable.netFlow')}</TableHead>
            <TableHead className="text-right">{t('quarterlyTable.cumulative')}</TableHead>
            {!isInvested && <TableHead className="text-right">{t('quarterlyTable.need')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow 
              key={row.quarter}
              className={row.isDeathValley ? 'bg-red-500/10' : ''}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {row.quarter}
                  {row.isDeathValley && (
                    <span className="text-red-400">🔴</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-emerald-400">
                {formatCompactUSD(row.revenue)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-red-400">
                {formatCompactUSD(row.expense)}
              </TableCell>
              <TableCell className={`text-right font-mono text-sm font-medium ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.net >= 0 ? '+' : ''}{formatCompactUSD(row.net)}
              </TableCell>
              <TableCell className={`text-right font-mono text-sm font-medium ${row.cumulative >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCompactUSD(row.cumulative)}
              </TableCell>
              {!isInvested && (
                <TableCell className="text-right">
                  {row.capitalNeed > 0 ? (
                    <Badge variant="outline" className="text-red-400 border-red-500/30 font-mono text-xs">
                      {formatCompactUSD(row.capitalNeed)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Table footer with summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-2 border-t">
        <span>
          {t('quarterlyTable.yearEnd')}: <span className={isInvested ? 'text-emerald-400 font-medium' : (summary.uninvestedYearEnd >= 0 ? 'text-emerald-400' : 'text-red-400') + ' font-medium'}>
            {formatCompactUSD(isInvested ? summary.investedYearEnd : summary.uninvestedYearEnd)}
          </span>
        </span>
        {!isInvested && summary.maxCapitalNeed > 0 && (
          <span>
            {t('quarterlyTable.maxNeed')}: <span className="text-red-400 font-medium">{formatCompactUSD(summary.maxCapitalNeed)}</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          {t('quarterlyTable.title')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('quarterlyTable.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invested Scenario (Positive/A) */}
        {renderTable(investedData, t('quarterlyTable.invested', { name: scenarioAName }), true)}
        
        {/* Uninvested Scenario (Negative/B) */}
        {renderTable(uninvestedData, t('quarterlyTable.uninvested', { name: scenarioBName }), false)}
        
        {/* Summary Banner */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">{t('quarterlyTable.opportunityCost')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('quarterlyTable.betterPosition', { amount: formatCompactUSD(summary.difference) })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
