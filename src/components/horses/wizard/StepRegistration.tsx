import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Loader2, Heart } from "lucide-react";
import { useHorseSearch } from "@/hooks/useHorseSearch";
import { useI18n } from "@/i18n";
import type { HorseWizardData } from "../HorseWizard";

interface StepRegistrationProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepRegistration = ({ data, onChange }: StepRegistrationProps) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const { results, loading, search, clear } = useHorseSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        search(searchQuery);
      } else {
        clear();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search, clear]);

  const handleSelectHorse = (horseId: string) => {
    onChange({ existingHorseId: horseId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-navy mb-2">{t('horses.wizard.alreadyRegistered')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('horses.wizard.checkRegistrationDesc')}
        </p>
      </div>

      <RadioGroup
        value={data.isRegistered ? "yes" : "no"}
        onValueChange={(v) => {
          onChange({ isRegistered: v === "yes", existingHorseId: undefined });
          if (v === "no") {
            setSearchQuery("");
            clear();
          }
        }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="no" id="no" />
          <Label htmlFor="no" className="cursor-pointer flex-1">
            <div className="font-medium">{t('horses.wizard.newHorse')}</div>
            <div className="text-sm text-muted-foreground">{t('horses.wizard.newHorseDesc')}</div>
          </Label>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="yes" id="yes" />
          <Label htmlFor="yes" className="cursor-pointer flex-1">
            <div className="font-medium">{t('horses.wizard.existingHorse')}</div>
            <div className="text-sm text-muted-foreground">{t('horses.wizard.existingHorseDesc')}</div>
          </Label>
        </div>
      </RadioGroup>

      {data.isRegistered && (
        <div className="space-y-4 pt-4 border-t">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('horses.wizard.searchPlaceholder')}
              className="ps-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('common.loading')}
                </p>
              ) : results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('horses.wizard.noSearchResults')} "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {results.map((horse) => (
                    <div
                      key={horse.id}
                      onClick={() => handleSelectHorse(horse.id)}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        data.existingHorseId === horse.id
                          ? "border-gold bg-gold/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
                        {horse.avatar_url ? (
                          <img
                            src={horse.avatar_url}
                            alt={horse.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Heart className="w-5 h-5 text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {horse.name}
                          {horse.name_ar && (
                            <span className="text-muted-foreground ms-2" dir="rtl">
                              ({horse.name_ar})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {horse.breed_data?.name && <span>{horse.breed_data.name}</span>}
                          {horse.microchip_number && (
                            <span className="font-mono">{horse.microchip_number}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchQuery.length < 2 && (
            <p className="text-sm text-muted-foreground text-center">
              {t('horses.wizard.minSearchChars')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
