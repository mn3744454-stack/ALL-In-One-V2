import { useState } from "react";
import { useLabCredits } from "@/hooks/laboratory/useLabCredits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";

interface LabCreditsPanelProps {
  compact?: boolean;
}

export function LabCreditsPanel({ compact = false }: LabCreditsPanelProps) {
  const { wallet, transactions, loading, canManage, creditsEnabled, purchaseCredits } = useLabCredits();
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!creditsEnabled) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  const handlePurchase = async () => {
    const amount = parseInt(purchaseAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsPurchasing(true);
    await purchaseCredits(amount, purchaseNote || undefined);
    setIsPurchasing(false);
    setPurchaseAmount("");
    setPurchaseNote("");
    setDialogOpen(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
        <Wallet className="h-5 w-5 text-primary" />
        <div>
          <span className="text-sm text-muted-foreground">Credits:</span>
          <span className="ms-2 font-semibold text-lg">{wallet?.balance || 0}</span>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="ms-auto">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purchase Credits</DialogTitle>
                <DialogDescription>
                  Add credits to your lab wallet for sample processing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Number of Credits</label>
                  <Input
                    type="number"
                    min="1"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Input
                    value={purchaseNote}
                    onChange={(e) => setPurchaseNote(e.target.value)}
                    placeholder="Purchase note"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePurchase} disabled={isPurchasing || !purchaseAmount}>
                  {isPurchasing ? "Processing..." : "Purchase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Lab Credits
          </CardTitle>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 me-2" />
                  Purchase
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Purchase Credits</DialogTitle>
                  <DialogDescription>
                    Add credits to your lab wallet for sample processing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Number of Credits</label>
                    <Input
                      type="number"
                      min="1"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Note (optional)</label>
                    <Input
                      value={purchaseNote}
                      onChange={(e) => setPurchaseNote(e.target.value)}
                      placeholder="Purchase note"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePurchase} disabled={isPurchasing || !purchaseAmount}>
                    {isPurchasing ? "Processing..." : "Purchase"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">{wallet?.balance || 0}</div>

        {transactions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Transactions</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.slice(0, 10).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {txn.txn_type === 'purchase' && (
                      <ArrowDownCircle className="h-4 w-4 text-success" />
                    )}
                    {txn.txn_type === 'debit' && (
                      <ArrowUpCircle className="h-4 w-4 text-destructive" />
                    )}
                    {txn.txn_type === 'refund' && (
                      <RotateCcw className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm capitalize">{txn.txn_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(txn.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={txn.txn_type === 'debit' ? 'destructive' : 'default'}>
                    {txn.txn_type === 'debit' ? '-' : '+'}{txn.samples_count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
