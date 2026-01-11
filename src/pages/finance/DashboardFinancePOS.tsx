import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Clock,
  Wallet,
  CreditCard,
  Receipt,
  Users,
  Package,
  ArrowRight,
} from "lucide-react";

export default function DashboardFinancePOS() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();

  // Permission check
  const canAccess = activeRole === "owner" || activeRole === "manager";

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-navy mb-2">
              {t("permissions.accessDenied")}
            </h2>
            <p className="text-muted-foreground">
              {t("permissions.accessDeniedDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const features = [
    {
      icon: Wallet,
      title: t("finance.pos.features.sessions"),
      description: t("finance.pos.features.sessionsDesc"),
    },
    {
      icon: ShoppingCart,
      title: t("finance.pos.features.quickSale"),
      description: t("finance.pos.features.quickSaleDesc"),
    },
    {
      icon: CreditCard,
      title: t("finance.pos.features.payments"),
      description: t("finance.pos.features.paymentsDesc"),
    },
    {
      icon: Receipt,
      title: t("finance.pos.features.receipts"),
      description: t("finance.pos.features.receiptsDesc"),
    },
    {
      icon: Users,
      title: t("finance.pos.features.customers"),
      description: t("finance.pos.features.customersDesc"),
    },
    {
      icon: Package,
      title: t("finance.pos.features.inventory"),
      description: t("finance.pos.features.inventoryDesc"),
    },
  ];

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <MobilePageHeader title={t("finance.pos.title")} backTo="/dashboard/finance" />

        <div className="p-4 lg:p-8">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-navy">{t("finance.pos.title")}</h1>
            <p className="text-muted-foreground">{t("finance.pos.subtitle")}</p>
          </div>

          {/* Coming Soon Banner */}
          <Card variant="elevated" className="mb-8 border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Clock className="w-8 h-8 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-semibold text-navy mb-2">
                    {t("finance.pos.comingSoon")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("finance.pos.comingSoonDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Preview */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {t("finance.pos.plannedFeatures")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-navy mb-1">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
