"use client";

import { cn } from "@/lib/utils";
import { useAccountStore } from "@/stores/useAccountStore";
import { Mascot } from "./Mascot";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * StreakBanner — a slim card showing the daily streak status with 7 dots.
 * Mascot on the left, status text in the middle, 7-day dot row on the right.
 */
export function StreakBanner() {
  const streakDays = useAccountStore((s) => s.streakDays);
  const lastStreakDate = useAccountStore((s) => s.lastStreakDate);

  const today = todayKey();
  const streakToday = lastStreakDate === today;

  const title =
    streakDays > 0 && streakToday
      ? `${streakDays} day streak`
      : "Start a streak";

  const subtitle = streakToday
    ? "Nice! Keep it going tomorrow."
    : "Send a message today to start one.";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        "rounded-[12px] border border-ws-border bg-card-ws",
        "h-[72px] px-4 py-3"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Mascot size={36} active={streakToday} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-foreground truncate">
            {title}
          </div>
          <div className="text-[13px] text-ws-secondary truncate">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* today (circle) */}
        <span
          className={cn(
            "size-3.5 rounded-full",
            streakToday
              ? "bg-streak"
              : "border-2 border-dashed border-streak"
          )}
          title="Today"
        />
        {/* next 6 days (squares) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-[4px]",
              "bg-card-ws border border-ws-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
