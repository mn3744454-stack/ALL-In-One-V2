import {
  Home,
  MessageSquare,
  Ticket,
  CreditCard,
  Heart,
  ClipboardList,
  Baby,
  Stethoscope,
  FlaskConical,
  ArrowLeftRight,
  Calendar,
  FileText,
  Users,
  Warehouse,
  Package,
  TrendingUp,
  Wallet,
  FolderOpen,
  GraduationCap,
  Globe,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavModuleChild {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  route: string;
  permissionKey?: string;
  /** If true, only show when module is enabled */
  moduleKey?: "breeding" | "vet" | "lab" | "movement" | "housing";
}

export interface NavModule {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  route?: string;
  permissionKey?: string;
  /** Only show for these roles */
  roles?: string[];
  /** Children for drill-down */
  children?: NavModuleChild[];
  /** If true, show badge with count */
  badgeKey?: string;
  /** If true, highlight as incomplete */
  highlight?: boolean;
  /** If true, only show when module is enabled */
  moduleKey?: "breeding" | "vet" | "lab" | "movement" | "housing";
  /** Only show for specific tenant types */
  tenantType?: string;
}

export const NAV_MODULES: NavModule[] = [
  {
    key: "dashboard",
    icon: Home,
    labelKey: "sidebar.dashboard",
    route: "/dashboard",
  },
  {
    key: "community",
    icon: MessageSquare,
    labelKey: "sidebar.community",
    route: "/community",
  },
  {
    key: "myBookings",
    icon: Ticket,
    labelKey: "sidebar.myBookings",
    route: "/dashboard/my-bookings",
  },
  {
    key: "payments",
    icon: CreditCard,
    labelKey: "sidebar.payments",
    route: "/dashboard/payments",
  },
  {
    key: "horses",
    icon: Heart,
    labelKey: "sidebar.horses",
    badgeKey: "horsesCount",
    children: [
      {
        key: "myHorses",
        icon: Heart,
        labelKey: "sidebar.myHorses",
        route: "/dashboard/horses",
      },
      {
        key: "orders",
        icon: ClipboardList,
        labelKey: "sidebar.orders",
        route: "/dashboard/horse-orders",
      },
      {
        key: "breeding",
        icon: Baby,
        labelKey: "sidebar.breeding",
        route: "/dashboard/breeding",
        moduleKey: "breeding",
      },
      {
        key: "vetHealth",
        icon: Stethoscope,
        labelKey: "sidebar.vetHealth",
        route: "/dashboard/vet",
        moduleKey: "vet",
      },
      {
        key: "laboratory",
        icon: FlaskConical,
        labelKey: "sidebar.laboratory",
        route: "/dashboard/laboratory",
        moduleKey: "lab",
      },
      {
        key: "movement",
        icon: ArrowLeftRight,
        labelKey: "sidebar.movement",
        route: "/dashboard/movement",
        moduleKey: "movement",
      },
    ],
  },
  {
    key: "schedule",
    icon: Calendar,
    labelKey: "sidebar.schedule",
    route: "/dashboard/schedule",
  },
  {
    key: "records",
    icon: FileText,
    labelKey: "sidebar.records",
    route: "/dashboard/records",
  },
  {
    key: "hr",
    icon: Users,
    labelKey: "sidebar.hr",
    route: "/dashboard/hr",
    roles: ["owner", "manager"],
  },
  {
    key: "housing",
    icon: Warehouse,
    labelKey: "sidebar.housing",
    route: "/dashboard/housing",
    roles: ["owner", "manager"],
    moduleKey: "housing",
  },
  {
    key: "services",
    icon: Package,
    labelKey: "sidebar.services",
    route: "/dashboard/services",
    roles: ["owner", "manager"],
  },
  {
    key: "revenue",
    icon: TrendingUp,
    labelKey: "sidebar.revenue",
    route: "/dashboard/revenue",
    roles: ["owner", "manager"],
  },
  {
    key: "finance",
    icon: Wallet,
    labelKey: "finance.title",
    route: "/dashboard/finance",
    roles: ["owner", "manager"],
  },
  {
    key: "files",
    icon: FolderOpen,
    labelKey: "files.title",
    route: "/dashboard/files",
    roles: ["owner", "manager"],
  },
  {
    key: "sessions",
    icon: GraduationCap,
    labelKey: "sidebar.sessions",
    route: "/dashboard/academy/sessions",
    roles: ["owner", "manager"],
    tenantType: "academy",
  },
  {
    key: "manageBookings",
    icon: Ticket,
    labelKey: "sidebar.manageBookings",
    route: "/dashboard/academy/bookings",
    roles: ["owner", "manager"],
    tenantType: "academy",
  },
  {
    key: "publicProfile",
    icon: Globe,
    labelKey: "sidebar.publicProfile",
    route: "/dashboard/public-profile",
    roles: ["owner"],
  },
  {
    key: "settings",
    icon: Settings,
    labelKey: "sidebar.settings",
    route: "/dashboard/settings",
    roles: ["owner"],
  },
];

// Bottom nav items for mobile - primary destinations
export const MOBILE_BOTTOM_NAV = [
  {
    key: "home",
    icon: Home,
    labelKey: "nav.home",
    route: "/dashboard",
  },
  {
    key: "horses",
    icon: Heart,
    labelKey: "sidebar.horses",
    route: "/dashboard/horses",
  },
  {
    key: "schedule",
    icon: Calendar,
    labelKey: "sidebar.schedule",
    route: "/dashboard/schedule",
  },
  {
    key: "more",
    icon: Settings,
    labelKey: "nav.more",
    route: null, // Opens launcher
  },
];
