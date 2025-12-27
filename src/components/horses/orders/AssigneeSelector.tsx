import { useState, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface TenantMember {
  id: string;
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface AssigneeSelectorProps {
  selectedAssigneeId?: string | null;
  onAssigneeSelect: (assigneeId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  employee: "Employee",
  horse_owner: "Horse Owner",
};

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  manager: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  employee: "bg-slate-500/20 text-slate-600 border-slate-500/30",
  horse_owner: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

export function AssigneeSelector({
  selectedAssigneeId,
  onAssigneeSelect,
  placeholder = "Select assignee",
  disabled = false,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeTenant) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenant_members')
          .select(`
            id,
            user_id,
            role,
            profile:profiles!tenant_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('tenant_id', activeTenant.tenant.id)
          .eq('is_active', true);

        if (error) throw error;
        setMembers((data || []) as unknown as TenantMember[]);
      } catch (error) {
        console.error('Error fetching tenant members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [activeTenant]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.user_id === selectedAssigneeId);
  }, [members, selectedAssigneeId]);

  const handleSelect = (userId: string) => {
    if (userId === selectedAssigneeId) {
      onAssigneeSelect(null);
    } else {
      onAssigneeSelect(userId);
    }
    setOpen(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {selectedMember ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedMember.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedMember.profile?.full_name || null, selectedMember.profile?.email || '')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedMember.profile?.full_name || selectedMember.profile?.email}
              </span>
              <Badge variant="outline" className={cn("text-[10px]", roleColors[selectedMember.role])}>
                {roleLabels[selectedMember.role] || selectedMember.role}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.profile?.full_name || ''} ${member.profile?.email || ''}`}
                  onSelect={() => handleSelect(member.user_id)}
                  className="flex items-center gap-3 py-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedAssigneeId === member.user_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(member.profile?.full_name || null, member.profile?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.profile?.full_name || member.profile?.email}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", roleColors[member.role])}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </div>
                    {member.profile?.full_name && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {member.profile?.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}