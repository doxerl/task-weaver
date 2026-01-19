import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SimulationScenario, ProjectionItem } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Target, Layers } from 'lucide-react';

interface ProjectGrowthAnalysisProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  aiAnalysis?: any;
}

interface ProjectGrowth {
  category: string;
  baseAmount: number;
  growthAmount: number;
  growthRate: number;
  baseShare: number;
  growthShare: number;
  contribution: number; // Toplam büyümeye katkı
}

export function ProjectGrowthAnalysis({
  baseScenario,
  growthScenario,
  aiAnalysis,
}: ProjectGrowthAnalysisProps) {
  // Proje bazlı büyüme analizi
  const projectGrowth = useMemo((): ProjectGrowth[] => {
    const baseTotal = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthTotal = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const totalGrowth = growthTotal - baseTotal;
    
    // Kategorileri eşleştir
    const categories = new Set([
      ...baseScenario.revenues.map(r => r.category),
      ...growthScenario.revenues.map(r => r.category),
    ]);
    
    return Array.from(categories).map(category => {
      const baseItem = baseScenario.revenues.find(r => r.category === category);
      const growthItem = growthScenario.revenues.find(r => r.category === category);
      
      const baseAmount = baseItem?.projectedAmount || 0;
      const growthAmount = growthItem?.projectedAmount || 0;
      const itemGrowth = growthAmount - baseAmount;
      
      return {
        category,
        baseAmount,
        growthAmount,
        growthRate: baseAmount > 0 ? ((growthAmount - baseAmount) / baseAmount) * 100 : growthAmount > 0 ? 100 : 0,
        baseShare: baseTotal > 0 ? (baseAmount / baseTotal) * 100 : 0,
        growthShare: growthTotal > 0 ? (growthAmount / growthTotal) * 100 : 0,
        contribution: totalGrowth > 0 ? (itemGrowth / totalGrowth) * 100 : 0,
      };
    }).sort((a, b) => b.contribution - a.contribution);
  }, [baseScenario, growthScenario]);
  
  // Toplam metrikler
  const totals = useMemo(() => {
    const baseTotal = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthTotal = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    
    return {
      baseTotal,
      growthTotal,
      totalGrowth: growthTotal - baseTotal,
      growthRate: baseTotal > 0 ? ((growthTotal - baseTotal) / baseTotal) * 100 : 0,
    };
  }, [baseScenario, growthScenario]);
  
  // En büyük büyüme katkısı
  const topContributor = projectGrowth[0];
  
  return (
    <div className="space-y-6">
      {/* Özet Kart */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Toplam Gelir Büyümesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {formatCompactUSD(totals.totalGrowth)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCompactUSD(totals.baseTotal)} → {formatCompactUSD(totals.growthTotal)}
              </p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-3 py-1">
              +{totals.growthRate.toFixed(1)}%
            </Badge>
          </div>
          
          {topContributor && (
            <p className="text-xs text-muted-foreground mt-3">
              En büyük katkı: <span className="font-medium text-foreground">{topContributor.category}</span> 
              {' '}(%{topContributor.contribution.toFixed(0)} katkı)
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Proje Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectGrowth.map((project) => (
          <Card key={project.category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{project.category}</CardTitle>
                <Badge 
                  variant="outline" 
                  className={
                    project.growthRate > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : project.growthRate < 0
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {project.growthRate > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : project.growthRate < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : null}
                  {project.growthRate > 0 ? '+' : ''}{project.growthRate.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Değerler */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {baseScenario.targetYear}: {formatCompactUSD(project.baseAmount)}
                </span>
                <span className="font-medium">
                  {growthScenario.targetYear}: {formatCompactUSD(project.growthAmount)}
                </span>
              </div>
              
              {/* Progress Bar - Büyüme Payı */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Gelir Payı</span>
                  <span>{project.baseShare.toFixed(0)}% → {project.growthShare.toFixed(0)}%</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div 
                    className="bg-muted-foreground/30 rounded-l"
                    style={{ width: `${project.baseShare}%` }}
                  />
                  <div 
                    className="bg-emerald-500 rounded-r"
                    style={{ width: `${Math.max(0, project.growthShare - project.baseShare)}%` }}
                  />
                </div>
              </div>
              
              {/* Büyümeye Katkı */}
              {project.contribution > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Büyüme katkısı:</span>
                  <span className="font-medium">%{project.contribution.toFixed(0)}</span>
                  <Progress value={project.contribution} className="flex-1 h-1" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* AI Proje Önerileri */}
      {aiAnalysis?.projectRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Proje Önerileri</CardTitle>
            <CardDescription>
              Büyüme potansiyeli yüksek alanlar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiAnalysis.projectRecommendations.map((rec: any, index: number) => (
                <div key={index} className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  {rec.expectedGrowth && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Beklenen: +{rec.expectedGrowth}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
