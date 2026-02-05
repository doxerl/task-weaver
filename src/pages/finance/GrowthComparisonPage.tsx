import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Loader2,
  Sparkles,
  Calendar,
  Target,
  DollarSign,
  BarChart3,
  Milestone,
  FileDown,
} from 'lucide-react';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { useGrowthAnalysis } from '@/hooks/finance/useGrowthAnalysis';
import { YearOverYearGrowthChart } from '@/components/growth/YearOverYearGrowthChart';
import { ProjectGrowthAnalysis } from '@/components/growth/ProjectGrowthAnalysis';
import { GrowthROICard } from '@/components/growth/GrowthROICard';
import { MilestoneTimeline } from '@/components/growth/MilestoneTimeline';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import {
  PDF_CONTAINER_STYLE,
  PDF_HIDDEN_CONTAINER_STYLE,
} from '@/styles/pdfExport';
import { PdfGrowthAnalysisPage } from '@/components/simulation/pdf/PdfGrowthAnalysisPage';
import { PdfMilestoneTimelinePage } from '@/components/simulation/pdf/PdfMilestoneTimelinePage';

function GrowthComparisonContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { scenarios, isLoading: scenariosLoading } = useScenarios();
  const { generatePdfFromElement, isGenerating } = usePdfEngine();
  const growthPdfRef = useRef<HTMLDivElement>(null);
  
  // URL'den base ve growth senaryo ID'lerini al
  const urlBaseId = searchParams.get('base');
  const urlGrowthId = searchParams.get('growth');
  
  const [baseScenarioId, setBaseScenarioId] = useState<string | null>(urlBaseId);
  const [growthScenarioId, setGrowthScenarioId] = useState<string | null>(urlGrowthId);
  const [activeTab, setActiveTab] = useState('overview');
  
  // URL'den gelen değerleri senkronize et
  useEffect(() => {
    if (urlBaseId && urlBaseId !== baseScenarioId) {
      setBaseScenarioId(urlBaseId);
    }
    if (urlGrowthId && urlGrowthId !== growthScenarioId) {
      setGrowthScenarioId(urlGrowthId);
    }
  }, [urlBaseId, urlGrowthId]);
  
  // Senaryo objelerini bul
  const baseScenario = useMemo(() => 
    scenarios.find(s => s.id === baseScenarioId) || null,
    [scenarios, baseScenarioId]
  );
  
  const growthScenario = useMemo(() => 
    scenarios.find(s => s.id === growthScenarioId) || null,
    [scenarios, growthScenarioId]
  );
  
  // Growth Analysis Hook
  const {
    analysis,
    isLoading: analysisLoading,
    error: analysisError,
    runAnalysis,
    cachedInfo,
    dataChanged,
  } = useGrowthAnalysis(baseScenario, growthScenario);
  
  // Otomatik senaryo eşleştirme - farklı yıllardaki senaryoları bul
  useEffect(() => {
    if (!scenariosLoading && scenarios.length >= 2 && !baseScenarioId && !growthScenarioId) {
      // Yıllarına göre sırala
      const sortedByYear = [...scenarios].sort((a, b) => 
        (a.targetYear || 0) - (b.targetYear || 0)
      );
      
      // En düşük yıl = base, en yüksek yıl = growth
      const base = sortedByYear[0];
      const growth = sortedByYear[sortedByYear.length - 1];
      
      if (base && growth && base.id !== growth.id && base.targetYear !== growth.targetYear) {
        setBaseScenarioId(base.id);
        setGrowthScenarioId(growth.id);
      }
    }
  }, [scenarios, scenariosLoading, baseScenarioId, growthScenarioId]);
  
  const handleAnalyze = useCallback(() => {
    if (!baseScenario || !growthScenario) {
      toast.error('Lütfen iki senaryo seçin');
      return;
    }
    runAnalysis();
  }, [baseScenario, growthScenario, runAnalysis]);
  
  // PDF Export Handler
  const handleExportPdf = useCallback(async () => {
    if (!baseScenario || !growthScenario || !growthPdfRef.current) {
      toast.error('PDF oluşturmak için senaryo seçin');
      return;
    }
    
    try {
      toast.loading('PDF oluşturuluyor...', { id: 'growth-pdf' });
      
      const success = await generatePdfFromElement(growthPdfRef, {
        filename: `Buyume_Raporu_${baseScenario.targetYear}-${growthScenario.targetYear}.pdf`,
        orientation: 'landscape',
        fitToPage: true,
      });
      
      if (success) {
        toast.success('PDF başarıyla oluşturuldu', { id: 'growth-pdf' });
      } else {
        toast.error('PDF oluşturulamadı', { id: 'growth-pdf' });
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF oluşturulurken hata oluştu', { id: 'growth-pdf' });
    }
  }, [baseScenario, growthScenario, generatePdfFromElement]);
  
  // Loading state
  if (scenariosLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  
  // Yeterli senaryo yok
  if (scenarios.length < 2) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Büyüme Analizi</h1>
        </div>
        <Card className="p-8 text-center">
          <CardTitle className="mb-4">Yeterli Senaryo Yok</CardTitle>
          <CardDescription className="mb-6">
            Büyüme analizi için farklı yıllara ait en az 2 senaryo gereklidir.
          </CardDescription>
          <Button onClick={() => navigate('/finance/simulation')}>
            Senaryo Oluştur
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Büyüme Projeksiyonu"
        subtitle="Yıllar arası büyüme analizi ve ROI projeksiyonu"
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        backPath="/finance/simulation"
        backLabel="Simülasyon"
        badge={cachedInfo && (
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Son analiz: {format(cachedInfo.updatedAt, 'dd MMM HH:mm', { locale: tr })}
          </Badge>
        )}
      />
      
      <div className="container mx-auto p-4 space-y-6">
      
      {/* Scenario Selectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Senaryo Seçimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Base Scenario */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Baz Yıl {baseScenario?.targetYear ? `(${baseScenario.targetYear})` : ''}
              </label>
              <Select value={baseScenarioId || ''} onValueChange={setBaseScenarioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Baz senaryo seçin" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios
                    .filter(s => s.id !== growthScenarioId)
                    .sort((a, b) => (a.targetYear || 0) - (b.targetYear || 0))
                    .map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        <span className="font-medium">{scenario.targetYear}</span>
                        <span className="text-muted-foreground ml-2">- {scenario.name}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-px w-8 bg-border" />
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="h-px w-8 bg-border" />
              </div>
            </div>
            
            {/* Growth Scenario */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Hedef Yıl {growthScenario?.targetYear ? `(${growthScenario.targetYear})` : ''}
              </label>
              <Select value={growthScenarioId || ''} onValueChange={setGrowthScenarioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Büyüme senaryosu seçin" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios
                    .filter(s => s.id !== baseScenarioId)
                    .sort((a, b) => (a.targetYear || 0) - (b.targetYear || 0))
                    .map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        <span className="font-medium">{scenario.targetYear}</span>
                        <span className="text-muted-foreground ml-2">- {scenario.name}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <Button 
              onClick={handleExportPdf}
              disabled={!baseScenario || !growthScenario || isGenerating}
              variant="outline"
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              PDF İndir
            </Button>
            <Button 
              onClick={handleAnalyze}
              disabled={!baseScenario || !growthScenario || analysisLoading}
              className="gap-2"
            >
              {analysisLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {dataChanged ? 'Yeniden Analiz Et' : 'AI ile Analiz Et'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      {baseScenario && growthScenario ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview" className="gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Genel</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Projeler</span>
            </TabsTrigger>
            <TabsTrigger value="roi" className="gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">ROI</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-1">
              <Milestone className="h-4 w-4" />
              <span className="hidden sm:inline">Roadmap</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <YearOverYearGrowthChart
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              aiAnalysis={analysis}
            />
          </TabsContent>
          
          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <ProjectGrowthAnalysis
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              aiAnalysis={analysis}
            />
          </TabsContent>
          
          {/* ROI Tab */}
          <TabsContent value="roi" className="space-y-6">
            <GrowthROICard
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              aiAnalysis={analysis}
            />
          </TabsContent>
          
          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <MilestoneTimeline
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              aiAnalysis={analysis}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <CardDescription>
            Büyüme analizi için yukarıdan baz yıl ve hedef yıl senaryolarını seçin.
          </CardDescription>
        </Card>
      )}
      </div>
      
      {/* Hidden PDF Container */}
      {baseScenario && growthScenario && (
        <div
          ref={growthPdfRef}
          className="pdf-hidden-container"
          style={PDF_HIDDEN_CONTAINER_STYLE}
        >
          <div style={PDF_CONTAINER_STYLE}>
            <PdfGrowthAnalysisPage
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              analysis={analysis}
            />
            <PdfMilestoneTimelinePage
              baseScenario={baseScenario}
              growthScenario={growthScenario}
              analysis={analysis}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function GrowthComparisonPage() {
  return (
    <CurrencyProvider defaultYear={new Date().getFullYear()}>
      <GrowthComparisonContent />
    </CurrencyProvider>
  );
}
