import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Plus,
  Trash2,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye
} from 'lucide-react';
import { PitchSlide } from '@/types/simulation';
import { cn } from '@/lib/utils';

interface PitchDeckEditorProps {
  slides: PitchSlide[];
  executiveSummary: string;
  onSlideChange: (index: number, field: keyof PitchSlide | 'content_bullets', value: string | string[]) => void;
  onExecutiveSummaryChange: (value: string) => void;
  onExportPPT?: () => void;
  onAddBullet?: (slideIndex: number) => void;
  onRemoveBullet?: (slideIndex: number, bulletIndex: number) => void;
}

export const PitchDeckEditor = ({
  slides,
  executiveSummary,
  onSlideChange,
  onExecutiveSummaryChange,
  onExportPPT,
  onAddBullet,
  onRemoveBullet
}: PitchDeckEditorProps) => {
  const { t } = useTranslation(['simulation', 'common']);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentSlide = slides[activeSlide];

  const handleBulletChange = (bulletIndex: number, value: string) => {
    const newBullets = [...(currentSlide?.content_bullets || [])];
    newBullets[bulletIndex] = value;
    onSlideChange(activeSlide, 'content_bullets', newBullets);
  };

  const slideTypeLabels: Record<number, string> = {
    1: 'THE HOOK',
    2: 'DEATH VALLEY',
    3: 'USE OF FUNDS',
    4: 'THE MATH',
    5: 'THE EXIT'
  };

  if (!slides || slides.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('simulation:pitchDeck.noPitchDeck')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('simulation:pitchDeck.runAiFirst')}
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Mode Toggle & Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isPreviewMode ? "outline" : "default"}
            size="sm"
            onClick={() => setIsPreviewMode(false)}
            className="gap-1"
          >
            <Edit2 className="h-3 w-3" />
            {t('simulation:pitchDeck.edit')}
          </Button>
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreviewMode(true)}
            className="gap-1"
          >
            <Eye className="h-3 w-3" />
            {t('simulation:pitchDeck.preview')}
          </Button>
        </div>
        {onExportPPT && (
          <Button onClick={onExportPPT} size="sm" className="gap-1">
            <Download className="h-3 w-3" />
            {t('simulation:pitchDeck.downloadPowerpoint')}
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Slide Thumbnails */}
        <div className="col-span-3 space-y-2">
          <ScrollArea className="h-[400px]">
            {slides.map((slide, index) => (
              <Card 
                key={index}
                className={cn(
                  "p-3 cursor-pointer transition-all mb-2",
                  "hover:bg-accent/50 hover:border-primary/30",
                  activeSlide === index && "border-primary bg-accent/30"
                )}
                onClick={() => setActiveSlide(index)}
              >
                <div className="flex items-start gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] shrink-0",
                      activeSlide === index && "bg-primary text-primary-foreground"
                    )}
                  >
                    {slide.slide_number}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{slide.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {slideTypeLabels[slide.slide_number] || t('simulation:pitchDeck.slide')}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Executive Summary Card */}
            <Card 
              className={cn(
                "p-3 cursor-pointer transition-all mt-4",
                "hover:bg-accent/50 hover:border-primary/30",
                activeSlide === -1 && "border-primary bg-accent/30"
              )}
              onClick={() => setActiveSlide(-1)}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">📧</Badge>
                <p className="text-xs font-medium">Executive Summary</p>
              </div>
            </Card>
          </ScrollArea>
        </div>
        
        {/* Right: Slide Editor / Preview */}
        <div className="col-span-9">
          {activeSlide === -1 ? (
            /* Executive Summary Editor */
            <Card className="p-4">
              <Label className="text-sm font-medium mb-2 block">{t('simulation:pitchDeck.executiveSummary')}</Label>
              <p className="text-xs text-muted-foreground mb-3">
                {t('simulation:pitchDeck.emailSummaryDescription')}
              </p>
              {isPreviewMode ? (
                <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                  {executiveSummary}
                </div>
              ) : (
                <Textarea
                  value={executiveSummary}
                  onChange={(e) => onExecutiveSummaryChange(e.target.value)}
                  rows={8}
                  className="text-sm"
                  placeholder={t('simulation:pitchDeck.emailSummaryPlaceholder')}
                />
              )}
            </Card>
          ) : currentSlide ? (
            /* Slide Editor / Preview */
            <Card className="p-4">
              {isPreviewMode ? (
                /* Preview Mode */
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6">
                    <Badge className="mb-3">{slideTypeLabels[currentSlide.slide_number]}</Badge>
                    <h2 className="text-xl font-bold mb-2">{currentSlide.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{currentSlide.key_message}</p>
                    <ul className="space-y-2">
                      {currentSlide.content_bullets?.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary">•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('simulation:pitchDeck.speakerNotes')}:</p>
                    <p className="text-sm">{currentSlide.speaker_notes}</p>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {t('simulation:pitchDeck.slide')} {currentSlide.slide_number} - {slideTypeLabels[currentSlide.slide_number]}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-xs">{t('simulation:pitchDeck.slideTitle')}</Label>
                    <Input
                      value={currentSlide.title}
                      onChange={(e) => onSlideChange(activeSlide, 'title', e.target.value)}
                      className="mt-1"
                      placeholder={t('simulation:pitchDeck.slideTitlePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">{t('simulation:pitchDeck.keyMessage')}</Label>
                    <Textarea
                      value={currentSlide.key_message}
                      onChange={(e) => onSlideChange(activeSlide, 'key_message', e.target.value)}
                      rows={2}
                      className="mt-1"
                      placeholder={t('simulation:pitchDeck.keyMessagePlaceholder')}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{t('simulation:pitchDeck.contentItems')}</Label>
                      {onAddBullet && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddBullet(activeSlide)}
                          className="h-6 text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          {t('simulation:pitchDeck.addItem')}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {currentSlide.content_bullets?.map((bullet, bIndex) => (
                        <div key={bIndex} className="flex items-center gap-2">
                          <Input
                            value={bullet}
                            onChange={(e) => handleBulletChange(bIndex, e.target.value)}
                            className="flex-1"
                            placeholder={`${t('simulation:pitchDeck.item')} ${bIndex + 1}...`}
                          />
                          {onRemoveBullet && currentSlide.content_bullets.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveBullet(activeSlide, bIndex)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">{t('simulation:pitchDeck.speakerNotes')}</Label>
                    <Textarea
                      value={currentSlide.speaker_notes}
                      onChange={(e) => onSlideChange(activeSlide, 'speaker_notes', e.target.value)}
                      rows={3}
                      className="mt-1"
                      placeholder={t('simulation:pitchDeck.speakerNotesPlaceholder')}
                    />
                  </div>
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeSlide === 0}
                  onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('simulation:pitchDeck.previous')}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {activeSlide + 1} / {slides.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeSlide === slides.length - 1}
                  onClick={() => setActiveSlide(prev => Math.min(slides.length - 1, prev + 1))}
                  className="gap-1"
                >
                  {t('simulation:pitchDeck.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
