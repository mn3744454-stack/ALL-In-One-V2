import { useI18n } from "@/i18n";
import {
  resolveBilingualClientName,
  type BilingualNameInput,
} from "@/lib/finance/clientIdentity";
import { cn } from "@/lib/utils";

interface BilingualClientNameProps {
  client: BilingualNameInput | null | undefined;
  className?: string;
  /**
   * When true, render the secondary label on a new line rather than after
   * a middle-dot separator. Useful in table rows where horizontal space is
   * scarce.
   */
  stack?: boolean;
  primaryClassName?: string;
  secondaryClassName?: string;
}

/**
 * Slice 3.2 — single-source-of-truth for rendering a client's name in
 * bilingual UIs. Always renders the primary language first with the secondary
 * language (when present and distinct) shown between parentheses so the two
 * labels never split across lines and never duplicate a mono-lingual value.
 */
export function BilingualClientName({
  client,
  className,
  stack,
  primaryClassName,
  secondaryClassName,
}: BilingualClientNameProps) {
  const { dir } = useI18n();
  const { primary, secondary } = resolveBilingualClientName(
    client,
    dir === "rtl" ? "rtl" : "ltr",
  );
  if (!primary && !secondary) return null;
  if (stack) {
    return (
      <span className={cn("inline-flex flex-col min-w-0", className)}>
        <span className={cn("truncate", primaryClassName)}>{primary}</span>
        {secondary && (
          <span
            className={cn("truncate text-xs text-muted-foreground", secondaryClassName)}
          >
            {secondary}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-baseline gap-1 min-w-0", className)}>
      <span className={cn("truncate", primaryClassName)}>{primary}</span>
      {secondary && (
        <span
          className={cn("truncate text-xs text-muted-foreground", secondaryClassName)}
        >
          ({secondary})
        </span>
      )}
    </span>
  );
}
