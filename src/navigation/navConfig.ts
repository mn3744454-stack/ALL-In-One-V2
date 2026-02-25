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
  Receipt,
  BookOpen,
  ShoppingCart,
  Tags,
  BarChart3,
  UserCircle,
  Activity,
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
  /** Workspace mode visibility: 'personal', 'organization', or 'both' (default) */
  visibleIn?: "personal" | "organization" | "both";
}

export const NAV_MODULES: NavModule[] = [
  {
    key: "dashboard",
    icon: Home,
    labelKey: "sidebar.dashboard",
    route: "/dashboard",
    visibleIn: "both",
  },
  {
    key: "community",
    icon: MessageSquare,
    labelKey: "sidebar.community",
    route: "/community",
    visibleIn: "both",
  },
  {
    key: "myBookings",
    icon: Ticket,
    labelKey: "sidebar.myBookings",
    route: "/dashboard/my-bookings",
    visibleIn: "personal",
  },
  {
    key: "myPayments",
    icon: CreditCard,
    labelKey: "sidebar.myPayments",
    route: "/dashboard/my-payments",
    visibleIn: "personal",
  },
  {
    key: "favorites",
    icon: Heart,
    labelKey: "sidebar.favorites",
    route: "/dashboard/favorites",
    visibleIn: "personal",
  },
  {
    key: "myPurchases",
    icon: ShoppingCart,
    labelKey: "sidebar.myPurchases",
    route: "/dashboard/my-purchases",
    visibleIn: "personal",
  },
  {
    key: "horses",
    icon: Heart,
    labelKey: "sidebar.horses",
    badgeKey: "horsesCount",
    visibleIn: "organization",
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
    visibleIn: "organization",
  },
  {
    key: "records",
    icon: FileText,
    labelKey: "sidebar.records",
    route: "/dashboard/records",
    visibleIn: "organization",
  },
  {
    key: "hr",
    icon: Users,
    labelKey: "sidebar.hr",
    roles: ["owner", "manager"],
    visibleIn: "organization",
    children: [
      {
        key: "team",
        icon: Users,
        labelKey: "hr.title",
        route: "/dashboard/hr",
      },
      {
        key: "payroll",
        icon: Wallet,
        labelKey: "hr.payroll.title",
        route: "/dashboard/hr/payroll",
      },
    ],
  },
  {
    key: "housing",
    icon: Warehouse,
    labelKey: "sidebar.housing",
    route: "/dashboard/housing",
    roles: ["owner", "manager"],
    moduleKey: "housing",
    visibleIn: "organization",
  },
  {
    key: "services",
    icon: Package,
    labelKey: "sidebar.services",
    route: "/dashboard/services",
    roles: ["owner", "manager"],
    visibleIn: "organization",
  },
  // Finance parent module with children
  {
    key: "finance",
    icon: Wallet,
    labelKey: "finance.title",
    roles: ["owner", "manager"],
    visibleIn: "organization",
    children: [
      {
        key: "overview",
        icon: BarChart3,
        labelKey: "finance.overview",
        route: "/dashboard/finance",
      },
      {
        key: "invoices",
        icon: FileText,
        labelKey: "finance.invoices.title",
        route: "/dashboard/finance/invoices",
      },
      {
        key: "expenses",
        icon: Receipt,
        labelKey: "finance.expenses.title",
        route: "/dashboard/finance/expenses",
      },
      {
        key: "payments",
        icon: CreditCard,
        labelKey: "sidebar.payments",
        route: "/dashboard/finance/payments",
      },
      {
        key: "revenue",
        icon: TrendingUp,
        labelKey: "sidebar.revenue",
        route: "/dashboard/finance/revenue",
      },
      {
        key: "ledger",
        icon: BookOpen,
        labelKey: "finance.ledger.title",
        route: "/dashboard/finance/ledger",
      },
      {
        key: "pos",
        icon: ShoppingCart,
        labelKey: "finance.pos.title",
        route: "/dashboard/finance/pos",
      },
      {
        key: "categories",
        icon: Tags,
        labelKey: "finance.categories.title",
        route: "/dashboard/finance/categories",
      },
      {
        key: "customer-balances",
        icon: UserCircle,
        labelKey: "finance.customerBalances.title",
        route: "/dashboard/finance/customer-balances",
      },
    ],
  },
  {
    key: "files",
    icon: FolderOpen,
    labelKey: "files.title",
    route: "/dashboard/files",
    roles: ["owner", "manager"],
    visibleIn: "organization",
  },
  {
    key: "sessions",
    icon: GraduationCap,
    labelKey: "sidebar.sessions",
    route: "/dashboard/academy/sessions",
    roles: ["owner", "manager"],
    tenantType: "academy",
    visibleIn: "organization",
  },
  {
    key: "manageBookings",
    icon: Ticket,
    labelKey: "sidebar.manageBookings",
    route: "/dashboard/academy/bookings",
    roles: ["owner", "manager"],
    tenantType: "academy",
    visibleIn: "organization",
  },
  {
    key: "publicProfile",
    icon: Globe,
    labelKey: "sidebar.publicProfile",
    route: "/dashboard/public-profile",
    roles: ["owner"],
    visibleIn: "organization",
  },
  {
    key: "settings",
    icon: Settings,
    labelKey: "sidebar.settings",
    route: "/dashboard/settings",
    roles: ["owner"],
    visibleIn: "organization",
  },
  // Doctor-only modules
  {
    key: "doctorOverview",
    icon: Activity,
    labelKey: "sidebar.doctorOverview",
    route: "/dashboard/doctor",
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorPatients",
    icon: Heart,
    labelKey: "sidebar.doctorPatients",
    route: "/dashboard/doctor/patients",
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorConsultations",
    icon: ClipboardList,
    labelKey: "sidebar.doctorConsultations",
    route: "/dashboard/doctor/consultations",
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorServices",
    icon: Package,
    labelKey: "sidebar.doctorServices",
    route: "/dashboard/doctor/services",
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorClients",
    icon: UserCircle,
    labelKey: "clients.title",
    route: "/dashboard/clients",
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorFinance",
    icon: Wallet,
    labelKey: "finance.title",
    route: "/dashboard/finance",
    roles: ["owner", "manager"],
    tenantType: "doctor",
    visibleIn: "organization",
  },
  {
    key: "doctorSettings",
    icon: Settings,
    labelKey: "sidebar.settings",
    route: "/dashboard/settings",
    roles: ["owner"],
    tenantType: "doctor",
    visibleIn: "organization",
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
