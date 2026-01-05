import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SampleStatusBadge } from "./SampleStatusBadge";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { format } from "date-fns";
import { 
  FlaskConical, 
  Calendar, 
  MoreVertical, 
  Play, 
  CheckCircle2, 
  XCircle,
  RotateCcw,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SampleCardProps {
  sample: LabSample;
  canManage: boolean;
  onAccession?: () => void;
  onStartProcessing?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onRetest?: () => void;
  onClick?: () => void;
}

export function SampleCard({
  sample,
  canManage,
  onAccession,
  onStartProcessing,
  onComplete,
  onCancel,
  onRetest,
  onClick,
}: SampleCardProps) {
  const horseName = sample.horse?.name || "Unknown Horse";
  const horseInitials = horseName.slice(0, 2).toUpperCase();

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sample.horse?.avatar_url || undefined} alt={horseName} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {horseInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{horseName}</h3>
              {sample.physical_sample_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  {sample.physical_sample_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SampleStatusBadge status={sample.status} />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sample.status === 'draft' && onAccession && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAccession(); }}>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Accession
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'accessioned' && onStartProcessing && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartProcessing(); }}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Processing
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'processing' && onComplete && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(); }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete
                    </DropdownMenuItem>
                  )}
                  {sample.status === 'completed' && sample.retest_count < 3 && onRetest && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRetest(); }}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Create Retest
                    </DropdownMenuItem>
                  )}
                  {!['completed', 'cancelled'].includes(sample.status) && onCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Templates Badges */}
        {sample.templates && sample.templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sample.templates.map((st) => (
              <Badge key={st.id} variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {st.template.name_ar || st.template.name}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(sample.collection_date), "MMM d, yyyy")}</span>
          </div>
          {sample.retest_count > 0 && (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              <span>Retest #{sample.retest_count}</span>
            </div>
          )}
        </div>
        {sample.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {sample.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
