"use client";

import { useState } from "react";
import { Copy, Gift, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/stores/useAppStore";
import {
  formatHours,
  useAccountStore,
} from "@/stores/useAccountStore";
import { toast } from "sonner";

export function InviteModal() {
  const open = useAppStore((s) => s.inviteOpen);
  const setOpen = useAppStore((s) => s.setInviteOpen);

  const referralLink = useAccountStore((s) => s.referralLink);
  const referralCount = useAccountStore((s) => s.referralCount);
  const referralTarget = useAccountStore((s) => s.referralTarget);
  const referralWalletMs = useAccountStore((s) => s.referralWalletMs);
  const recordReferral = useAccountStore((s) => s.recordReferral);

  const [copied, setCopied] = useState(false);

  const progressPct = Math.min(
    100,
    Math.round((referralCount / Math.max(1, referralTarget)) * 100)
  );

  const onCopy = () => {
    if (!navigator?.clipboard) return;
    navigator.clipboard
      .writeText(referralLink)
      .then(() => {
        toast.success("Referral link copied");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
  };

  const onSimulate = () => {
    recordReferral();
    toast.success("Referral recorded +1h");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[440px] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <Users className="size-4 text-accent-hi" />
            Invite friends
          </DialogTitle>
          <DialogDescription className="sr-only">
            Share your referral link and earn hours.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4 grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-ws-secondary">
              Your referral link
            </span>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={referralLink}
                className="focus-ring bg-card-ws border-ws-border text-[12.5px] font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopy}
                className="bg-card-ws border-ws-border text-ws-secondary hover:text-foreground"
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Progress
              value={progressPct}
              className="h-2 bg-hover [&>[data-slot=progress-indicator]]:bg-accent-fill"
            />
            <p className="text-[12.5px] text-ws-secondary">
              You&apos;ve invited{" "}
              <span className="text-foreground font-medium">
                {referralCount}
              </span>{" "}
              of{" "}
              <span className="text-foreground font-medium">
                {referralTarget}
              </span>{" "}
              friends. Earn 1 hour per invite.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-ws-border bg-card-ws px-3 py-2.5">
            <Gift className="size-4 text-streak" />
            <div className="grid gap-0.5">
              <span className="text-[11px] uppercase tracking-wide text-ws-secondary">
                Earned hours
              </span>
              <span className="text-[14px] text-foreground font-medium tabular-nums">
                {formatHours(referralWalletMs)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-ws-border">
          <Button
            type="button"
            onClick={onSimulate}
            className="bg-accent-fill text-white hover:bg-accent-hi w-full"
          >
            Simulate invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
