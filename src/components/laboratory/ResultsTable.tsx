import { format } from "date-fns";
import { MoreHorizontal, Eye, CheckCircle2, Lock, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { LabResult } from "@/hooks/laboratory/useLabResults";

interface ResultsTableProps {
  results: LabResult[];
  canManage: boolean;
  onResultClick?: (resultId: string) => void;
  onReviewResult?: (resultId: string) => void;
  onFinalizeResult?: (resultId: string) => void;
}

export function ResultsTable({
  results,
  canManage,
  onResultClick,
  onReviewResult,
  onFinalizeResult,
}: ResultsTableProps) {
  const { t, dir, lang } = useI18n();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'final':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{t("laboratory.resultStatus.final")}</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{t("laboratory.resultStatus.reviewed")}</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">{t("laboratory.resultStatus.draft")}</Badge>;
    }
  };

  const getFlagsBadge = (flags: string | null) => {
    if (!flags || flags === 'normal') {
      return <Badge variant="outline" className="text-green-600">{t("laboratory.flags.normal")}</Badge>;
    }
    if (flags === 'abnormal') {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t("laboratory.flags.abnormal")}
        </Badge>
      );
    }
    if (flags === 'critical') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t("laboratory.flags.critical")}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center">{t("laboratory.table.number")}</TableHead>
            <TableHead>{t("laboratory.table.horse")}</TableHead>
            <TableHead>{t("laboratory.table.template")}</TableHead>
            <TableHead>{t("laboratory.table.status")}</TableHead>
            <TableHead>{t("laboratory.table.flags")}</TableHead>
            <TableHead>{t("laboratory.table.resultDate")}</TableHead>
            <TableHead>{t("laboratory.table.createdBy")}</TableHead>
            <TableHead className="w-[60px]">{t("laboratory.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, index) => {
            const horseName = result.sample?.horse?.name || t("laboratory.results.unknownHorse");
            const templateName = lang === 'ar' 
              ? (result.template?.name_ar || result.template?.name || t("laboratory.results.unknownTemplate"))
              : (result.template?.name || t("laboratory.results.unknownTemplate"));

            return (
              <TableRow
                key={result.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onResultClick?.(result.id)}
              >
                <TableCell className="text-center font-bold text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{horseName}</span>
                    {result.sample?.physical_sample_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        ({result.sample.physical_sample_id})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{templateName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(result.status)}
                </TableCell>
                <TableCell>
                  {getFlagsBadge(result.flags)}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(result.created_at), "PPP")}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {result.creator?.full_name || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResultClick?.(result.id); }}>
                        <Eye className="h-4 w-4 me-2" />
                        {t("laboratory.resultActions.viewDetails")}
                      </DropdownMenuItem>
                      
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          
                          {result.status === 'draft' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReviewResult?.(result.id); }}>
                              <CheckCircle2 className="h-4 w-4 me-2" />
                              {t("laboratory.resultActions.markReviewed")}
                            </DropdownMenuItem>
                          )}
                          
                          {result.status === 'reviewed' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFinalizeResult?.(result.id); }}>
                              <Lock className="h-4 w-4 me-2" />
                              {t("laboratory.resultActions.finalize")}
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
