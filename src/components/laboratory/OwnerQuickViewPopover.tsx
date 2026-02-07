import { Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Phone, User, ExternalLink, Mail } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface OwnerQuickViewPopoverProps {
  ownerName: string | null | undefined;
  ownerPhone: string | null | undefined;
  ownerEmail?: string | null;
  clientId?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function OwnerQuickViewPopover({
  ownerName,
  ownerPhone,
  ownerEmail,
  clientId,
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

  const handleEmail = () => {
    if (ownerEmail) {
      window.location.href = `mailto:${ownerEmail}`;
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
        className="w-72 p-4" 
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

          {ownerEmail && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("common.email")}</p>
              <div className="flex items-center gap-2">
                <a 
                  href={`mailto:${ownerEmail}`} 
                  className="text-sm text-primary hover:underline truncate flex-1"
                >
                  {ownerEmail}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleEmail}
                >
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
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
            
            {clientId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link to={`/dashboard/clients?selected=${clientId}`}>
                  <ExternalLink className="h-4 w-4 me-2" />
                  {t("laboratory.labHorses.viewClientProfile")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
