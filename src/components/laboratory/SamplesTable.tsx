import { format } from "date-fns";
import { MoreHorizontal, FlaskConical, Eye, RotateCcw, FileText, Receipt, Edit, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SampleStatusBadge } from "./SampleStatusBadge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getLabClientDisplayName } from "@/lib/laboratory/clientDisplay";
import { getLabHorseDisplayName } from "@/lib/laboratory/horseDisplay";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { useState } from "react";

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
  onEdit?: (sample: LabSample) => void;
  onDelete?: (sample: LabSample) => void;
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
  onEdit,
  onDelete,
}: SamplesTableProps) {
  const { t, dir, lang } = useI18n();
  const [deleteConfirmSample, setDeleteConfirmSample] = useState<LabSample | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteConfirmSample && onDelete) {
      onDelete(deleteConfirmSample);
    }
    setDeleteConfirmSample(null);
  };

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">{t("laboratory.table.number")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.horse")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.client")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.sampleId")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.status")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.collectionDate")}</TableHead>
              <TableHead className="text-center">{t("laboratory.table.results")}</TableHead>
              <TableHead className="w-[60px] text-center">{t("laboratory.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((sample) => {
              const clientName = getLabClientDisplayName(sample, { locale: lang === 'ar' ? 'ar' : 'en' }) || t("laboratory.clientGrouped.noClient");
              const horseName = getLabHorseDisplayName(sample, { locale: lang === 'ar' ? 'ar' : 'en', fallback: t("laboratory.samples.unlinkedHorse") });
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
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">{horseName}</span>
                      {isRetest && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                          <RotateCcw className="h-3 w-3 me-1" />
                          {t("laboratory.samples.retest")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{clientName}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm text-muted-foreground">
                      {sample.physical_sample_id || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <SampleStatusBadge status={sample.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(sample.collection_date), "dd-MM-yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={(e) => { e.stopPropagation(); onViewAllResults?.(sample); }}
                      >
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                          <FileText className="h-3 w-3 me-1" />
                          {resultsCount}/{templateCount}
                        </Badge>
                      </Button>
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

                            <DropdownMenuSeparator />
                            
                            {/* Edit */}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(sample); }}>
                              <Edit className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.edit")}
                            </DropdownMenuItem>
                            
                            {/* Delete */}
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmSample(sample); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t("laboratory.sampleActions.delete")}
                            </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmSample} onOpenChange={(open) => !open && setDeleteConfirmSample(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("laboratory.sampleActions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("laboratory.sampleActions.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}