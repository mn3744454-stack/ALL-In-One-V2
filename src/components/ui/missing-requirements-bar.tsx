/**
 * MissingRequirementsBar — primitive for the Visible Validation Guidance rule
 * (see `docs/platform-ux-standards.md` §7).
 *
 * Current adoption is **scoped to Housing/Movement surfaces** only — the same
 * four files that adopt SafeFormDialog. Platform-wide rollout is pending a
 * future adoption audit.
 *
 * This JSDoc is documentation-only; no runtime behavior is changed by it.
 */
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface MissingRequirementsBarProps {
  issues: string[];
  /** Becomes role="alert" once the user has attempted submit/next. */
  attempted?: boolean;
  className?: string;
}

/**
 * Compact, always-visible summary of missing required fields shown in dialog
 * footers / wizard footers. Wraps on small screens, RTL-safe via logical
 * `text-start`. Renders nothing when `issues` is empty.
 */
export function MissingRequirementsBar({
  issues,
  attempted = false,
  className,
}: MissingRequirementsBarProps) {
  const { t } = useI18n();
  if (!issues.length) return null;

  return (
    <div
      role={attempted ? "alert" : "status"}
      aria-live={attempted ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-start",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-destructive">
          {t("common.validation.missing")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {issues.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center rounded-full border border-destructive/30 bg-background px-2 py-0.5 text-[11px] text-destructive"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
