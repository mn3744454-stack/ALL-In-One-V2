import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Phone, User, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface OwnerQuickViewPopoverProps {
  ownerName: string | null | undefined;
  ownerPhone: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}

export function OwnerQuickViewPopover({
  ownerName,
  ownerPhone,
  children,
  className,
}: OwnerQuickViewPopoverProps) {
  const { t, dir } = useI18n();

  // Don't render popover if no owner info
  if (!ownerName && !ownerPhone) {
    return <>{children}</>;
  }

  const handleCall = () => {
    if (ownerPhone) {
      window.location.href = `tel:${ownerPhone}`;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "cursor-pointer hover:underline text-primary transition-colors",
            className
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-4" 
        align={dir === 'rtl' ? 'end' : 'start'}
        side="bottom"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            {t("laboratory.labHorses.ownerInfo")}
          </div>
          
          {ownerName && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("laboratory.labHorses.ownerName")}</p>
              <p className="font-medium">{ownerName}</p>
            </div>
          )}
          
          {ownerPhone && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("laboratory.labHorses.ownerPhone")}</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm" dir="ltr">{ownerPhone}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCall}
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          
          {ownerPhone && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4 me-2" />
              {t("laboratory.labHorses.callOwner")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
