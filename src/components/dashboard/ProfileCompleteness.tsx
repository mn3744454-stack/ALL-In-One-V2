import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { TenantPublicSettings } from "@/hooks/useTenantPublicSettings";

interface ProfileCompletenessProps {
  settings: TenantPublicSettings | null;
  percentage: number;
}

export const ProfileCompleteness = ({
  settings,
  percentage,
}: ProfileCompletenessProps) => {
  if (!settings) return null;

  const checklist = [
    { label: "Unique URL (slug)", done: !!settings.slug },
    { label: "Business name", done: !!(settings.public_name || settings.name) },
    { label: "Description", done: !!settings.public_description },
    { label: "Location", done: !!(settings.public_location_text || settings.region) },
    { label: "Phone number", done: !!settings.public_phone },
    { label: "Email address", done: !!settings.public_email },
    { label: "Logo", done: !!settings.logo_url },
    { label: "Cover image", done: !!settings.cover_url },
    { label: "Tags/Categories", done: !!(settings.tags && settings.tags.length > 0) },
  ];

  const getProgressColor = () => {
    if (percentage >= 80) return "bg-success";
    if (percentage >= 50) return "bg-gold";
    return "bg-warning";
  };

  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-navy">Profile Completeness</h4>
        <span className="text-sm font-semibold text-gold">{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2 mb-4" />

      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={
                item.done ? "text-muted-foreground" : "text-muted-foreground/70"
              }
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
