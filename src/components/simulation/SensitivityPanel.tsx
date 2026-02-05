/**
 * Sensitivity Panel Component
 * Tornado chart and scenario matrix visualization
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
} from 'lucide-react';
import type { TornadoResult, ScenarioMatrixV2 } from '@/types/simulation';
import { formatCurrency } from '@/lib/formatters';

interface SensitivityPanelProps {
  tornadoResults: TornadoResult[];
  scenarioMatrix?: ScenarioMatrixV2;
  baseValuation: number;
  currency?: 'TRY' | 'USD';
}

export function SensitivityPanel({
  tornadoResults,
  scenarioMatrix,
  baseValuation,
  currency = 'TRY',
}: SensitivityPanelProps) {
  const { t } = useTranslation(['simulation']);

  // Transform tornado data for chart
  const tornadoChartData = useMemo(() => {
    return tornadoResults.map(result => ({
      driver: result.driver,
      lowDelta: result.valuation_at_low - baseValuation,
      highDelta: result.valuation_at_high - baseValuation,
      lowValue: result.valuation_at_low,
      highValue: result.valuation_at_high,
      swing: result.valuation_swing,
    }));
  }, [tornadoResults, baseValuation]);

  // Calculate expected value from matrix
  const expectedMetrics = useMemo(() => {
    if (!scenarioMatrix) return null;
    
    const bullProb = scenarioMatrix.bull.probability ?? 0.25;
    const baseProb = scenarioMatrix.base.probability ?? 0.50;
    const bearProb = scenarioMatrix.bear.probability ?? 0.25;
    
    return {
      expectedValuation:
        scenarioMatrix.bull.valuation * bullProb +
        scenarioMatrix.base.valuation * baseProb +
        scenarioMatrix.bear.valuation * bearProb,
      expectedMOIC:
        scenarioMatrix.bull.moic * bullProb +
        scenarioMatrix.base.moic * baseProb +
        scenarioMatrix.bear.moic * bearProb,
      upside: scenarioMatrix.bull.valuation - scenarioMatrix.base.valuation,
      downside: scenarioMatrix.base.valuation - scenarioMatrix.bear.valuation,
    };
  }, [scenarioMatrix]);

  return (
    <Tabs defaultValue="tornado" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="tornado" className="gap-2">
          <Activity className="h-4 w-4" />
          Tornado
        </TabsTrigger>
        <TabsTrigger value="scenarios" className="gap-2">
          <Target className="h-4 w-4" />
          {t('simulation:sensitivity.scenarios')}
        </TabsTrigger>
      </TabsList>

      {/* Tornado Chart */}
      <TabsContent value="tornado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('simulation:sensitivity.tornadoTitle')}
            </CardTitle>
            <CardDescription>
              {t('simulation:sensitivity.tornadoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tornadoChartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    type="number"
                    tickFormatter={v => formatCurrency(v, currency, true)}
                  />
                  <YAxis
                    type="category"
                    dataKey="driver"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                  <Bar dataKey="lowDelta" stackId="a" name={t('simulation:sensitivity.downside')}>
                    {tornadoChartData.map((_, index) => (
                      <Cell key={`low-${index}`} fill="hsl(var(--destructive))" opacity={0.7} />
                    ))}
                  </Bar>
                  <Bar dataKey="highDelta" stackId="a" name={t('simulation:sensitivity.upside')}>
                    {tornadoChartData.map((_, index) => (
                      <Cell key={`high-${index}`} fill="hsl(var(--primary))" opacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Drivers Summary */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('simulation:sensitivity.topDrivers')}
              </h4>
              {tornadoResults.slice(0, 3).map((result, index) => (
                <div
                  key={result.driver}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{result.driver}</p>
                      <p className="text-sm text-muted-foreground">
                        ±10% → {formatCurrency(result.valuation_swing, currency)} swing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-destructive">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {formatCurrency(result.valuation_at_low, currency, true)}
                    </Badge>
                    <Badge variant="outline" className="text-primary">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {formatCurrency(result.valuation_at_high, currency, true)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Scenario Matrix */}
      <TabsContent value="scenarios" className="space-y-4">
        {scenarioMatrix ? (
          <>
            {/* Scenario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bear Case */}
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    {t('simulation:sensitivity.bearCase')}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {((scenarioMatrix.bear.probability ?? 0.25) * 100).toFixed(0)}% {t('simulation:sensitivity.probability')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.revenue')}</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(scenarioMatrix.bear.revenue, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.valuation')}</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(scenarioMatrix.bear.valuation, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.runway')}</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.bear.runway_months} {t('simulation:sensitivity.months')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MOIC</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.bear.moic.toFixed(1)}x
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Base Case */}
              <Card className="border-primary/30 ring-2 ring-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t('simulation:sensitivity.baseCase')}
                  </CardTitle>
                  <Badge variant="default" className="w-fit">
                    {((scenarioMatrix.base.probability ?? 0.50) * 100).toFixed(0)}% {t('simulation:sensitivity.probability')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.revenue')}</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(scenarioMatrix.base.revenue, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.valuation')}</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(scenarioMatrix.base.valuation, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.runway')}</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.base.runway_months} {t('simulation:sensitivity.months')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MOIC</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.base.moic.toFixed(1)}x
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bull Case */}
              <Card className="border-emerald-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    {t('simulation:sensitivity.bullCase')}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {((scenarioMatrix.bull.probability ?? 0.25) * 100).toFixed(0)}% {t('simulation:sensitivity.probability')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.revenue')}</p>
                    <p className="text-xl font-bold text-emerald-500">
                      {formatCurrency(scenarioMatrix.bull.revenue, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.valuation')}</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(scenarioMatrix.bull.valuation, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:sensitivity.runway')}</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.bull.runway_months} {t('simulation:sensitivity.months')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MOIC</p>
                    <p className="text-lg font-medium">
                      {scenarioMatrix.bull.moic.toFixed(1)}x
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expected Value Summary */}
            {expectedMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('simulation:sensitivity.expectedValue')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('simulation:sensitivity.expectedValuation')}
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(expectedMetrics.expectedValuation, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('simulation:sensitivity.expectedMOIC')}
                      </p>
                      <p className="text-2xl font-bold">
                        {expectedMetrics.expectedMOIC.toFixed(1)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {t('simulation:sensitivity.upside')}
                      </p>
                      <p className="text-xl font-bold text-emerald-500">
                        +{formatCurrency(expectedMetrics.upside, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        {t('simulation:sensitivity.downside')}
                      </p>
                      <p className="text-xl font-bold text-destructive">
                        -{formatCurrency(expectedMetrics.downside, currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t('simulation:sensitivity.noScenarioData')}
            </p>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default SensitivityPanel;
