import { 
  FlaskConical, 
  FileText, 
  GitCompare, 
  FileStack, 
  Settings,
  Clock,
  Users,
  Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface LabNavSection {
  key: string;
  tab: string;
  icon: LucideIcon;
  labelKey: string;
  route: string;
}

/**
 * Primary lab navigation sections for labMode="full" (standalone Lab tenant).
 * These become top-level sidebar items instead of being nested under Horses.
 */
export const LAB_NAV_SECTIONS: LabNavSection[] = [
  { 
    key: "samples", 
    tab: "samples", 
    icon: FlaskConical, 
    labelKey: "laboratory.nav.samples",
    route: "/dashboard/laboratory?tab=samples",
  },
  { 
    key: "results", 
    tab: "results", 
    icon: FileText, 
    labelKey: "laboratory.nav.results",
    route: "/dashboard/laboratory?tab=results",
  },
  { 
    key: "horses", 
    tab: "horses", 
    icon: Heart, 
    labelKey: "laboratory.labHorses.title",
    route: "/dashboard/laboratory?tab=horses",
  },
  { 
    key: "compare", 
    tab: "compare", 
    icon: GitCompare, 
    labelKey: "laboratory.nav.compare",
    route: "/dashboard/laboratory?tab=compare",
  },
  { 
    key: "timeline", 
    tab: "timeline", 
    icon: Clock, 
    labelKey: "laboratory.nav.timeline",
    route: "/dashboard/laboratory?tab=timeline",
  },
  { 
    key: "templates", 
    tab: "templates", 
    icon: FileStack, 
    labelKey: "laboratory.nav.templates",
    route: "/dashboard/laboratory?tab=templates",
  },
  { 
    key: "settings", 
    tab: "settings", 
    icon: Settings, 
    labelKey: "laboratory.nav.settings",
    route: "/dashboard/laboratory?tab=settings",
  },
  { 
    key: "clients", 
    tab: null as unknown as string, // Not a lab tab, standalone page
    icon: Users, 
    labelKey: "clients.title",
    route: "/dashboard/clients",
  },
];

/**
 * Mobile bottom nav items for Lab tenants (labMode="full").
 * Replaces the default Home/Horses/Schedule/More pattern.
 */
export const LAB_MOBILE_BOTTOM_NAV = [
  { 
    key: "home", 
    tab: null,
    icon: null, // Will use Home icon
    labelKey: "nav.home", 
    route: "/dashboard",
  },
  { 
    key: "samples", 
    tab: "samples", 
    icon: FlaskConical, 
    labelKey: "laboratory.nav.samples",
    route: "/dashboard/laboratory?tab=samples",
  },
  { 
    key: "results", 
    tab: "results", 
    icon: FileText, 
    labelKey: "laboratory.nav.results",
    route: "/dashboard/laboratory?tab=results",
  },
  { 
    key: "more", 
    tab: null,
    icon: null, // Will use LayoutGrid icon
    labelKey: "nav.more", 
    route: null, // Opens launcher
  },
];
