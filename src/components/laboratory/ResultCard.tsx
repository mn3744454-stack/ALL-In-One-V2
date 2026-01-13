import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SampleStatusBadge, ResultFlagsBadge } from "./SampleStatusBadge";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Eye,
  Lock
} from "lucide-react";

interface ResultCardProps {
  result: LabResult;
  canManage: boolean;
  onReview?: () => void;
  onFinalize?: () => void;
  onView?: () => void;
  onClick?: () => void;
}

export function ResultCard({
  result,
  canManage,
  onReview,
  onFinalize,
  onView,
  onClick,
}: ResultCardProps) {
  const { t } = useI18n();
  const templateName = result.template?.name_ar || result.template?.name || t("laboratory.results.unknownTemplate");
  const sampleId = result.sample?.physical_sample_id || result.sample_id.slice(0, 8);
  const horseName = result.sample?.horse?.name || t("laboratory.results.unknownHorse");

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{templateName}</h3>
              <p className="text-xs text-muted-foreground">
                {horseName} • {sampleId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SampleStatusBadge status={result.status} />
            {result.flags && <ResultFlagsBadge flags={result.flags} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(result.created_at), "MMM d, yyyy")}</span>
          </div>
          {result.creator?.full_name && (
            <span>{t("laboratory.results.by")} {result.creator.full_name}</span>
          )}
        </div>
        {result.reviewer?.full_name && result.status !== 'draft' && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("laboratory.results.reviewedBy")}: {result.reviewer.full_name}
          </p>
        )}
      </CardContent>

      {/* Action Buttons - visible instead of dropdown */}
      {canManage && (
        <CardFooter className="pt-3 border-t flex flex-wrap gap-1.5 justify-end">
          {onView && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <Eye className="h-3 w-3 me-1" />
              {t("laboratory.resultActions.viewDetails")}
            </Button>
          )}
          {result.status === 'draft' && onReview && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onReview(); }}
            >
              <CheckCircle2 className="h-3 w-3 me-1" />
              {t("laboratory.resultActions.markReviewed")}
            </Button>
          )}
          {result.status === 'reviewed' && onFinalize && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onFinalize(); }}
            >
              <Lock className="h-3 w-3 me-1" />
              {t("laboratory.resultActions.finalize")}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
