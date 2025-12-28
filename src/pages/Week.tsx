import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Settings, LogOut, Download } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useWeekData } from '@/hooks/useWeekData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Week() {
  const navigate = useNavigate();
  const { profile, signOut, session } = useAuthContext();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [exporting, setExporting] = useState(false);
  
  const { weekData, loading } = useWeekData(currentWeekStart);

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExport = async () => {
    if (!session) {
      toast({ title: 'Lütfen önce giriş yapın', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-week', {
        body: { 
          weekStart: currentWeekStart.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (error) throw error;

      // Download Plan CSV
      if (data.planCsv) {
        const planBlob = new Blob([data.planCsv], { type: 'text/csv;charset=utf-8;' });
        const planUrl = URL.createObjectURL(planBlob);
        const planLink = document.createElement('a');
        planLink.href = planUrl;
        planLink.download = `${data.filename}_plan.csv`;
        planLink.click();
        URL.revokeObjectURL(planUrl);
      }

      // Download Actual CSV
      if (data.actualCsv) {
        const actualBlob = new Blob([data.actualCsv], { type: 'text/csv;charset=utf-8;' });
        const actualUrl = URL.createObjectURL(actualBlob);
        const actualLink = document.createElement('a');
        actualLink.href = actualUrl;
        actualLink.download = `${data.filename}_kayit.csv`;
        actualLink.click();
        URL.revokeObjectURL(actualUrl);
      }

      toast({ 
        title: 'Export başarılı', 
        description: `${data.planCount} plan, ${data.actualCount} kayıt indirildi` 
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export başarısız', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDayClick = (date: Date) => {
    navigate(`/today?date=${format(date, 'yyyy-MM-dd')}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              Merhaba, {profile?.first_name || 'Kullanıcı'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'İndiriliyor...' : 'Excel Export'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/today')}>
              <Calendar className="h-4 w-4 mr-2" />
              Bugün
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto py-6 px-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentWeek && (
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                Bu Hafta
              </Button>
            )}
          </div>
          
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, 'd MMM', { locale: tr })} - {format(weekEnd, 'd MMM yyyy', { locale: tr })}
          </h2>
          
          <div className="w-32" />
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekData.map((day) => {
            const dayIsToday = isToday(day.date);
            const totalPlanned = day.planItems.length;
            const totalActual = day.actualEntries.length;
            
            return (
              <Card 
                key={day.date.toISOString()}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  dayIsToday ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleDayClick(day.date)}
              >
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className={dayIsToday ? 'text-primary font-bold' : ''}>
                      {format(day.date, 'EEE', { locale: tr })}
                    </span>
                    <span className={`text-lg ${dayIsToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {format(day.date, 'd')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex gap-1 mb-2">
                    {totalPlanned > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {totalPlanned} plan
                      </Badge>
                    )}
                    {totalActual > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalActual} kayıt
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1">
                      {day.planItems.slice(0, 5).map(item => (
                        <div 
                          key={item.id} 
                          className="text-xs p-1.5 rounded bg-primary/10 truncate"
                          title={item.title}
                        >
                          <span className="text-muted-foreground">
                            {format(new Date(item.start_at), 'HH:mm')}
                          </span>
                          {' '}
                          {item.title}
                        </div>
                      ))}
                      {day.planItems.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{day.planItems.length - 5} daha
                        </div>
                      )}
                      {day.planItems.length === 0 && day.actualEntries.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">
                          Boş
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {weekData.reduce((sum, day) => sum + day.planItems.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Toplam Plan</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary-foreground">
                  {weekData.reduce((sum, day) => sum + day.actualEntries.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Toplam Kayıt</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {weekData.filter(day => day.planItems.length > 0 || day.actualEntries.length > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">Aktif Gün</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
