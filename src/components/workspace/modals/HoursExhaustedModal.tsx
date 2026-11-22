"use client";

import { Clock, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import {
  formatHours,
  useAccountStore,
} from "@/stores/useAccountStore";

export function HoursExhaustedModal() {
  const open = useAppStore((s) => s.hoursExhaustedOpen);
  const setOpen = useAppStore((s) => s.setHoursExhaustedOpen);
  const setUpgradeOpen = useAppStore((s) => s.setUpgradeOpen);

  const referralWalletMs = useAccountStore((s) => s.referralWalletMs);

  const onUpgrade = () => {
    setOpen(false);
    setUpgradeOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[420px] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <Clock className="size-4 text-streak" />
            You&apos;re out of daily hours
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-ws-secondary">
            Your 5:00 daily allowance is used up. Earn more or wait until
            tomorrow (it resets daily).
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4">
          {referralWalletMs > 0 ? (
            <div className="rounded-lg border border-ws-border bg-card-ws px-3 py-2.5 text-[12.5px] text-ws-secondary">
              You have{" "}
              <span className="text-foreground font-medium tabular-nums">
                {formatHours(referralWalletMs)}
              </span>{" "}
              of earned hours left.
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-ws-border sm:flex-col sm:items-stretch gap-2">
          <Button
            type="button"
            onClick={onUpgrade}
            className="bg-accent-fill text-white hover:bg-accent-hi w-full"
          >
            <Zap className="size-3.5" />
            Get 7x usage for $8
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-ws-secondary hover:text-foreground hover:bg-hover w-full"
          >
            Wait until tomorrow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
