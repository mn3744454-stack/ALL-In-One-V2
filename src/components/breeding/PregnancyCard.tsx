import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Clock, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pregnancy } from "@/hooks/breeding/usePregnancies";
import { BreedingStatusBadge } from "./BreedingStatusBadge";

interface PregnancyCardProps {
  pregnancy: Pregnancy;
  onView?: (pregnancy: Pregnancy) => void;
  onAddCheck?: (pregnancy: Pregnancy) => void;
  onClose?: (id: string, reason: "foaled" | "abortion" | "not_pregnant") => void;
  canManage?: boolean;
}

export function PregnancyCard({
  pregnancy,
  onView,
  onAddCheck,
  onClose,
  canManage = false,
}: PregnancyCardProps) {
  const daysPregnant = pregnancy.status === "pregnant" || pregnancy.status === "open"
    ? differenceInDays(new Date(), new Date(pregnancy.start_date))
    : null;

  const isActive = !pregnancy.ended_at;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView?.(pregnancy)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={pregnancy.mare?.avatar_url || undefined} />
              <AvatarFallback>{(pregnancy.mare?.name || "M")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{pregnancy.mare?.name || "Unknown Mare"}</h3>
              {pregnancy.source_attempt && (
                <p className="text-xs text-muted-foreground">
                  From attempt on {format(new Date(pregnancy.source_attempt.attempt_date), "PP")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <BreedingStatusBadge status={pregnancy.status} type="pregnancy" />
            <BreedingStatusBadge status={pregnancy.verification_state} type="verification" />
            {canManage && isActive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAddCheck?.(pregnancy)}>
                    Add Check
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {pregnancy.status === "pregnant" && (
                    <>
                      <DropdownMenuItem onClick={() => onClose?.(pregnancy.id, "foaled")}>
                        Mark as Foaled
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onClose?.(pregnancy.id, "abortion")}>
                        Mark Abortion
                      </DropdownMenuItem>
                    </>
                  )}
                  {(pregnancy.status === "open" || pregnancy.status === "open_by_abortion") && (
                    <DropdownMenuItem onClick={() => onClose?.(pregnancy.id, "not_pregnant")}>
                      Close - Not Pregnant
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Started {format(new Date(pregnancy.start_date), "PP")}</span>
          </div>
          {daysPregnant !== null && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{daysPregnant} days</span>
            </div>
          )}
          {pregnancy.expected_due_date && (
            <div className="flex items-center gap-1 col-span-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due {format(new Date(pregnancy.expected_due_date), "PP")}</span>
            </div>
          )}
          {pregnancy.assignee && (
            <div className="flex items-center gap-1 col-span-2">
              <User className="h-3.5 w-3.5" />
              <span>{pregnancy.assignee.full_name || "Assigned"}</span>
            </div>
          )}
        </div>
        {pregnancy.ended_at && (
          <div className="mt-2 pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              Ended: {pregnancy.end_reason?.replace(/_/g, " ")}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
