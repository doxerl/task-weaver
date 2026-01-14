import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from 'lucide-react';
import { SimulationScenario } from '@/types/simulation';

interface ScenarioComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: SimulationScenario[];
  currentScenarioId: string | null;
}

interface ComparisonMetric {
  label: string;
  scenarioA: number;
  scenarioB: number;
  format: 'currency' | 'percent' | 'number';
  higherIsBetter: boolean;
}

const formatValue = (value: number, format: 'currency' | 'percent' | 'number'): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `%${value.toFixed(1)}`;
    case 'number':
      return value.toLocaleString('tr-TR');
    default:
      return String(value);
  }
};

const calculateDiff = (a: number, b: number): { value: number; percent: number } => {
  const diff = b - a;
  const percent = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { value: diff, percent };
};

const DiffBadge: React.FC<{ diff: { value: number; percent: number }; format: 'currency' | 'percent' | 'number'; higherIsBetter: boolean }> = ({
  diff,
  format,
  higherIsBetter,
}) => {
  const isPositive = diff.value > 0;
  const isNeutral = diff.value === 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;

  if (isNeutral) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        -
      </Badge>
    );
  }

  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isGood ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{format === 'percent' ? `${diff.value.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
    </Badge>
  );
};

const calculateScenarioSummary = (scenario: SimulationScenario) => {
  const totalRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const totalExpense = scenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const totalInvestment = scenario.investments.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const capitalNeed = Math.max(0, totalInvestment - netProfit);

  return {
    totalRevenue,
    totalExpense,
    totalInvestment,
    netProfit,
    profitMargin,
    capitalNeed,
  };
};

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  open,
  onOpenChange,
  scenarios,
  currentScenarioId,
}) => {
  const [scenarioAId, setScenarioAId] = useState<string | null>(currentScenarioId);
  const [scenarioBId, setScenarioBId] = useState<string | null>(null);

  const scenarioA = useMemo(() => scenarios.find(s => s.id === scenarioAId), [scenarios, scenarioAId]);
  const scenarioB = useMemo(() => scenarios.find(s => s.id === scenarioBId), [scenarios, scenarioBId]);

  const summaryA = useMemo(() => scenarioA ? calculateScenarioSummary(scenarioA) : null, [scenarioA]);
  const summaryB = useMemo(() => scenarioB ? calculateScenarioSummary(scenarioB) : null, [scenarioB]);

  const metrics: ComparisonMetric[] = useMemo(() => {
    if (!summaryA || !summaryB) return [];

    return [
      { label: 'Toplam Gelir', scenarioA: summaryA.totalRevenue, scenarioB: summaryB.totalRevenue, format: 'currency', higherIsBetter: true },
      { label: 'Toplam Gider', scenarioA: summaryA.totalExpense, scenarioB: summaryB.totalExpense, format: 'currency', higherIsBetter: false },
      { label: 'Net Kâr', scenarioA: summaryA.netProfit, scenarioB: summaryB.netProfit, format: 'currency', higherIsBetter: true },
      { label: 'Kâr Marjı', scenarioA: summaryA.profitMargin, scenarioB: summaryB.profitMargin, format: 'percent', higherIsBetter: true },
      { label: 'Yatırım Toplamı', scenarioA: summaryA.totalInvestment, scenarioB: summaryB.totalInvestment, format: 'currency', higherIsBetter: false },
      { label: 'Sermaye İhtiyacı', scenarioA: summaryA.capitalNeed, scenarioB: summaryB.capitalNeed, format: 'currency', higherIsBetter: false },
    ];
  }, [summaryA, summaryB]);

  const canCompare = scenarioA && scenarioB && scenarioAId !== scenarioBId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Senaryo Karşılaştırma
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senaryo A</label>
            <Select value={scenarioAId || ''} onValueChange={setScenarioAId}>
              <SelectTrigger>
                <SelectValue placeholder="Senaryo seçin..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id!} disabled={scenario.id === scenarioBId}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senaryo B</label>
            <Select value={scenarioBId || ''} onValueChange={setScenarioBId}>
              <SelectTrigger>
                <SelectValue placeholder="Senaryo seçin..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id!} disabled={scenario.id === scenarioAId}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!canCompare ? (
          <div className="text-center py-8 text-muted-foreground">
            {scenarios.length < 2 ? (
              <p>Karşılaştırma için en az 2 kayıtlı senaryo gerekli.</p>
            ) : (
              <p>Karşılaştırmak için iki farklı senaryo seçin.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Metrik</TableHead>
                <TableHead className="text-right">{scenarioA?.name}</TableHead>
                <TableHead className="text-right">{scenarioB?.name}</TableHead>
                <TableHead className="text-right w-[120px]">Fark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => {
                const diff = calculateDiff(metric.scenarioA, metric.scenarioB);
                return (
                  <TableRow key={metric.label}>
                    <TableCell className="font-medium">{metric.label}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatValue(metric.scenarioA, metric.format)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatValue(metric.scenarioB, metric.format)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DiffBadge diff={diff} format={metric.format} higherIsBetter={metric.higherIsBetter} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
