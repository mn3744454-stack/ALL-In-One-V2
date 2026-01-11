import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  backTo?: string;
  showBack?: boolean;
  className?: string;
  rightElement?: React.ReactNode;
}

export function MobilePageHeader({
  title,
  backTo,
  showBack = true,
  className,
  rightElement,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();
  const { dir, t } = useI18n();
  const isRTL = dir === "rtl";

  // In RTL, "back" arrow points to the right (start direction)
  // In LTR, "back" arrow points to the left (start direction)
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "lg:hidden sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Back button */}
        {showBack ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors -ms-2 ps-2 pe-3 py-2"
          >
            <BackIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{t("common.back")}</span>
          </button>
        ) : (
          <div className="w-20" />
        )}

        {/* Title */}
        <h1 className="font-display font-semibold text-foreground text-base truncate max-w-[50%]">
          {title}
        </h1>

        {/* Right element or spacer */}
        {rightElement ? (
          <div className="flex items-center">{rightElement}</div>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </header>
  );
}
