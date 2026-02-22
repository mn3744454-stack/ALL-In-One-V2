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
  type LucideIcon,
} from "lucide-react";

export interface NavModuleChild {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  route: string;
  permissionKey?: string;
  moduleKey?: "breeding" | "vet" | "lab" | "movement" | "housing";
}

export interface WorkspaceNavModule {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  route?: string;
  permissionKey?: string;
  roles?: string[];
  children?: NavModuleChild[];
  badgeKey?: string;
  highlight?: boolean;
  moduleKey?: "breeding" | "vet" | "lab" | "movement" | "housing";
  tenantType?: string;
}

// Personal workspace modules (user-space)
export const PERSONAL_NAV_MODULES: WorkspaceNavModule[] = [
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
    permissionKey: "community.view",
  },
  {
    key: "myBookings",
    icon: Ticket,
    labelKey: "sidebar.myBookings",
    route: "/dashboard/my-bookings",
  },
  {
    key: "myPayments",
    icon: CreditCard,
    labelKey: "sidebar.myPayments",
    route: "/dashboard/my-payments",
  },
];

// Organization workspace modules (tenant-space)
export const ORG_NAV_MODULES: WorkspaceNavModule[] = [
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
    permissionKey: "community.view",
  },
  {
    key: "bookings",
    icon: Ticket,
    labelKey: "sidebar.manageBookings",
    route: "/dashboard/academy/bookings",
    permissionKey: "bookings.view",
    roles: ["owner", "manager"],
    tenantType: "academy",
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
    roles: ["owner", "manager"],
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
  },
  {
    key: "services",
    icon: Package,
    labelKey: "sidebar.services",
    route: "/dashboard/services",
    roles: ["owner", "manager"],
  },
  {
    key: "finance",
    icon: Wallet,
    labelKey: "finance.title",
    roles: ["owner", "manager"],
    permissionKey: "payments.view",
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
        permissionKey: "payments.view",
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
        key: "clients",
        icon: UserCircle,
        labelKey: "clients.title",
        route: "/dashboard/clients",
      },
    ],
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
