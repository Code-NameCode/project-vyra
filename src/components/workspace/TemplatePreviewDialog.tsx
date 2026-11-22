"use client";

import { Rocket, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TemplateDef } from "@/lib/types";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThumbnailArt } from "./ThumbnailArt";

export interface TemplatePreviewDialogProps {
  template: TemplateDef | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUse: (t: TemplateDef) => void;
}

/**
 * TemplatePreviewDialog — a shadcn Dialog that lets a user review a template
 * (thumbnail + prompt) before committing to "Use this template".
 */
export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onUse,
}: TemplatePreviewDialogProps) {
  const handleUse = () => {
    if (!template) return;
    onUse(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-[520px] gap-0 p-0 bg-popover border border-ws-border",
          "rounded-[10px] overflow-hidden ws-fade-in"
        )}
      >
        {template && (
          <>
            {/* Thumbnail header */}
            <div className="relative aspect-video w-full rounded-t-[10px] overflow-hidden">
              <ThumbnailArt
                thumbKey={template.thumbKey}
                className="rounded-none"
              />
              <DialogClose
                aria-label="Close preview"
                className={cn(
                  "absolute top-2.5 right-2.5 size-7 inline-flex items-center justify-center",
                  "rounded-[8px] bg-black/55 hover:bg-black/75 text-foreground",
                  "transition-colors focus-ring"
                )}
              >
                <X className="size-4" />
              </DialogClose>
            </div>

            {/* Body */}
            <div className="p-5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <DialogTitle
                  className={cn(
                    "text-[18px] font-semibold text-foreground text-left leading-tight"
                  )}
                >
                  {template.title}
                </DialogTitle>
                <span className="text-[11px] text-ws-secondary uppercase tracking-wide">
                  {template.category}
                </span>
              </div>
              <DialogDescription className="sr-only">
                Preview the {template.title} template. Review the prompt, then
                choose to use this template or cancel.
              </DialogDescription>

              <Separator className="bg-ws-border my-4" />

              <div className="text-[12px] uppercase tracking-wide text-ws-secondary mb-1.5">
                Prompt
              </div>
              <div className="rounded-[8px] border border-ws-border bg-card-ws p-3 max-h-[200px] overflow-y-auto ws-scroll">
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {template.prompt}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-ws-border flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "h-9 px-3 text-[13px] text-ws-secondary focus-ring"
                )}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUse}
                className={cn(
                  "h-9 px-4 text-[13px] font-medium focus-ring",
                  "bg-accent-fill text-white hover:bg-accent-fill hover:opacity-90"
                )}
              >
                <Rocket className="size-4" />
                Use this template
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
