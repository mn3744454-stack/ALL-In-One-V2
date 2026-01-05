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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, FlaskConical, AlertCircle, Check, CreditCard, TestTube2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useClients } from "@/hooks/useClients";
import { useLabSamples, type CreateLabSampleData, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabCredits } from "@/hooks/laboratory/useLabCredits";
import { useLabTestTypes } from "@/hooks/laboratory/useLabTestTypes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CreateSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedOrderId?: string;
  retestOfSample?: LabSample;
  preselectedHorseId?: string;
  onSuccess?: () => void;
}

const STEPS = [
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'tests', title: 'Test Types', titleAr: 'أنواع التحاليل', icon: TestTube2 },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'billing', title: 'Billing', titleAr: 'الفوترة', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

interface FormData {
  horse_id: string;
  collection_date: Date;
  physical_sample_id: string;
  client_id: string;
  notes: string;
  test_type_ids: string[];
}

export function CreateSampleDialog({
  open,
  onOpenChange,
  relatedOrderId,
  retestOfSample,
  preselectedHorseId,
  onSuccess,
}: CreateSampleDialogProps) {
  const { horses } = useHorses();
  const { clients } = useClients();
  const { createSample } = useLabSamples();
  const { wallet, creditsEnabled, debitCredits } = useLabCredits();
  const { activeTypes: testTypes, loading: testTypesLoading } = useLabTestTypes();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    horse_id: preselectedHorseId || retestOfSample?.horse_id || '',
    collection_date: new Date(),
    physical_sample_id: '',
    client_id: retestOfSample?.client_id || '',
    notes: '',
    test_type_ids: [],
  });

  // Determine if this is a free retest
  const isRetest = !!retestOfSample;
  const isFreeRetest = isRetest && retestOfSample.retest_count < 3;

  // Calculate effective steps (skip billing if credits disabled or free retest)
  const effectiveSteps = STEPS.filter(s => {
    if (s.conditional && (!creditsEnabled || isFreeRetest)) return false;
    return true;
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      // For retests, copy test types from original sample
      const retestTestTypeIds = retestOfSample?.test_types?.map(tt => tt.test_type.id) || [];
      setFormData({
        horse_id: preselectedHorseId || retestOfSample?.horse_id || '',
        collection_date: new Date(),
        physical_sample_id: retestOfSample?.physical_sample_id ? `${retestOfSample.physical_sample_id}-R${(retestOfSample.retest_count || 0) + 1}` : '',
        client_id: retestOfSample?.client_id || '',
        notes: isRetest ? `Retest of sample ${retestOfSample?.physical_sample_id || retestOfSample?.id}` : '',
        test_type_ids: retestTestTypeIds,
      });
    }
  }, [open, preselectedHorseId, retestOfSample, isRetest]);

  const generateSampleId = () => {
    const prefix = 'LAB';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleNext = () => {
    if (step < effectiveSteps.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.horse_id) return;

    setLoading(true);
    try {
      const sampleData: CreateLabSampleData = {
        horse_id: formData.horse_id,
        collection_date: formData.collection_date.toISOString(),
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        client_id: formData.client_id || undefined,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        test_type_ids: formData.test_type_ids.length > 0 ? formData.test_type_ids : undefined,
      };

      const sample = await createSample(sampleData);
      
      if (sample) {
        // If credits enabled and not a free retest, debit credits
        if (creditsEnabled && !isFreeRetest && sample.id) {
          await debitCredits(sample.id, 1);
        }
        
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedHorse = horses.find(h => h.id === formData.horse_id);
  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedTestTypes = testTypes.filter(t => formData.test_type_ids.includes(t.id));

  const toggleTestType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      test_type_ids: prev.test_type_ids.includes(typeId)
        ? prev.test_type_ids.filter(id => id !== typeId)
        : [...prev.test_type_ids, typeId],
    }));
  };

  const canProceed = () => {
    const currentStep = effectiveSteps[step];
    switch (currentStep.key) {
      case 'basic':
        return !!formData.horse_id && !!formData.collection_date;
      case 'tests':
        return true; // Test types are optional
      case 'details':
        return true;
      case 'billing':
        return !creditsEnabled || (wallet?.balance || 0) >= 1;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    const currentStep = effectiveSteps[step];
    
    switch (currentStep.key) {
      case 'basic':
        return (
          <div className="space-y-4">
            {isRetest && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Creating retest #{(retestOfSample?.retest_count || 0) + 1} for sample {retestOfSample?.physical_sample_id}
                  {isFreeRetest && <Badge className="ml-2 bg-green-500">Free Retest</Badge>}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Horse *</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData({ ...formData, horse_id: value })}
                disabled={isRetest}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Collection Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.collection_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.collection_date
                      ? format(formData.collection_date, "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.collection_date}
                    onSelect={(date) => date && setFormData({ ...formData, collection_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Sample ID</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.physical_sample_id}
                  onChange={(e) => setFormData({ ...formData, physical_sample_id: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, physical_sample_id: generateSampleId() })}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate a unique ID
              </p>
            </div>
        </div>
        );

      case 'tests':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>اختر أنواع التحاليل / Select Test Types</Label>
              {formData.test_type_ids.length > 0 && (
                <Badge variant="secondary">{formData.test_type_ids.length} selected</Badge>
              )}
            </div>
            
            {testTypesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : testTypes.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No test types configured. You can add them in Laboratory Settings.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[280px] rounded-md border p-2">
                <div className="space-y-1">
                  {testTypes.map((testType) => (
                    <div
                      key={testType.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-11",
                        "hover:bg-accent",
                        formData.test_type_ids.includes(testType.id) && "bg-primary/10 border border-primary/20"
                      )}
                      onClick={() => toggleTestType(testType.id)}
                    >
                      <Checkbox
                        checked={formData.test_type_ids.includes(testType.id)}
                        onCheckedChange={() => toggleTestType(testType.id)}
                        className="min-h-5 min-w-5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {testType.name_ar || testType.name}
                        </div>
                        {testType.name_ar && (
                          <div className="text-xs text-muted-foreground">{testType.name}</div>
                        )}
                        {testType.code && (
                          <Badge variant="outline" className="text-xs mt-1">{testType.code}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <p className="text-xs text-muted-foreground">
              اختياري - يمكنك تحديد التحاليل المطلوبة لهذه العينة
            </p>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client (Optional)</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Sample collection notes, special handling instructions..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Current Balance</span>
                <Badge variant={wallet && wallet.balance > 0 ? "default" : "destructive"}>
                  {wallet?.balance || 0} Credits
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sample Cost</span>
                  <span>1 Credit</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Balance After</span>
                  <span>{(wallet?.balance || 0) - 1} Credits</span>
                </div>
              </div>
            </Card>

            {(!wallet || wallet.balance < 1) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient credits. Please purchase more credits to continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Review Sample Information</h4>
            
            <Card className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horse</span>
                <span className="font-medium">{selectedHorse?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collection Date</span>
                <span>{format(formData.collection_date, "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample ID</span>
                <span className="font-mono text-sm">
                  {formData.physical_sample_id || '(Auto-generated)'}
                </span>
              </div>
              {selectedClient && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span>{selectedClient.name}</span>
                </div>
              )}
              {isRetest && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retest Of</span>
                  <span>{retestOfSample?.physical_sample_id}</span>
                </div>
              )}
              {relatedOrderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Related Order</span>
                  <span className="font-mono text-sm">{relatedOrderId.slice(0, 8)}...</span>
                </div>
              )}
              {selectedTestTypes.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Test Types</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedTestTypes.map(tt => (
                      <Badge key={tt.id} variant="outline" className="text-xs">
                        {tt.name_ar || tt.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {formData.notes && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Notes</span>
                  <p className="text-sm mt-1">{formData.notes}</p>
                </div>
              )}
            </Card>

            {creditsEnabled && !isFreeRetest && (
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  1 credit will be deducted from your balance upon submission.
                </AlertDescription>
              </Alert>
            )}

            {isFreeRetest && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  This retest is free (within retest policy window).
                </AlertDescription>
              </Alert>
            )}
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
          <DialogTitle>
            {isRetest ? 'Create Retest Sample' : 'New Lab Sample'}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {effectiveSteps.map((s, i) => (
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
              {i < effectiveSteps.length - 1 && (
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
          <h3 className="font-semibold">{effectiveSteps[step].title}</h3>
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
          
          {step < effectiveSteps.length - 1 ? (
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
              Create Sample
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
