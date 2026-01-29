import { useI18n, getEnabledLanguages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  const enabledLanguages = getEnabledLanguages();

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
      <SelectTrigger className="w-auto gap-2 bg-white/50 border-border/30 h-9">
        <Globe className="h-4 w-4 text-muted-foreground" />
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
