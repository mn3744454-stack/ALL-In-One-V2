import { format } from "date-fns";
import { MoreHorizontal, FlaskConical, Eye, RotateCcw, FileText, Receipt } from "lucide-react";
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
import { SampleStatusBadge } from "./SampleStatusBadge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getLabClientDisplayName } from "@/lib/laboratory/clientDisplay";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";

interface SamplesTableProps {
  samples: LabSample[];
  canManage: boolean;
  canCreateInvoice: boolean;
  resultsCountBySample: Record<string, number>;
  onSampleClick?: (sampleId: string) => void;
  onAccession?: (sample: LabSample) => void;
  onStartProcessing?: (sample: LabSample) => void;
  onComplete?: (sample: LabSample) => void;
  onCancel?: (sample: LabSample) => void;
  onRetest?: (sample: LabSample) => void;
  onViewAllResults?: (sample: LabSample) => void;
  onGenerateInvoice?: (sample: LabSample) => void;
}

export function SamplesTable({
  samples,
  canManage,
  canCreateInvoice,
  resultsCountBySample,
  onSampleClick,
  onAccession,
  onStartProcessing,
  onComplete,
  onCancel,
  onRetest,
  onViewAllResults,
  onGenerateInvoice,
}: SamplesTableProps) {
  const { t, dir, lang } = useI18n();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center">{t("laboratory.table.number")}</TableHead>
            <TableHead>{t("laboratory.table.client")}</TableHead>
            <TableHead>{t("laboratory.table.horse")}</TableHead>
            <TableHead>{t("laboratory.table.sampleId")}</TableHead>
            <TableHead>{t("laboratory.table.status")}</TableHead>
            <TableHead>{t("laboratory.table.collectionDate")}</TableHead>
            <TableHead className="text-center">{t("laboratory.table.templates")}</TableHead>
            <TableHead className="w-[60px]">{t("laboratory.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {samples.map((sample) => {
            const clientName = getLabClientDisplayName(sample, { locale: lang === 'ar' ? 'ar' : 'en' }) || t("laboratory.clientGrouped.noClient");
            const horseName = sample.horse?.name || sample.horse_name || t("laboratory.samples.unknownHorse");
            const templateCount = sample.templates?.length || 0;
            const resultsCount = resultsCountBySample[sample.id] || 0;
            const isRetest = sample.retest_of_sample_id !== null;

            return (
              <TableRow
                key={sample.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSampleClick?.(sample.id)}
              >
                <TableCell className="text-center font-bold">
                  {(sample as any).daily_number ? `#${(sample as any).daily_number}` : "-"}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{clientName}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{horseName}</span>
                    {isRetest && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                        <RotateCcw className="h-3 w-3 me-1" />
                        {t("laboratory.samples.retest")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {sample.physical_sample_id || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <SampleStatusBadge status={sample.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(sample.collection_date), "PPP")}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 me-1" />
                      {resultsCount}/{templateCount}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewAllResults?.(sample); }}>
                        <Eye className="h-4 w-4 me-2" />
                        {t("laboratory.samples.viewAllResults")}
                      </DropdownMenuItem>
                      
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          
                          {sample.status === 'draft' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAccession?.(sample); }}>
                              <FlaskConical className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.accession")}
                            </DropdownMenuItem>
                          )}
                          
                          {sample.status === 'accessioned' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartProcessing?.(sample); }}>
                              <FlaskConical className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.startProcessing")}
                            </DropdownMenuItem>
                          )}
                          
                          {sample.status === 'processing' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete?.(sample); }}>
                              <FlaskConical className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.complete")}
                            </DropdownMenuItem>
                          )}
                          
                          {sample.status === 'completed' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRetest?.(sample); }}>
                              <RotateCcw className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.createRetest")}
                            </DropdownMenuItem>
                          )}

                          {canCreateInvoice && sample.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGenerateInvoice?.(sample); }}>
                              <Receipt className="h-4 w-4 me-2" />
                              {t("laboratory.billing.generateInvoice")}
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
