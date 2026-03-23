import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, MapPin, User, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { BreedingAttempt } from "@/hooks/breeding/useBreedingAttempts";
import { BreedingStatusBadge } from "./BreedingStatusBadge";
import { displayHorseName, formatBreedingDate } from "@/lib/displayHelpers";
import { BilingualName } from "@/components/ui/BilingualName";

interface BreedingAttemptCardProps {
  attempt: BreedingAttempt;
  onEdit?: (attempt: BreedingAttempt) => void;
  onDelete?: (id: string) => void;
  onUpdateResult?: (id: string, result: "successful" | "unsuccessful") => void;
  onClick?: (attempt: BreedingAttempt) => void;
  canManage?: boolean;
}

export function BreedingAttemptCard({
  attempt,
  onEdit,
  onDelete,
  onUpdateResult,
  onClick,
  canManage = false,
}: BreedingAttemptCardProps) {
  const { t, lang } = useI18n();

  const methodKey = `breeding.methods.${attempt.attempt_type}` as const;
  const mareName = displayHorseName(attempt.mare?.name, attempt.mare?.name_ar, lang);
  const stallionName = attempt.stallion
    ? displayHorseName(attempt.stallion.name, attempt.stallion.name_ar, lang)
    : attempt.external_stallion_name || t("breeding.unknownStallion");
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => onClick?.(attempt)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={attempt.mare?.avatar_url || undefined} />
              <AvatarFallback>{(attempt.mare?.name || "M")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{mareName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>×</span>
                <span className={attempt.external_stallion_name && !attempt.stallion ? "italic" : ""}>
                  {stallionName}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <BreedingStatusBadge status={attempt.result} type="attempt" />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {attempt.result === "pending" && (
                    <>
                      <DropdownMenuItem onClick={() => onUpdateResult?.(attempt.id, "successful")}>
                        {t("breeding.markSuccessful")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateResult?.(attempt.id, "unsuccessful")}>
                        {t("breeding.markUnsuccessful")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onEdit?.(attempt)}>{t("common.edit")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(attempt.id)} className="text-destructive">
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary">{t(methodKey)}</Badge>
          {attempt.source_mode && attempt.source_mode !== "internal" && (
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              {t(`breeding.sourceMode.${attempt.source_mode}`)}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatBreedingDate(attempt.attempt_date)}</span>
          </div>
          {attempt.location_ref && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{attempt.location_ref}</span>
            </div>
          )}
          {(attempt.performer || attempt.assignee) && (
            <div className="flex items-center gap-1 col-span-2">
              <User className="h-3.5 w-3.5" />
              <span>{attempt.performer?.full_name || attempt.assignee?.full_name || t("breeding.assigned")}</span>
            </div>
          )}
        </div>
        {attempt.notes && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{attempt.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
