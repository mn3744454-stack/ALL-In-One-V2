import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardFinance from "../DashboardFinance";

// Valid tab values that can be set via URL
type FinanceTab = "invoices" | "expenses" | "ledger";

/**
 * Wrapper component that handles tab preselection for Finance child routes.
 * Routes like /dashboard/finance/invoices will render DashboardFinance with the
 * invoices tab pre-selected.
 */
export default function DashboardFinanceWrapper() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  // Validate tab parameter
  const validTabs: FinanceTab[] = ["invoices", "expenses", "ledger"];
  const isValidTab = tab && validTabs.includes(tab as FinanceTab);

  useEffect(() => {
    // If invalid tab, redirect to finance overview
    if (tab && !isValidTab) {
      navigate("/dashboard/finance", { replace: true });
    }
  }, [tab, isValidTab, navigate]);

  // Pass the tab to DashboardFinance via props
  return <DashboardFinance initialTab={isValidTab ? (tab as FinanceTab) : undefined} />;
}
