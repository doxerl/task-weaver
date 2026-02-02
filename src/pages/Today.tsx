import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceInput } from '@/components/VoiceInput';
import { PlanTimeline } from '@/components/PlanTimeline';
import { ActualTimeline } from '@/components/ActualTimeline';
import { CompareView } from '@/components/CompareView';
import { QuickChips } from '@/components/QuickChips';
import { MobileInputSheet } from '@/components/MobileInputSheet';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AppHeader } from '@/components/AppHeader';
import { useDayData } from '@/hooks/useDayData';
import { Settings, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { getISOWeekData } from '@/lib/weekUtils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Today() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile } = useAuthContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputMode, setInputMode] = useState<'plan' | 'actual'>('plan');
  
  const { planItems, actualEntries, loading, refetch } = useDayData(selectedDate);
  const { weekNumber, weekYear } = getISOWeekData(selectedDate);


  const handlePrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isPastDay = format(selectedDate, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');

  // Geçmiş gün için otomatik "gerçekleşen" moduna geç
  useEffect(() => {
    if (isPastDay) {
      setInputMode('actual');
    }
  }, [isPastDay]);

  return (
    <div className="min-h-screen bg-background pb-36 md:pb-72">
      <AppHeader
        title={profile?.first_name ? `Merhaba, ${profile.first_name}` : 'Sesli Planlama'}
        icon={<Calendar className="h-5 w-5 text-primary" />}
        rightContent={
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')}
            title="Ayarlar"
          >
            <Settings className="h-5 w-5" />
          </Button>
        }
      />

      {/* Date Navigation */}
      <div className="border-b bg-muted/30 px-4 py-2 md:py-3">
        <div className="container flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <span className="text-sm text-muted-foreground block">
              {weekNumber}. Hafta {weekYear}
            </span>
            <button 
              onClick={handleToday}
              className="text-base md:text-lg font-medium text-foreground hover:text-primary transition-colors"
            >
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </button>
            {!isToday && (
              <p className="text-xs text-muted-foreground">Bugüne dönmek için tıklayın</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Geçmiş gün uyarısı */}
      {isPastDay && (
        <div className="mx-4 mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            {format(selectedDate, 'd MMMM', { locale: tr })} için kayıt ekliyorsunuz. 
            Lütfen saat belirtin (örn: "Sabah 9'da toplantı yaptım")
          </p>
        </div>
      )}

      {/* Main Content Tabs */}
      <main className="container px-4 py-4">
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="plan" className="text-sm">
              Plan ({planItems.length})
            </TabsTrigger>
            <TabsTrigger value="actual" className="text-sm">
              Gerçek ({actualEntries.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-sm">
              Karşılaştır
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            <PlanTimeline 
              items={planItems} 
              loading={loading}
              onUpdate={refetch}
            />
          </TabsContent>

          <TabsContent value="actual">
            <ActualTimeline 
              entries={actualEntries}
              planItems={planItems}
              loading={loading}
              onUpdate={refetch}
            />
          </TabsContent>

          <TabsContent value="compare">
            <CompareView 
              planItems={planItems}
              actualEntries={actualEntries}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile: Bottom Sheet Pattern */}
      {isMobile && (
        <MobileInputSheet
          mode={inputMode}
          onModeChange={setInputMode}
          date={selectedDate}
          onSuccess={refetch}
          existingPlans={planItems.map(p => ({
            id: p.id,
            title: p.title,
            startAt: format(new Date(p.start_at), "yyyy-MM-dd'T'HH:mm:ssXXX"),
            endAt: format(new Date(p.end_at), "yyyy-MM-dd'T'HH:mm:ssXXX"),
            type: p.type || 'task'
          }))}
        />
      )}

      {/* Desktop: Fixed Input Area */}
      {!isMobile && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-card p-4 shadow-lg">
          <div className="container">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1 flex-1">
                <Button
                  variant={inputMode === 'plan' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('plan')}
                  disabled={isPastDay}
                  className="flex-1 h-9 text-sm"
                >
                  Plan
                </Button>
                <Button
                  variant={inputMode === 'actual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('actual')}
                  className="flex-1 h-9 text-sm"
                >
                  Gerçek
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {inputMode === 'plan' ? 'Ne yapacaksın?' : 'Ne yaptın?'}
              </span>
            </div>
            
            <VoiceInput 
              mode={inputMode} 
              date={selectedDate}
              onSuccess={refetch}
              existingPlans={planItems.map(p => ({
                id: p.id,
                title: p.title,
                startAt: format(new Date(p.start_at), "yyyy-MM-dd'T'HH:mm:ssXXX"),
                endAt: format(new Date(p.end_at), "yyyy-MM-dd'T'HH:mm:ssXXX"),
                type: p.type || 'task'
              }))}
            />
            
            {/* Quick Chips */}
            <div className="mt-2">
              <QuickChips 
                mode={inputMode}
                date={selectedDate}
                onSuccess={refetch}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
