import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  FileText, 
  FlaskConical, 
  AlertCircle,
  ArrowRight,
  Edit,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabTemplates, type LabTemplate, type LabTemplateField } from "@/hooks/laboratory/useLabTemplates";
import { useLabResults, type CreateLabResultData, type LabResultFlags, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useI18n } from "@/i18n";
import type { Json } from "@/integrations/supabase/types";

interface CreateResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSample?: LabSample;
  onSuccess?: () => void;
}

const STEPS = [
  { key: 'sample', title: 'اختر العينة', titleEn: 'Select Sample', icon: FlaskConical },
  { key: 'template', title: 'اختر القالب', titleEn: 'Select Template', icon: FileText },
  { key: 'results', title: 'أدخل النتائج', titleEn: 'Enter Results', icon: FileText },
  { key: 'review', title: 'مراجعة', titleEn: 'Review', icon: Check },
  { key: 'next', title: 'متابعة', titleEn: 'Continue', icon: ArrowRight },
];

export function CreateResultDialog({
  open,
  onOpenChange,
  preselectedSample,
  onSuccess,
}: CreateResultDialogProps) {
  const { t } = useI18n();
  const { samples: allSamples } = useLabSamples({ status: 'processing' });
  const { activeTemplates } = useLabTemplates();
  const { results, createResult, updateResult, refresh: refreshResults } = useLabResults();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(preselectedSample || null);
  const [selectedTemplate, setSelectedTemplate] = useState<LabTemplate | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<LabResultFlags>('normal');
  const [interpretation, setInterpretation] = useState('');
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [savedInSession, setSavedInSession] = useState<string[]>([]);
  const [sampleSearch, setSampleSearch] = useState('');

  // Filter out fully completed samples (results_count >= templates_count)
  const samples = useMemo(() => {
    return allSamples.filter(sample => {
      const templateCount = sample.templates?.length || 0;
      const resultsCount = results.filter(r => r.sample_id === sample.id).length;
      // Only show samples that still have pending templates
      return templateCount === 0 || resultsCount < templateCount;
    });
  }, [allSamples, results]);

  // Filter samples by search
  const filteredSamples = useMemo(() => {
    if (!sampleSearch.trim()) return samples;
    const search = sampleSearch.toLowerCase();
    return samples.filter(sample => {
      const horseName = (sample.horse?.name || sample.horse_name || '').toLowerCase();
      const physicalId = (sample.physical_sample_id || '').toLowerCase();
      return horseName.includes(search) || physicalId.includes(search);
    });
  }, [samples, sampleSearch]);

  // Get ordered templates for the selected sample
  const orderedTemplates = useMemo(() => {
    if (!selectedSample?.templates?.length) return [];
    return [...selectedSample.templates]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(st => {
        // Find the full template data from activeTemplates
        const fullTemplate = activeTemplates.find(t => t.id === st.template.id);
        return fullTemplate || {
          ...st.template,
          is_active: true,
          normal_ranges: {},
          created_at: '',
          updated_at: '',
        } as LabTemplate;
      });
  }, [selectedSample, activeTemplates]);

  // Get existing results for the selected sample
  const sampleResults = useMemo(() => {
    if (!selectedSample) return [];
    return results.filter(r => r.sample_id === selectedSample.id);
  }, [selectedSample, results]);

  // Completed template IDs (have a result)
  const completedTemplateIds = useMemo(() => {
    return sampleResults.map(r => r.template_id);
  }, [sampleResults]);

  // Remaining templates (no result yet)
  const remainingTemplates = useMemo(() => {
    return orderedTemplates.filter(t => !completedTemplateIds.includes(t.id));
  }, [orderedTemplates, completedTemplateIds]);

  // Progress calculation
  const totalTemplates = orderedTemplates.length;
  const completedCount = completedTemplateIds.length;
  const progressPercent = totalTemplates > 0 ? (completedCount / totalTemplates) * 100 : 0;

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedSample(preselectedSample || null);
      setSelectedTemplate(null);
      setResultData({});
      setFlags('normal');
      setInterpretation('');
      setEditingResultId(null);
      setSavedInSession([]);
      refreshResults();
    }
  }, [open, preselectedSample, refreshResults]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSample || !selectedTemplate) return;

    setLoading(true);
    try {
      const data: CreateLabResultData = {
        sample_id: selectedSample.id,
        template_id: selectedTemplate.id,
        result_data: resultData as Json,
        interpretation: { notes: interpretation } as Json,
        flags,
        status: 'draft',
      };

      let success = false;

      if (editingResultId) {
        // Update existing result
        const updated = await updateResult(editingResultId, {
          result_data: resultData as Json,
          interpretation: { notes: interpretation } as Json,
          flags,
        });
        success = !!updated;
      } else {
        // Create new result
        const created = await createResult(data);
        success = !!created;
      }
      
      if (success) {
        // Track saved templates in this session
        setSavedInSession(prev => [...prev, selectedTemplate.id]);
        
        // Refresh results to get updated list
        await refreshResults();
        
        // Check if there are more templates to complete
        const stillRemaining = orderedTemplates.filter(
          t => !completedTemplateIds.includes(t.id) && t.id !== selectedTemplate.id
        );
        
        if (stillRemaining.length > 0) {
          // Move to "next" step to ask user what to do
          setStep(STEPS.findIndex(s => s.key === 'next'));
        } else {
          // All templates completed
          onOpenChange(false);
          onSuccess?.();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToNext = () => {
    // Get the next remaining template
    const nextTemplate = remainingTemplates.find(t => !savedInSession.includes(t.id));
    if (nextTemplate) {
      setSelectedTemplate(nextTemplate);
      setResultData({});
      setFlags('normal');
      setInterpretation('');
      setEditingResultId(null);
      setStep(STEPS.findIndex(s => s.key === 'results'));
    }
  };

  const handleSelectTemplate = (template: LabTemplate) => {
    const existingResult = sampleResults.find(r => r.template_id === template.id);
    
    setSelectedTemplate(template);
    
    if (existingResult) {
      // Load existing data for editing
      setResultData(existingResult.result_data as Record<string, unknown> || {});
      setFlags((existingResult.flags as LabResultFlags) || 'normal');
      setInterpretation((existingResult.interpretation as { notes?: string })?.notes || '');
      setEditingResultId(existingResult.id);
    } else {
      setResultData({});
      setFlags('normal');
      setInterpretation('');
      setEditingResultId(null);
    }
  };

  const updateField = (fieldId: string, value: unknown) => {
    setResultData(prev => ({ ...prev, [fieldId]: value }));
  };

  // Check if value is within normal range
  const checkNormalRange = (fieldId: string, value: unknown): 'normal' | 'abnormal' | 'unknown' => {
    if (!selectedTemplate || value === undefined || value === '') return 'unknown';
    
    const range = selectedTemplate.normal_ranges[fieldId];
    if (!range) return 'unknown';
    
    const numValue = Number(value);
    if (isNaN(numValue)) return 'unknown';
    
    if (range.min !== undefined && numValue < range.min) return 'abnormal';
    if (range.max !== undefined && numValue > range.max) return 'abnormal';
    
    return 'normal';
  };

  const canProceed = () => {
    switch (STEPS[step].key) {
      case 'sample':
        return !!selectedSample;
      case 'template':
        return !!selectedTemplate;
      case 'results':
        // Check required fields
        if (!selectedTemplate) return false;
        const requiredFields = selectedTemplate.fields.filter(f => f.required);
        return requiredFields.every(f => resultData[f.id] !== undefined && resultData[f.id] !== '');
      case 'review':
        return true;
      case 'next':
        return true;
      default:
        return true;
    }
  };

  const renderFieldInput = (field: LabTemplateField) => {
    const value = resultData[field.id];
    const rangeStatus = field.type === 'number' ? checkNormalRange(field.id, value) : 'unknown';
    const range = selectedTemplate?.normal_ranges[field.id];

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
            {field.unit && <span className="text-muted-foreground">({field.unit})</span>}
          </Label>
          {rangeStatus !== 'unknown' && (
            <Badge variant={rangeStatus === 'normal' ? 'default' : 'destructive'} className="text-xs">
              {rangeStatus}
            </Badge>
          )}
        </div>
        
        {field.type === 'text' && (
          <Input
            value={String(value || '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.name}
          />
        )}
        
        {field.type === 'number' && (
          <div className="space-y-1">
            <Input
              type="number"
              value={String(value || '')}
              onChange={(e) => updateField(field.id, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.name}
              className={cn(
                rangeStatus === 'abnormal' && "border-destructive"
              )}
            />
            {range && (
              <p className="text-xs text-muted-foreground">
                Normal range: {range.min ?? '—'} - {range.max ?? '—'} {field.unit}
              </p>
            )}
          </div>
        )}
        
        {field.type === 'select' && (
          <Select
            value={String(value || '')}
            onValueChange={(v) => updateField(field.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {field.type === 'checkbox' && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateField(field.id, checked)}
            />
            <span className="text-sm">{field.name}</span>
          </div>
        )}
        
        {field.type === 'textarea' && (
          <Textarea
            value={String(value || '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.name}
            rows={3}
          />
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (STEPS[step].key) {
      case 'sample':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اختر عينة في مرحلة المعالجة / Select a sample that is currently being processed.
            </p>
            
            {/* Search Input */}
            <Input
              placeholder={t("laboratory.results.searchSamples") || "البحث بالخيل أو رقم العينة..."}
              value={sampleSearch}
              onChange={(e) => setSampleSearch(e.target.value)}
              className="w-full"
            />
            
            {filteredSamples.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {sampleSearch 
                    ? "لا توجد عينات مطابقة للبحث."
                    : "لا توجد عينات في مرحلة المعالجة أو جميعها مكتملة."}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3 max-h-[40vh] overflow-y-auto">
                {filteredSamples.map((sample) => {
                  const sampleTemplateCount = sample.templates?.length || 0;
                  const sampleResultsCount = results.filter(r => r.sample_id === sample.id).length;
                  
                  return (
                    <Card
                      key={sample.id}
                      className={cn(
                        "p-4 cursor-pointer transition-colors",
                        selectedSample?.id === sample.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => setSelectedSample(sample)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {sample.horse?.name || sample.horse_name || t("laboratory.results.unknownHorse")}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {sample.physical_sample_id || sample.id.slice(0, 8)}
                          </p>
                          {sampleTemplateCount > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Progress 
                                value={(sampleResultsCount / sampleTemplateCount) * 100} 
                                className="h-1.5 flex-1 max-w-[100px]"
                              />
                              <span className="text-xs text-muted-foreground">
                                {sampleResultsCount}/{sampleTemplateCount}
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedSample?.id === sample.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'template':
        return (
          <div className="space-y-4">
            {/* Progress indicator for this sample */}
            {totalTemplates > 0 && (
              <Card className="p-3 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">تقدم التحاليل</span>
                  <span className="text-sm text-muted-foreground">
                    {completedCount}/{totalTemplates}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </Card>
            )}

            <p className="text-sm text-muted-foreground">
              اختر القالب لإدخال النتائج / Choose a template for entering results.
            </p>
            
            {orderedTemplates.length === 0 ? (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  لا توجد قوالب محددة لهذه العينة.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-2">
                {orderedTemplates.map((template, index) => {
                  const existingResult = sampleResults.find(r => r.template_id === template.id);
                  const isCompleted = !!existingResult;
                  const isDraft = existingResult?.status === 'draft';
                  const isReviewed = existingResult?.status === 'reviewed';
                  const isFinal = existingResult?.status === 'final';
                  
                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        "p-3 cursor-pointer transition-colors min-h-11",
                        isFinal && "opacity-60",
                        selectedTemplate?.id === template.id && "border-primary bg-primary/5",
                        !isFinal && "hover:border-primary/50"
                      )}
                      onClick={() => {
                        if (isFinal) {
                          return; // Can't edit final results
                        }
                        handleSelectTemplate(template);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm font-mono w-6">
                          #{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {template.name_ar || template.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {template.fields.length} حقل
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isFinal ? (
                            <Badge variant="secondary" className="text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              نهائي
                            </Badge>
                          ) : isReviewed ? (
                            <Badge variant="secondary" className="text-blue-600 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              مراجع
                            </Badge>
                          ) : isDraft ? (
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              <Edit className="h-3 w-3 mr-1" />
                              مسودة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              معلق
                            </Badge>
                          )}
                          {selectedTemplate?.id === template.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'results':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{selectedTemplate?.name_ar || selectedTemplate?.name}</h4>
              <div className="flex items-center gap-2">
                {editingResultId && (
                  <Badge variant="outline" className="text-amber-600">
                    <Edit className="h-3 w-3 mr-1" />
                    تعديل
                  </Badge>
                )}
                <Badge>{selectedTemplate?.fields.length} حقل</Badge>
              </div>
            </div>
            
            <div className="grid gap-4">
              {selectedTemplate?.fields.map(field => renderFieldInput(field))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>التقييم العام / Overall Assessment</Label>
              <Select value={flags} onValueChange={(v) => setFlags(v as LabResultFlags)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="normal">طبيعي / Normal</SelectItem>
                  <SelectItem value="abnormal">غير طبيعي / Abnormal</SelectItem>
                  <SelectItem value="critical">حرج / Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>التفسير / Interpretation</Label>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="ملاحظات إضافية أو تفسير..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">مراجعة النتائج</h4>
            
            <Card className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">العينة</span>
                <span className="font-medium">
                  {selectedSample?.horse?.name || selectedSample?.horse_name || t("laboratory.results.unknownHorse")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم العينة</span>
                <span className="font-mono text-sm">{selectedSample?.physical_sample_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">القالب</span>
                <span>{selectedTemplate?.name_ar || selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة</span>
                <Badge variant={flags === 'normal' ? 'default' : flags === 'critical' ? 'destructive' : 'secondary'}>
                  {flags === 'normal' ? 'طبيعي' : flags === 'abnormal' ? 'غير طبيعي' : 'حرج'}
                </Badge>
              </div>
            </Card>

            <Card className="p-4">
              <h5 className="font-medium mb-3">ملخص النتائج</h5>
              <div className="space-y-2 text-sm">
                {selectedTemplate?.fields.map(field => {
                  const value = resultData[field.id];
                  if (value === undefined || value === '') return null;
                  const rangeStatus = field.type === 'number' ? checkNormalRange(field.id, value) : 'unknown';
                  
                  return (
                    <div key={field.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{field.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{String(value)} {field.unit}</span>
                        {rangeStatus !== 'unknown' && (
                          <Badge variant={rangeStatus === 'normal' ? 'outline' : 'destructive'} className="text-xs">
                            {rangeStatus === 'normal' ? '✓' : '!'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {interpretation && (
              <Card className="p-4">
                <h5 className="font-medium mb-2">التفسير</h5>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
              </Card>
            )}

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                سيتم حفظ النتيجة كمسودة. يمكنك مراجعتها وإنهائها لاحقاً.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'next':
        // Recalculate remaining after saving
        const currentRemaining = orderedTemplates.filter(
          t => !completedTemplateIds.includes(t.id) && !savedInSession.includes(t.id)
        );
        
        return (
          <div className="space-y-4">
            {/* Success message */}
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <span className="font-medium">
                  تم حفظ نتيجة: {selectedTemplate?.name_ar || selectedTemplate?.name}
                </span>
              </AlertDescription>
            </Alert>

            {/* Remaining templates */}
            {currentRemaining.length > 0 ? (
              <>
                <Card className="p-4">
                  <h5 className="font-medium mb-3">القوالب المتبقية: {currentRemaining.length}</h5>
                  <div className="space-y-2">
                    {currentRemaining.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">#{orderedTemplates.indexOf(t) + 1}</span>
                        <span>{t.name_ar || t.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="grid gap-3">
                  <Button
                    onClick={handleContinueToNext}
                    className="w-full min-h-11"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    متابعة للقالب التالي
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onSuccess?.();
                    }}
                    className="w-full min-h-11"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    إغلاق والمتابعة لاحقاً
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  يمكنك إصدار نتيجة جزئية الآن أو إكمال بقية التحاليل
                </p>
              </>
            ) : (
              <>
                <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    تم إكمال جميع القوالب لهذه العينة!
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onSuccess?.();
                  }}
                  className="w-full min-h-11"
                >
                  <Check className="h-4 w-4 mr-2" />
                  إغلاق
                </Button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Determine if we're on the "next" step (which has its own navigation)
  const isNextStep = STEPS[step].key === 'next';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b">
          <DialogHeader>
            <DialogTitle>إدخال نتائج المختبر</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {STEPS.slice(0, 4).map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    i === step || (step === 4 && i === 3)
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step || (step === 4 && i < 4) ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      i < step ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-3">
            <h3 className="font-semibold">{STEPS[step].title}</h3>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {renderStepContent()}
        </div>

        {/* Fixed Footer - hide on "next" step since it has its own buttons */}
        {!isNextStep && (
          <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={step === 0 ? () => onOpenChange(false) : handlePrevious}
                className="flex-1 min-h-11"
              >
                {step === 0 ? (
                  'إلغاء'
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    السابق
                  </>
                )}
              </Button>
              
              {step < STEPS.findIndex(s => s.key === 'review') ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 min-h-11"
                >
                  التالي
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : step === STEPS.findIndex(s => s.key === 'review') ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="flex-1 min-h-11"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingResultId ? 'تحديث النتيجة' : 'حفظ النتيجة'}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
