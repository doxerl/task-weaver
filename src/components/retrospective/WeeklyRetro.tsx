import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Lightbulb, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyRetroProps {
  whatWorked: string[];
  whatWasHard: string[];
  nextWeekChanges: string[];
  onSave: (data: { whatWorked: string[]; whatWasHard: string[]; nextWeekChanges: string[] }) => void;
  onClose: () => void;
}

const QUICK_SUGGESTIONS = {
  whatWorked: ['Sabah rutini', 'Time-blocking', 'Önceliklendirme', 'Molalar', 'Erken başlama'],
  whatWasHard: ['Kesintiler', 'Toplantılar', 'Enerji düşüklüğü', 'Belirsiz görevler', 'Erteleme'],
  nextWeekChanges: ['Daha az toplantı', 'Buffer ekle', 'Telefonu kapat', 'Derin çalışma blokları', 'Hayır deme'],
};

export function WeeklyRetro({ whatWorked, whatWasHard, nextWeekChanges, onSave, onClose }: WeeklyRetroProps) {
  const [worked, setWorked] = useState<string[]>(whatWorked);
  const [hard, setHard] = useState<string[]>(whatWasHard);
  const [changes, setChanges] = useState<string[]>(nextWeekChanges);
  
  const [workedInput, setWorkedInput] = useState('');
  const [hardInput, setHardInput] = useState('');
  const [changesInput, setChangesInput] = useState('');

  const addItem = (list: string[], setList: (items: string[]) => void, item: string) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
    }
  };

  const removeItem = (list: string[], setList: (items: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({ whatWorked: worked, whatWasHard: hard, nextWeekChanges: changes });
    toast.success('Haftalık retrospektif kaydedildi');
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: string[],
    setItems: (items: string[]) => void,
    input: string,
    setInput: (value: string) => void,
    suggestions: string[],
    color: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      
      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1">
        {suggestions.map((suggestion) => (
          <Badge
            key={suggestion}
            variant="outline"
            className={`cursor-pointer hover:bg-${color}/10 transition-colors`}
            onClick={() => addItem(items, setItems, suggestion)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Badge>
        ))}
      </div>
      
      {/* Added items */}
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge key={index} variant="secondary" className="py-1 px-2">
            {item}
            <button
              onClick={() => removeItem(items, setItems, index)}
              className="ml-2 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      {/* Custom input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kendi notunu ekle..."
          className="min-h-[40px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              addItem(items, setItems, input);
              setInput('');
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            addItem(items, setItems, input);
            setInput('');
          }}
          disabled={!input.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Haftalık Retrospektif</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection(
          'Bu hafta ne iyi gitti?',
          <CheckCircle className="h-5 w-5 text-green-500" />,
          worked,
          setWorked,
          workedInput,
          setWorkedInput,
          QUICK_SUGGESTIONS.whatWorked,
          'green'
        )}
        
        {renderSection(
          'Neyle zorlandın?',
          <AlertCircle className="h-5 w-5 text-orange-500" />,
          hard,
          setHard,
          hardInput,
          setHardInput,
          QUICK_SUGGESTIONS.whatWasHard,
          'orange'
        )}
        
        {renderSection(
          'Gelecek hafta ne değiştirmek istiyorsun?',
          <Lightbulb className="h-5 w-5 text-blue-500" />,
          changes,
          setChanges,
          changesInput,
          setChangesInput,
          QUICK_SUGGESTIONS.nextWeekChanges,
          'blue'
        )}
        
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            İptal
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
