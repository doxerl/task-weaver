import { useState } from 'react';
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
import { useDayData } from '@/hooks/useDayData';
import { LogOut, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getISOWeekData } from '@/lib/weekUtils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Today() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuthContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputMode, setInputMode] = useState<'plan' | 'actual'>('plan');
  
  const { planItems, actualEntries, loading, refetch } = useDayData(selectedDate);
  const { weekNumber, weekYear } = getISOWeekData(selectedDate);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Çıkış yapıldı');
    navigate('/auth');
  };

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

  return (
    <div className="min-h-screen bg-background pb-36 md:pb-36">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground text-sm md:text-base truncate max-w-[150px] md:max-w-none">
              {profile?.first_name ? `Merhaba, ${profile.first_name}` : 'Sesli Planlama'}
            </span>
          </div>
          
          {/* Logout button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut}
            title="Çıkış Yap"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

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
