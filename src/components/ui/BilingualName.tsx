import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface BilingualNameProps {
  name?: string | null;
  nameAr?: string | null;
  /** Override auto-detected language */
  lang?: string;
  /** CSS class for the wrapper */
  className?: string;
  /** CSS class for the primary (bold) line */
  primaryClassName?: string;
  /** CSS class for the secondary (lighter) line */
  secondaryClassName?: string;
  /** Render inline (same line with parentheses) instead of stacked. Use sparingly. */
  inline?: boolean;
}

/**
 * Canonical bilingual name display component.
 *
 * Renders a stacked layout by default:
 *   Primary name (bold)
 *   (Secondary name) — lighter, smaller
 *
 * Language-aware: swaps primary/secondary based on active UI language.
 * Safe for RTL/LTR. Gracefully degrades to single name when only one exists.
 */
export function BilingualName({
  name,
  nameAr,
  lang: langOverride,
  className,
  primaryClassName,
  secondaryClassName,
  inline = false,
}: BilingualNameProps) {
  const { lang: activeLang } = useI18n();
  const lang = langOverride || activeLang;

  const en = name?.trim() || null;
  const ar = nameAr?.trim() || null;

  // Nothing to show
  if (!en && !ar) return <span className={className}>—</span>;

  // Only one language exists
  if (!ar) return <span className={cn("font-medium truncate", primaryClassName, className)}>{en}</span>;
  if (!en) return <span className={cn("font-medium truncate", primaryClassName, className)} dir="rtl">{ar}</span>;

  // Both exist but are identical
  if (en === ar) return <span className={cn("font-medium truncate", primaryClassName, className)}>{en}</span>;

  // Both exist — determine primary/secondary
  const isArabicUI = lang === "ar";
  const primary = isArabicUI ? ar : en;
  const secondary = isArabicUI ? en : ar;
  const secondaryDir = isArabicUI ? undefined : "rtl";

  if (inline) {
    return (
      <span className={cn("truncate", className)}>
        <span className={cn("font-medium", primaryClassName)}>{primary}</span>
        <span className={cn("text-muted-foreground text-xs ms-1", secondaryClassName)}>({secondary})</span>
      </span>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("font-medium truncate", primaryClassName)}>{primary}</div>
      <div
        className={cn("text-xs text-muted-foreground truncate", secondaryClassName)}
        dir={secondaryDir}
      >
        ({secondary})
      </div>
    </div>
  );
}
