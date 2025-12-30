import { useState, useEffect } from "react";
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
import { Loader2, ChevronLeft, ChevronRight, Check, FileText, FlaskConical, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabTemplates, type LabTemplate, type LabTemplateField } from "@/hooks/laboratory/useLabTemplates";
import { useLabResults, type CreateLabResultData, type LabResultFlags } from "@/hooks/laboratory/useLabResults";
import type { Json } from "@/integrations/supabase/types";

interface CreateResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSample?: LabSample;
  onSuccess?: () => void;
}

const STEPS = [
  { key: 'sample', title: 'Select Sample', icon: FlaskConical },
  { key: 'template', title: 'Select Template', icon: FileText },
  { key: 'results', title: 'Enter Results', icon: FileText },
  { key: 'review', title: 'Review', icon: Check },
];

export function CreateResultDialog({
  open,
  onOpenChange,
  preselectedSample,
  onSuccess,
}: CreateResultDialogProps) {
  const { samples } = useLabSamples({ status: 'processing' });
  const { activeTemplates } = useLabTemplates();
  const { createResult } = useLabResults();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(preselectedSample || null);
  const [selectedTemplate, setSelectedTemplate] = useState<LabTemplate | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<LabResultFlags>('normal');
  const [interpretation, setInterpretation] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedSample(preselectedSample || null);
      setSelectedTemplate(null);
      setResultData({});
      setFlags('normal');
      setInterpretation('');
    }
  }, [open, preselectedSample]);

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

      const result = await createResult(data);
      
      if (result) {
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
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
              Select a sample that is currently being processed.
            </p>
            
            {samples.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No samples are currently in processing. Start processing a sample first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                {samples.map((sample) => (
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
                      <div>
                        <p className="font-medium">{sample.horse?.name || 'Unknown Horse'}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {sample.physical_sample_id || sample.id.slice(0, 8)}
                        </p>
                      </div>
                      {selectedSample?.id === sample.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'template':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a template for entering results.
            </p>
            
            {activeTemplates.length === 0 ? (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  <div className="space-y-3">
                    <p>لا توجد قوالب متاحة. يجب إنشاء قالب أولاً لتسجيل النتائج.</p>
                    <p className="text-sm">No templates available. Create a template first to enter results.</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        onOpenChange(false);
                      }}
                    >
                      Go to Templates Tab
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                {activeTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "p-4 cursor-pointer transition-colors",
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setResultData({});
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.fields.length} fields • {template.template_type || 'Standard'}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'results':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{selectedTemplate?.name}</h4>
              <Badge>{selectedTemplate?.fields.length} fields</Badge>
            </div>
            
            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
              {selectedTemplate?.fields.map(field => renderFieldInput(field))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Overall Assessment</Label>
              <Select value={flags} onValueChange={(v) => setFlags(v as LabResultFlags)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interpretation / Notes</Label>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Additional notes or interpretation..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Review Results</h4>
            
            <Card className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample</span>
                <span className="font-medium">{selectedSample?.horse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample ID</span>
                <span className="font-mono text-sm">{selectedSample?.physical_sample_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span>{selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall Status</span>
                <Badge variant={flags === 'normal' ? 'default' : flags === 'critical' ? 'destructive' : 'secondary'}>
                  {flags}
                </Badge>
              </div>
            </Card>

            <Card className="p-4">
              <h5 className="font-medium mb-3">Results Summary</h5>
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
                <h5 className="font-medium mb-2">Interpretation</h5>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
              </Card>
            )}

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Result will be saved as draft. You can review and finalize it later.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enter Lab Results</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
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

        <div className="text-center mb-4">
          <h3 className="font-semibold">{STEPS[step].title}</h3>
        </div>

        {/* Step Content */}
        <div className="min-h-[200px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={step === 0 ? () => onOpenChange(false) : handlePrevious}
            className="flex-1"
          >
            {step === 0 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </>
            )}
          </Button>
          
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Result
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
