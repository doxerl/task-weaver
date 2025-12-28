import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceInput } from '@/components/VoiceInput';
import { PlanTimeline } from '@/components/PlanTimeline';
import { ActualTimeline } from '@/components/ActualTimeline';
import { CompareView } from '@/components/CompareView';
import { QuickChips } from '@/components/QuickChips';
import { useDayData } from '@/hooks/useDayData';
import { LogOut, Settings, Calendar, ChevronLeft, ChevronRight, ClipboardList, CalendarDays } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getISOWeekData } from '@/lib/weekUtils';

export default function Today() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background pb-44 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              {profile?.first_name ? `Merhaba, ${profile.first_name}` : 'Sesli Planlama'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/week')}
              title="Haftalık Görünüm"
            >
              <CalendarDays className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/review/' + format(selectedDate, 'yyyy-MM-dd'))}
              title="Gün İnceleme"
            >
              <ClipboardList className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/settings')}
              title="Ayarlar"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Date Navigation */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="container flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <span className="text-xs text-muted-foreground block">
              {weekNumber}. Hafta {weekYear}
            </span>
            <button 
              onClick={handleToday}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors"
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
            <TabsTrigger value="plan">
              Plan ({planItems.length})
            </TabsTrigger>
            <TabsTrigger value="actual">
              Gerçekleşen ({actualEntries.length})
            </TabsTrigger>
            <TabsTrigger value="compare">
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

      {/* Floating Input Area - Mobile Optimized */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card p-4 shadow-lg">
        <div className="container">
          <div className="mb-2 flex gap-2">
            <Button
              variant={inputMode === 'plan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('plan')}
              className="flex-1 md:flex-none"
            >
              Plan Ekle
            </Button>
            <Button
              variant={inputMode === 'actual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('actual')}
              className="flex-1 md:flex-none"
            >
              Şu An / Az Önce
            </Button>
          </div>
          
          <VoiceInput 
            mode={inputMode} 
            date={selectedDate}
            onSuccess={refetch}
          />
          
          <QuickChips 
            mode={inputMode}
            date={selectedDate}
            onSuccess={refetch}
          />
        </div>
      </div>
    </div>
  );
}
