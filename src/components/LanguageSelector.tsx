import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { SupportedLanguage } from '@/i18n';

interface LanguageSelectorProps {
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom label text (defaults to language context t('common:labels.language')) */
  label?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Language selector component for switching between supported languages
 */
export function LanguageSelector({
  showLabel = true,
  label,
  className = '',
}: LanguageSelectorProps) {
  const {
    language,
    setLanguage,
    supportedLanguages,
    languageLabels,
    languageFlags,
    t,
  } = useLanguage();

  const handleLanguageChange = async (value: string) => {
    await setLanguage(value as SupportedLanguage);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {label || t('common:labels.language')}
        </Label>
      )}
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              {languageFlags[language]} {languageLabels[language]}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedLanguages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              <span className="flex items-center gap-2">
                {languageFlags[lang]} {languageLabels[lang]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Compact language toggle button for headers/toolbars
 */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage, languageFlags, supportedLanguages } =
    useLanguage();

  const handleToggle = async () => {
    const currentIndex = supportedLanguages.indexOf(language);
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    await setLanguage(supportedLanguages[nextIndex]);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors ${className}`}
      title="Change language"
    >
      <Globe className="h-4 w-4" />
      <span className="text-lg">{languageFlags[language]}</span>
    </button>
  );
}

export default LanguageSelector;
