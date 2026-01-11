import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, MapPin, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { BreedingAttempt } from "@/hooks/breeding/useBreedingAttempts";
import { BreedingStatusBadge } from "./BreedingStatusBadge";
import { cn } from "@/lib/utils";

interface BreedingAttemptCardProps {
  attempt: BreedingAttempt;
  onEdit?: (attempt: BreedingAttempt) => void;
  onDelete?: (id: string) => void;
  onUpdateResult?: (id: string, result: "successful" | "unsuccessful") => void;
  canManage?: boolean;
}

const attemptTypeKeys: Record<string, string> = {
  natural: "breeding.attemptTypes.natural",
  ai_fresh: "breeding.attemptTypes.aiFresh",
  ai_frozen: "breeding.attemptTypes.aiFrozen",
  embryo_transfer: "breeding.attemptTypes.embryoTransfer",
};

export function BreedingAttemptCard({
  attempt,
  onEdit,
  onDelete,
  onUpdateResult,
  canManage = false,
}: BreedingAttemptCardProps) {
  const { t } = useI18n();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={attempt.mare?.avatar_url || undefined} />
              <AvatarFallback>{(attempt.mare?.name || "M")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{attempt.mare?.name || t("breeding.unknownMare")}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>×</span>
                {attempt.stallion ? (
                  <span>{attempt.stallion.name}</span>
                ) : (
                  <span className="italic">{attempt.external_stallion_name || t("scope.external")}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BreedingStatusBadge status={attempt.result} type="attempt" />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {attempt.result === "unknown" && (
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
          <Badge variant="secondary">{t(attemptTypeKeys[attempt.attempt_type]) || attempt.attempt_type}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(attempt.attempt_date), "PP")}</span>
          </div>
          {attempt.location_ref && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{attempt.location_ref}</span>
            </div>
          )}
          {attempt.assignee && (
            <div className="flex items-center gap-1 col-span-2">
              <User className="h-3.5 w-3.5" />
              <span>{attempt.assignee.full_name || t("breeding.assigned")}</span>
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