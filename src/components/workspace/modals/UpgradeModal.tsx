"use client";

import { Check, Zap } from "lucide-react";
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
import { toast } from "sonner";

const FEATURES = ["7x daily hours", "Priority models", "Faster streaming"];

export function UpgradeModal() {
  const open = useAppStore((s) => s.upgradeOpen);
  const setOpen = useAppStore((s) => s.setUpgradeOpen);

  const onUpgrade = () => {
    toast.success("Mock upgrade — thanks!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[440px] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <Zap className="size-4 text-streak" />
            Get 7x usage
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-ws-secondary">
            Unlock longer sessions and faster responses with Forge Pro.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4">
          <div className="rounded-[12px] border border-accent-fill/40 bg-gradient-to-b from-accent-fill/10 to-transparent p-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  Forge Pro
                </span>
                <span className="text-[11px] uppercase tracking-wide text-accent-hi bg-accent-fill/15 border border-accent-fill/30 rounded px-1.5 py-0.5">
                  Pro
                </span>
              </div>
              <div className="text-right">
                <span className="text-[20px] font-semibold text-foreground">
                  $8
                </span>
                <span className="text-[12px] text-ws-secondary">/month</span>
              </div>
            </div>

            <ul className="mt-4 grid gap-2">
              {FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-[13px] text-foreground"
                >
                  <span className="grid place-items-center size-4 rounded-full bg-accent-fill/20 text-accent-hi">
                    <Check className="size-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-ws-border sm:flex-col sm:items-stretch">
          <Button
            type="button"
            onClick={onUpgrade}
            className="bg-accent-fill text-white hover:bg-accent-hi w-full"
          >
            Upgrade now
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring text-center text-[12.5px] text-ws-secondary hover:text-foreground transition-colors duration-150 py-1"
          >
            Maybe later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
