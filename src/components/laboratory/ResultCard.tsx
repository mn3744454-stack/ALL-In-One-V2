import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SampleStatusBadge, ResultFlagsBadge } from "./SampleStatusBadge";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import { format } from "date-fns";
import { 
  FileText, 
  Calendar, 
  MoreVertical, 
  CheckCircle2, 
  Eye,
  Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const templateName = result.template?.name || "Unknown Template";
  const sampleId = result.sample?.physical_sample_id || result.sample_id.slice(0, 8);
  const horseName = result.sample?.horse?.name || "Unknown Horse";

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
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {result.status === 'draft' && onReview && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview(); }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Reviewed
                    </DropdownMenuItem>
                  )}
                  {result.status === 'reviewed' && onFinalize && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFinalize(); }}>
                      <Lock className="h-4 w-4 mr-2" />
                      Finalize
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            <span>by {result.creator.full_name}</span>
          )}
        </div>
        {result.reviewer?.full_name && result.status !== 'draft' && (
          <p className="text-xs text-muted-foreground mt-2">
            Reviewed by: {result.reviewer.full_name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
