"use client";

import { Clock } from "lucide-react";
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

export function HoursExhaustedModal() {
  const open = useAppStore((s) => s.hoursExhaustedOpen);
  const setOpen = useAppStore((s) => s.setHoursExhaustedOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[420px] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <Clock className="size-4 text-streak" />
            You&apos;re out of daily hours
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-ws-secondary">
            Your 5:00 daily allowance is used up. It resets tomorrow — come back
            then to keep building.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="px-5 py-3 border-t border-ws-border sm:flex-col sm:items-stretch gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-ws-secondary hover:text-foreground hover:bg-hover w-full"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
