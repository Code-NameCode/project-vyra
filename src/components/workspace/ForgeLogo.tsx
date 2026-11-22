"use client";

import { cn } from "@/lib/utils";

/**
 * Original Forge wordmark. A rounded-square spark mark + bold "Forge" wordmark.
 * Not derived from any real product logo.
 */
export function ForgeMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="#5a9e3f" />
      <path
        d="M16 6.5l2.6 6.4 6.9.5-5.3 4.5 1.7 6.8L16 21.2 9.7 25.2l1.7-6.8L6 13.9l6.9-.5L16 6.5z"
        fill="#ffffff"
        opacity="0.96"
      />
      <circle cx="16" cy="15.6" r="2.4" fill="#5a9e3f" />
    </svg>
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
          className="text-[17px] font-semibold tracking-tight text-[#f2f2f2]"
          style={{ letterSpacing: "-0.01em" }}
        >
          Forge
        </span>
      )}
    </div>
  );
}
