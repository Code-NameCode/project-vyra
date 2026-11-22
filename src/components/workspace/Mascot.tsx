"use client";

import { cn } from "@/lib/utils";

/**
 * Original Forge mascot — "Ember", a friendly spark-sprite.
 * A rounded teardrop body with a spark antenna, two eyes and a smile.
 * Not derived from any real product mascot.
 */
export function Mascot({
  size = 28,
  className,
  active = false,
}: {
  size?: number;
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* spark antenna */}
      <path
        d="M20 2.5l1.6 4.2L20 8.2l-1.6-1.5L20 2.5z"
        fill="#f08a3c"
        className={active ? "pulse-dot" : undefined}
      />
      {/* body */}
      <path
        d="M20 8.5c6.6 0 11.5 5.4 11.5 12.2 0 4.8-2.6 8.7-6 10.9-1.7 1.1-3.6 1.9-5.5 1.9s-3.8-.8-5.5-1.9c-3.4-2.2-6-6.1-6-10.9C8.5 13.9 13.4 8.5 20 8.5z"
        fill="#5a9e3f"
      />
      {/* belly highlight */}
      <path
        d="M20 12.5c4.4 0 7.5 3.7 7.5 8.2 0 3-1.5 5.6-3.7 7.3-1.2.9-2.5 1.5-3.8 1.5s-2.6-.6-3.8-1.5c-2.2-1.7-3.7-4.3-3.7-7.3 0-4.5 3.1-8.2 7.5-8.2z"
        fill="#7bc65a"
        opacity="0.55"
      />
      {/* eyes */}
      <circle cx="16.4" cy="19" r="1.7" fill="#0b0b0c" />
      <circle cx="23.6" cy="19" r="1.7" fill="#0b0b0c" />
      <circle cx="17" cy="18.4" r="0.5" fill="#fff" />
      <circle cx="24.2" cy="18.4" r="0.5" fill="#fff" />
      {/* smile */}
      <path
        d="M16.8 22.4c1 1.1 2 1.6 3.2 1.6s2.2-.5 3.2-1.6"
        stroke="#0b0b0c"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
