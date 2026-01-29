import { useI18n, getEnabledLanguages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  variant?: 'default' | 'hero';
}

export function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const { lang, setLang } = useI18n();
  const enabledLanguages = getEnabledLanguages();

  const triggerClasses = variant === 'hero'
    ? 'bg-cream/10 border-cream/30 text-cream hover:bg-cream/20 [&>svg]:text-cream/70'
    : 'bg-white/50 border-border/30';

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
      <SelectTrigger className={cn("w-auto gap-2 h-9", triggerClasses)}>
        <Globe className="h-4 w-4" />
        <SelectValue>
          {enabledLanguages.find((l) => l.code === lang)?.nativeName || lang}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {enabledLanguages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className="flex items-center gap-2">
              <span>{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">({language.name})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
