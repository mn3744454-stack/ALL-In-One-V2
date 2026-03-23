import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BilingualName } from "@/components/ui/BilingualName";
import { AlertTriangle, Heart } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface IncompleteHorse {
  id: string;
  name: string;
  name_ar?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
}

interface IncompleteProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horses: IncompleteHorse[];
  onHorseClick?: (horse: IncompleteHorse) => void;
}

export function IncompleteProfileModal({
  open,
  onOpenChange,
  horses,
  onHorseClick,
}: IncompleteProfileModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            {t('horses.tabs.incomplete')}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {horses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('common.noResults')}
            </p>
          ) : (
            <div className="space-y-2">
              {horses.map((horse) => {
                const missingFields: string[] = [];
                if (!horse.birth_date) missingFields.push(t('horses.profile.birthDate') || 'Birth Date');
                if (!horse.microchip_number) missingFields.push(t('horses.profile.microchip'));
                if (!horse.passport_number) missingFields.push(t('horses.profile.passport'));

                return (
                  <button
                    key={horse.id}
                    onClick={() => {
                      onHorseClick?.(horse);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border bg-card text-start",
                      "hover:shadow-md hover:border-border/80 transition-all cursor-pointer"
                    )}
                  >
                    <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
                      {horse.avatar_url ? (
                        <img src={horse.avatar_url} alt={horse.name} className="w-full h-full object-cover" />
                      ) : (
                        <Heart className="w-4 h-4 text-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <BilingualName
                        name={horse.name}
                        nameAr={horse.name_ar}
                        primaryClassName="text-sm font-medium"
                        secondaryClassName="text-[10px]"
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                        {missingFields.join(' • ')}
                      </p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
