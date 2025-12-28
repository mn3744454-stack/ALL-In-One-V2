import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import { VetPriorityBadge } from "./VetPriorityBadge";
import { VetCategoryBadge } from "./VetCategoryBadge";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";
import { format } from "date-fns";
import { Calendar, Clock, User, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VetTreatmentCardProps {
  treatment: VetTreatment;
  onView?: (treatment: VetTreatment) => void;
  onEdit?: (treatment: VetTreatment) => void;
}

export function VetTreatmentCard({ treatment, onView, onEdit }: VetTreatmentCardProps) {
  const horseName = treatment.horse?.name || "Unknown Horse";
  const horseAvatar = treatment.horse?.avatar_url;

  return (
    <Card variant="elevated" className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Horse Avatar */}
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={horseAvatar || undefined} alt={horseName} />
            <AvatarFallback className="bg-gold/20 text-gold-dark font-semibold rounded-xl">
              {horseName[0]}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-navy truncate">{treatment.title}</h3>
                <p className="text-sm text-muted-foreground">{horseName}</p>
              </div>
              <VetStatusBadge status={treatment.status} />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <VetCategoryBadge category={treatment.category} />
              <VetPriorityBadge priority={treatment.priority} />
              <Badge variant="outline" className="text-xs">
                {treatment.service_mode === 'internal' ? 'Internal' : 'External'}
              </Badge>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {treatment.scheduled_for && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(treatment.scheduled_for), "MMM d, yyyy")}
                </span>
              )}
              {treatment.assignee && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {treatment.assignee.full_name}
                </span>
              )}
              {treatment.service_mode === 'external' && (treatment.provider?.name || treatment.external_provider_name) && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {treatment.provider?.name || treatment.external_provider_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(treatment.created_at), "MMM d")}
              </span>
            </div>

            {/* Notes Preview */}
            {treatment.notes && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {treatment.notes}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onView || onEdit) && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            {onView && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(treatment)}>
                View Details
              </Button>
            )}
            {onEdit && treatment.status !== 'completed' && treatment.status !== 'cancelled' && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(treatment)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
