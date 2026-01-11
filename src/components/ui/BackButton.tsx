import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface BackButtonProps extends Omit<ButtonProps, "children"> {
  label?: string;
  showIcon?: boolean;
}

/**
 * Direction-aware Back button that shows the correct arrow icon based on RTL/LTR.
 * In RTL: shows ChevronRight (pointing right = back direction in RTL)
 * In LTR: shows ChevronLeft (pointing left = back direction in LTR)
 */
const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className, label, showIcon = true, ...props }, ref) => {
    const { dir, t } = useI18n();
    const isRTL = dir === "rtl";
    
    // In RTL, "back" arrow points to the right (start direction)
    // In LTR, "back" arrow points to the left (start direction)
    const Icon = isRTL ? ChevronRight : ChevronLeft;
    const displayLabel = label ?? t("common.back");
    
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn("gap-2", className)}
        {...props}
      >
        {showIcon && <Icon className="h-4 w-4" />}
        {displayLabel}
      </Button>
    );
  }
);
BackButton.displayName = "BackButton";

export { BackButton };
