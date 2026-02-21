import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, CheckCircle2, Loader2, Info } from "lucide-react";
import { useI18n } from "@/i18n";

interface PublishToStableActionProps {
  resultId: string;
  status: string;
  published_to_stable: boolean;
  sample_lab_request_id: string | null | undefined;
  onPublish: (resultId: string) => Promise<boolean>;
  /** Compact mode for inline use in cards/tables */
  compact?: boolean;
}

export function PublishToStableAction({
  resultId,
  status,
  published_to_stable,
  sample_lab_request_id,
  onPublish,
  compact = false,
}: PublishToStableActionProps) {
  const { t } = useI18n();
  const [isPublishing, setIsPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const isPublished = published_to_stable || justPublished;
  const canPublishStatus = status === "reviewed" || status === "final";
  const hasRequest = !!sample_lab_request_id;

  // Already published
  if (isPublished) {
    return (
      <Badge variant="outline" className="border-green-600 text-green-600 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3 me-1" />
        {t("laboratory.results.published")}
      </Badge>
    );
  }

  // Eligible: can publish
  if (canPublishStatus && hasRequest) {
    return (
      <Button
        size={compact ? "sm" : "sm"}
        variant="outline"
        className={`border-primary text-primary hover:bg-primary/10 whitespace-nowrap ${compact ? "h-7 text-xs" : "min-h-[44px]"}`}
        disabled={isPublishing}
        onClick={async (e) => {
          e.stopPropagation();
          setIsPublishing(true);
          const ok = await onPublish(resultId);
          if (ok) setJustPublished(true);
          setIsPublishing(false);
        }}
      >
        {isPublishing ? (
          <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5 me-1" />
        )}
        {t("laboratory.results.publishToStable")}
      </Button>
    );
  }

  // Not eligible — show reason
  if (!hasRequest) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
            <Info className="h-3 w-3" />
            {compact ? t("laboratory.results.noRequest") : t("laboratory.results.notLinkedToRequest")}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{t("laboratory.results.notLinkedToRequest")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Has request but status is draft
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
          <Info className="h-3 w-3" />
          {t("laboratory.results.draftCannotPublish")}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{t("laboratory.results.draftCannotPublish")}</p>
      </TooltipContent>
    </Tooltip>
  );
}
