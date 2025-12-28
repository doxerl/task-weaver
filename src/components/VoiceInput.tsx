import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

interface VoiceInputProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
}

// Check if browser supports speech recognition
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceInput({ mode, date, onSuccess }: VoiceInputProps) {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supportsVoice = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'tr-TR';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setText(prev => prev + ' ' + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Mikrofon izni gerekli');
      } else if (event.error === 'no-speech') {
        toast.info('Ses algılanmadı');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Tarayıcınız sesli komutu desteklemiyor');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Dinleniyor... Konuşmaya başlayın');
    }
  };

  const handleSubmit = async () => {
    // Session kontrolü
    if (!session) {
      toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.', {
        action: {
          label: 'Giriş Yap',
          onClick: () => navigate('/auth')
        }
      });
      return;
    }

    if (!text.trim()) {
      toast.error('Lütfen bir komut girin');
      return;
    }

    setIsProcessing(true);

    try {
      const functionName = mode === 'plan' ? 'parse-plan' : 'parse-actual';
      
      const payload = {
        text: text.trim(),
        date: format(date, 'yyyy-MM-dd'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        now: new Date().toISOString()
      };

      console.log('Calling edge function:', functionName, payload);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });
      
      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        
        // 401 hatası için özel handling
        if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('JWT')) {
          toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.', {
            action: {
              label: 'Giriş Yap',
              onClick: () => navigate('/auth')
            }
          });
          return;
        }
        
        toast.error('İşlem başarısız: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success(data.message || 'Başarıyla eklendi!');
        setText('');
        onSuccess();
      } else if (data?.warnings?.length > 0) {
        toast.warning(data.warnings.join(', '));
      } else if (data?.clarifyingQuestions?.length > 0) {
        toast.info(data.clarifyingQuestions[0]);
      } else {
        toast.error(data?.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  const placeholder = mode === 'plan' 
    ? 'Örn: "Yarın saat 10\'da müşteri toplantısı ekle"'
    : 'Örn: "Şu an rapor yazıyorum"';

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-[50px] md:min-h-[70px] resize-none text-sm"
        disabled={isProcessing}
      />
      
      <div className="flex items-center gap-2">
        {/* Send Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          className="flex-1 h-10 md:h-10"
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">İşleniyor...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {mode === 'plan' ? 'Plan Ekle' : 'Kaydet'}
            </>
          )}
        </Button>
        
        {/* Large Mic Button - Mobile Optimized (FAB style) */}
        {supportsVoice && (
          <Button
            variant={isListening ? 'destructive' : 'default'}
            onClick={toggleListening}
            disabled={isProcessing}
            title={isListening ? 'Dinlemeyi durdur' : 'Sesli komut'}
            className="h-14 w-14 md:h-10 md:w-10 rounded-full md:rounded-md shrink-0 shadow-lg md:shadow-none"
          >
            {isListening ? (
              <MicOff className="h-6 w-6 md:h-4 md:w-4" />
            ) : (
              <Mic className="h-6 w-6 md:h-4 md:w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
