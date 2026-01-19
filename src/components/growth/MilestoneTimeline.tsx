import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimulationScenario } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { 
  Milestone, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Rocket,
  Calendar,
} from 'lucide-react';

interface MilestoneTimelineProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  aiAnalysis?: any;
}

interface TimelineMilestone {
  id: string;
  quarter: string;
  year: number;
  title: string;
  description: string;
  target?: string;
  icon: React.ReactNode;
  type: 'revenue' | 'product' | 'team' | 'market';
  isCompleted: boolean;
}

export function MilestoneTimeline({
  baseScenario,
  growthScenario,
  aiAnalysis,
}: MilestoneTimelineProps) {
  // Milestone'ları oluştur
  const milestones = useMemo((): TimelineMilestone[] => {
    const baseRevenue = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthRevenue = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    
    const baseExpense = baseScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const growthExpense = growthScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const baseProfit = baseRevenue - baseExpense;
    const growthProfit = growthRevenue - growthExpense;
    
    // Çeyreklik hedefler
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const yearDiff = growthScenario.targetYear - baseScenario.targetYear;
    
    const defaultMilestones: TimelineMilestone[] = [
      // Baz yıl sonu
      {
        id: 'base-end',
        quarter: 'Q4',
        year: baseScenario.targetYear,
        title: `${baseScenario.targetYear} Kapanış`,
        description: 'Baz yıl hedeflerinin tamamlanması',
        target: formatCompactUSD(baseRevenue),
        icon: <CheckCircle2 className="h-4 w-4" />,
        type: 'revenue',
        isCompleted: true,
      },
      // Büyüme yılı Q1
      {
        id: 'growth-q1',
        quarter: 'Q1',
        year: growthScenario.targetYear,
        title: 'Büyüme Başlangıcı',
        description: 'Yeni yıl stratejilerinin uygulanmaya başlaması',
        target: formatCompactUSD(growthRevenue * 0.20),
        icon: <Rocket className="h-4 w-4" />,
        type: 'market',
        isCompleted: false,
      },
      // Büyüme yılı Q2
      {
        id: 'growth-q2',
        quarter: 'Q2',
        year: growthScenario.targetYear,
        title: 'Hızlanma Fazı',
        description: 'Satış ve pazarlama aktivitelerinin yoğunlaşması',
        target: formatCompactUSD(growthRevenue * 0.45),
        icon: <TrendingUp className="h-4 w-4" />,
        type: 'revenue',
        isCompleted: false,
      },
      // Büyüme yılı Q3
      {
        id: 'growth-q3',
        quarter: 'Q3',
        year: growthScenario.targetYear,
        title: growthProfit > 0 ? 'Break-Even' : 'Ölçekleme',
        description: growthProfit > 0 
          ? 'Kârlılık hedefine ulaşılması' 
          : 'Büyüme momentum\'unun sürdürülmesi',
        target: formatCompactUSD(growthRevenue * 0.70),
        icon: growthProfit > 0 ? <DollarSign className="h-4 w-4" /> : <Users className="h-4 w-4" />,
        type: growthProfit > 0 ? 'revenue' : 'team',
        isCompleted: false,
      },
      // Büyüme yılı Q4
      {
        id: 'growth-q4',
        quarter: 'Q4',
        year: growthScenario.targetYear,
        title: `${growthScenario.targetYear} Hedef`,
        description: 'Yıllık büyüme hedefinin tamamlanması',
        target: formatCompactUSD(growthRevenue),
        icon: <Target className="h-4 w-4" />,
        type: 'revenue',
        isCompleted: false,
      },
    ];
    
    // AI'dan gelen milestone'lar varsa ekle
    if (aiAnalysis?.milestones) {
      return aiAnalysis.milestones.map((m: any, index: number) => ({
        ...m,
        id: `ai-${index}`,
        icon: getIconForType(m.type),
        isCompleted: false,
      }));
    }
    
    return defaultMilestones;
  }, [baseScenario, growthScenario, aiAnalysis]);
  
  const getIconForType = (type: string) => {
    switch (type) {
      case 'revenue': return <DollarSign className="h-4 w-4" />;
      case 'product': return <Rocket className="h-4 w-4" />;
      case 'team': return <Users className="h-4 w-4" />;
      case 'market': return <TrendingUp className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };
  
  const typeColors = {
    revenue: 'bg-emerald-500',
    product: 'bg-blue-500',
    team: 'bg-purple-500',
    market: 'bg-amber-500',
  };
  
  const typeBadgeColors = {
    revenue: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    product: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    team: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    market: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            Büyüme Yol Haritası
          </CardTitle>
          <CardDescription>
            {baseScenario.targetYear} Q4 → {growthScenario.targetYear} Q4 dönemi için milestone planı
          </CardDescription>
        </CardHeader>
      </Card>
      
      {/* Timeline */}
      <div className="relative">
        {/* Ana çizgi */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Milestone'lar */}
        <div className="space-y-6">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="relative flex gap-4">
              {/* Nokta */}
              <div className={`
                relative z-10 flex items-center justify-center w-16 h-16 rounded-full
                ${milestone.isCompleted 
                  ? 'bg-emerald-500/20 border-2 border-emerald-500' 
                  : 'bg-card border-2 border-border'
                }
              `}>
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${milestone.isCompleted ? 'bg-emerald-500 text-emerald-50' : typeColors[milestone.type] + '/20'}
                `}>
                  {milestone.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className={typeColors[milestone.type].replace('bg-', 'text-')}>
                      {milestone.icon}
                    </span>
                  )}
                </div>
              </div>
              
              {/* İçerik */}
              <Card className={`flex-1 ${milestone.isCompleted ? 'border-emerald-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {milestone.year} {milestone.quarter}
                        </Badge>
                        <Badge variant="outline" className={typeBadgeColors[milestone.type]}>
                          {milestone.type === 'revenue' && 'Gelir'}
                          {milestone.type === 'product' && 'Ürün'}
                          {milestone.type === 'team' && 'Ekip'}
                          {milestone.type === 'market' && 'Pazar'}
                        </Badge>
                      </div>
                      <h3 className="font-medium">{milestone.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                    </div>
                    {milestone.target && (
                      <div className="text-right">
                        <p className="text-lg font-bold">{milestone.target}</p>
                        <p className="text-xs text-muted-foreground">Hedef</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Önerileri */}
      {aiAnalysis?.milestoneRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Milestone Önerileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiAnalysis.milestoneRecommendations.map((rec: any, index: number) => (
                <div key={index} className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Özet */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Target className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="font-medium">
                {growthScenario.targetYear} Q4 Hedefi
              </p>
              <p className="text-2xl font-bold">
                {formatCompactUSD(growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0))}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            <Badge className="bg-emerald-500 text-emerald-50">
              {milestones.filter(m => !m.isCompleted).length} milestone kaldı
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
