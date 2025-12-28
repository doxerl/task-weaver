import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Clock, Lightbulb } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useDayData } from '@/hooks/useDayData';
import { Progress } from '@/components/ui/progress';

type Step = 'summary' | 'gaps' | 'suggestions';

export default function Review() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const [currentStep, setCurrentStep] = useState<Step>('summary');
  
  const selectedDate = date ? parseISO(date) : new Date();
  const { planItems, actualEntries, loading: isLoading } = useDayData(selectedDate);

  const steps: Step[] = ['summary', 'gaps', 'suggestions'];
  const currentIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Calculate stats
  const totalPlanned = planItems.length;
  const totalActual = actualEntries.length;
  const completionRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  // Find gaps (plan items without matching actual entries)
  const gaps = planItems.filter(plan => {
    const hasMatch = actualEntries.some(actual => 
      actual.title.toLowerCase().includes(plan.title.toLowerCase()) ||
      plan.title.toLowerCase().includes(actual.title.toLowerCase())
    );
    return !hasMatch;
  });

  // Find unplanned activities
  const unplanned = actualEntries.filter(actual => {
    const hasMatch = planItems.some(plan => 
      actual.title.toLowerCase().includes(plan.title.toLowerCase()) ||
      plan.title.toLowerCase().includes(actual.title.toLowerCase())
    );
    return !hasMatch;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/today')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <h1 className="text-xl font-semibold">
            {format(selectedDate, 'd MMMM yyyy', { locale: tr })} - Gün Değerlendirmesi
          </h1>
          <div className="w-20" />
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div 
                key={step}
                className={`flex items-center gap-2 text-sm ${
                  index <= currentIndex ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentIndex 
                      ? 'bg-primary/20 text-primary border-2 border-primary' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className="hidden sm:inline">
                  {step === 'summary' && 'Özet'}
                  {step === 'gaps' && 'Boşluklar'}
                  {step === 'suggestions' && 'Öneriler'}
                </span>
              </div>
            ))}
          </div>
          <Progress value={(currentIndex + 1) / steps.length * 100} className="h-2" />
        </div>

        {/* Step Content */}
        {currentStep === 'summary' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Günün Özeti
              </CardTitle>
              <CardDescription>
                Planlanan ve gerçekleşen aktivitelerinizin karşılaştırması
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{totalPlanned}</div>
                  <div className="text-sm text-muted-foreground">Planlanan</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondary-foreground">{totalActual}</div>
                  <div className="text-sm text-muted-foreground">Gerçekleşen</div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Tamamlanma Oranı</span>
                  <span className="text-sm font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-3" />
              </div>

              {gaps.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    {gaps.length} eksik aktivite tespit edildi
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sonraki adımda detayları göreceksiniz.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 'gaps' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Boşluk Analizi
              </CardTitle>
              <CardDescription>
                Planlanıp yapılmayan ve plansız yapılan aktiviteler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {gaps.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-destructive">Yapılmayan Planlar ({gaps.length})</h3>
                  <div className="space-y-2">
                    {gaps.map(item => (
                      <div key={item.id} className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.start_at), 'HH:mm')} - {format(new Date(item.end_at), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unplanned.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-amber-600">Plansız Aktiviteler ({unplanned.length})</h3>
                  <div className="space-y-2">
                    {unplanned.map(item => (
                      <div key={item.id} className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.start_at), 'HH:mm')} - {format(new Date(item.end_at), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gaps.length === 0 && unplanned.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p>Tebrikler! Tüm planlarınızı gerçekleştirmişsiniz.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 'suggestions' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Yarın İçin Öneriler
              </CardTitle>
              <CardDescription>
                Bugünün analizine göre yarın için öneriler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gaps.length > 0 && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📋 Ertelenen Görevler</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Bugün yapamadığınız görevleri yarına eklemek ister misiniz?
                  </p>
                  <div className="space-y-2">
                    {gaps.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">⏰ Zaman Yönetimi</h4>
                <p className="text-sm text-muted-foreground">
                  {completionRate >= 80 
                    ? "Harika bir gündü! Bu tempoyu korumaya devam edin."
                    : completionRate >= 50
                      ? "Ortalama bir performans. Yarın önceliklendirmeye daha fazla dikkat edin."
                      : "Düşük tamamlanma oranı. Daha az ama odaklı planlar yapmayı deneyin."}
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">💡 İpucu</h4>
                <p className="text-sm text-muted-foreground">
                  En verimli olduğunuz saatlerde en önemli işleri planlayın.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          
          {currentIndex < steps.length - 1 ? (
            <Button onClick={handleNext}>
              İleri
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => navigate('/today')}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Tamamla
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
