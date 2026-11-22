"use client";

import { cn } from "@/lib/utils";

/**
 * Goodstuff-VYRA brand assets. The square mark mirrors the favicon set
 * (red ellipse VYRA wordmark on dark), the wordmark is rendered as text.
 */
export function ForgeMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/android-chrome-192x192.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-[6px] object-cover", className)}
    />
  );
}

export function ForgeLogo({
  size = 22,
  className,
  collapsed = false,
}: {
  size?: number;
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <ForgeMark size={size} />
      {!collapsed && (
        <span
          className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-[#f2f2f2]"
          style={{ letterSpacing: "-0.01em" }}
        >
          Goodstuff-VYRA
        </span>
      )}
    </div>
  );
}
