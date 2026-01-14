import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface SampleProgressStepperProps {
  status: string;
  receivedAt?: string | null;
  accessionedAt?: string | null;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

interface Step {
  key: string;
  label: string;
  timestamp?: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function SampleProgressStepper({
  status,
  receivedAt,
  accessionedAt,
  processingStartedAt,
  completedAt,
  createdAt,
}: SampleProgressStepperProps) {
  const { t, dir } = useI18n();

  const steps: Step[] = [
    {
      key: "received",
      label: t("laboratory.progress.received"),
      timestamp: receivedAt,
      isCompleted: !!receivedAt || ["accessioned", "processing", "completed"].includes(status),
      isCurrent: status === "draft" && !receivedAt,
    },
    {
      key: "accessioned",
      label: t("laboratory.progress.accessioned"),
      timestamp: accessionedAt || (status !== "draft" ? createdAt : null),
      isCompleted: ["accessioned", "processing", "completed"].includes(status),
      isCurrent: status === "draft" && !!receivedAt,
    },
    {
      key: "processing",
      label: t("laboratory.progress.processing"),
      timestamp: processingStartedAt,
      isCompleted: ["processing", "completed"].includes(status),
      isCurrent: status === "accessioned",
    },
    {
      key: "completed",
      label: t("laboratory.progress.readyForResults"),
      timestamp: completedAt,
      isCompleted: status === "completed",
      isCurrent: status === "processing",
    },
  ];

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full py-2">
      <div className={cn(
        "flex items-start justify-between",
        dir === "rtl" && "flex-row-reverse"
      )}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div 
              key={step.key} 
              className={cn(
                "flex flex-col items-center flex-1 relative",
                !isLast && "after:content-[''] after:absolute after:top-3 after:h-0.5 after:bg-border",
                !isLast && dir === "ltr" && "after:left-1/2 after:right-[-50%]",
                !isLast && dir === "rtl" && "after:right-1/2 after:left-[-50%]",
                step.isCompleted && !isLast && "after:bg-primary"
              )}
            >
              {/* Step Icon */}
              <div className={cn(
                "z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors",
                step.isCompleted && "bg-primary border-primary text-primary-foreground",
                step.isCurrent && "border-primary bg-background animate-pulse",
                !step.isCompleted && !step.isCurrent && "border-muted-foreground/30 bg-background"
              )}>
                {step.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : step.isCurrent ? (
                  <Clock className="w-3 h-3 text-primary" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground/30" />
                )}
              </div>
              
              {/* Step Label */}
              <span className={cn(
                "mt-1.5 text-[10px] font-medium text-center leading-tight max-w-[60px]",
                step.isCompleted && "text-primary",
                step.isCurrent && "text-primary",
                !step.isCompleted && !step.isCurrent && "text-muted-foreground"
              )}>
                {step.label}
              </span>
              
              {/* Timestamp */}
              {step.timestamp && (
                <span className="mt-0.5 text-[9px] text-muted-foreground">
                  {formatTime(step.timestamp)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
