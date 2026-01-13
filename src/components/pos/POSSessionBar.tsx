import React from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { POSSession } from "@/hooks/pos/usePOSSessions";
import { format } from "date-fns";

interface POSSessionBarProps {
  session: POSSession | null;
  onOpenSession: () => void;
  onCloseSession: () => void;
  isOpening?: boolean;
  isClosing?: boolean;
}

export function POSSessionBar({
  session,
  onOpenSession,
  onCloseSession,
  isOpening,
  isClosing,
}: POSSessionBarProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 p-3",
      isRTL && "flex-row-reverse"
    )}>
      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <Store className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">
          {t("finance.pos.title")}
        </span>
        
        {session ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            {t("finance.pos.session.open")}
          </Badge>
        ) : (
          <Badge variant="secondary">
            {t("finance.pos.session.closed")}
          </Badge>
        )}
      </div>

      {session ? (
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className={cn(
            "hidden sm:flex items-center gap-1 text-xs text-muted-foreground",
            isRTL && "flex-row-reverse"
          )}>
            <Clock className="h-3 w-3" />
            <span>{format(new Date(session.opened_at), "HH:mm")}</span>
          </div>
          
          <div className={cn(
            "hidden sm:flex items-center gap-1 text-xs text-muted-foreground",
            isRTL && "flex-row-reverse"
          )}>
            <DollarSign className="h-3 w-3" />
            <span>{session.opening_cash.toFixed(2)}</span>
          </div>

          <Button 
            size="sm" 
            variant="destructive" 
            onClick={onCloseSession}
            disabled={isClosing}
            className="min-h-[44px] min-w-[44px]"
          >
            {isClosing ? "..." : t("finance.pos.session.close")}
          </Button>
        </div>
      ) : (
        <Button 
          size="sm" 
          onClick={onOpenSession}
          disabled={isOpening}
          className="min-h-[44px] min-w-[44px]"
        >
          {isOpening ? "..." : t("finance.pos.session.open")}
        </Button>
      )}
    </div>
  );
}
