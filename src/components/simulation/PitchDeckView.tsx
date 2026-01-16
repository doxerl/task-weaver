import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Presentation,
  MessageSquare,
  FileText,
  Rocket,
  AlertTriangle,
  DollarSign,
  Calculator,
  Users
} from 'lucide-react';
import { PitchDeck, PitchSlide } from '@/types/simulation';
import { toast } from 'sonner';

interface PitchDeckViewProps {
  pitchDeck: PitchDeck;
  onClose?: () => void;
}

const slideIcons: Record<number, React.ReactNode> = {
  1: <Rocket className="h-5 w-5" />,
  2: <AlertTriangle className="h-5 w-5" />,
  3: <DollarSign className="h-5 w-5" />,
  4: <Calculator className="h-5 w-5" />,
  5: <Users className="h-5 w-5" />
};

const slideColors: Record<number, string> = {
  1: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  2: 'from-red-500/20 to-orange-500/20 border-red-500/30',
  3: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  4: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  5: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30'
};

export function PitchDeckView({ pitchDeck, onClose }: PitchDeckViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  const slides = pitchDeck.slides || [];
  const slide = slides[currentSlide];

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleCopyExecutiveSummary = async () => {
    try {
      await navigator.clipboard.writeText(pitchDeck.executive_summary);
      setCopied(true);
      toast.success('Executive summary kopyalandı!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopyalama başarısız');
    }
  };

  if (!slides.length) {
    return (
      <Card className="p-8 text-center">
        <Presentation className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Henüz pitch deck oluşturulmadı</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slide Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <span className="font-medium">Yatırımcı Sunumu</span>
          <Badge variant="secondary" className="ml-2">
            {currentSlide + 1} / {slides.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showSpeakerNotes ? 'Notları Gizle' : 'Konuşmacı Notları'}
          </Button>
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`flex-shrink-0 w-20 h-14 rounded-lg border-2 transition-all ${
              index === currentSlide
                ? 'border-primary bg-primary/10'
                : 'border-border/50 bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full gap-1">
              {slideIcons[s.slide_number] || <FileText className="h-4 w-4" />}
              <span className="text-[10px] text-muted-foreground">{s.slide_number}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Current Slide */}
      {slide && (
        <Card className={`bg-gradient-to-br ${slideColors[slide.slide_number] || 'from-card to-card'} border`}>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background/80 rounded-lg">
                {slideIcons[slide.slide_number] || <FileText className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{slide.title}</CardTitle>
                <CardDescription className="mt-1 text-base font-medium text-foreground/80">
                  {slide.key_message}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {slide.content_bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="flex-1">{bullet}</span>
                </li>
              ))}
            </ul>

            {showSpeakerNotes && (
              <>
                <Separator />
                <div className="bg-background/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Konuşmacı Notları
                  </div>
                  <p className="text-sm italic">{slide.speaker_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Önceki
        </Button>
        <div className="flex gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
          className="gap-2"
        >
          Sonraki
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Executive Summary
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyExecutiveSummary}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopyala
                </>
              )}
            </Button>
          </div>
          <CardDescription>Yatırımcıya gönderilecek e-posta özeti</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <p className="text-sm leading-relaxed">{pitchDeck.executive_summary}</p>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
