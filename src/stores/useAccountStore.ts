"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAILY_HOURS_MS = 5 * 60 * 60 * 1000; // 5:00

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AccountState {
  // daily allowance
  dailyHoursMs: number;
  referralWalletMs: number;
  lastResetDate: string;
  running: boolean;
  runningModelMultiplier: number;
  tickStart: number;

  // referrals
  referralCount: number;
  referralTarget: number;
  referralLink: string;

  // streak
  streakDays: number;
  lastStreakDate: string | null;

  // actions
  resetDailyIfStale: () => void;
  startRunning: (multiplier: number) => void;
  stopRunning: () => void;
  tick: (deltaMs: number) => void;
  spendForTurn: (multiplier: number, realMs: number) => number;
  addReferralHours: (ms: number) => void;
  recordReferral: () => void;
  recordStreak: () => void;
  canRun: (multiplier: number) => boolean;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      dailyHoursMs: DAILY_HOURS_MS,
      referralWalletMs: 0,
      lastResetDate: todayKey(),
      running: false,
      runningModelMultiplier: 1,
      tickStart: 0,

      referralCount: 0,
      referralTarget: 3,
      referralLink: "https://forge.app/r/forge-user-8f3a",

      streakDays: 0,
      lastStreakDate: null,

      resetDailyIfStale: () => {
        const t = todayKey();
        if (get().lastResetDate !== t) {
          set({ dailyHoursMs: DAILY_HOURS_MS, lastResetDate: t });
        }
      },

      startRunning: (multiplier) =>
        set({ running: true, runningModelMultiplier: multiplier, tickStart: Date.now() }),

      stopRunning: () =>
        set({ running: false, runningModelMultiplier: 1, tickStart: 0 }),

      tick: (deltaMs) => {
        const { running, runningModelMultiplier, dailyHoursMs, referralWalletMs } =
          get();
        if (!running) return;
        const cost = deltaMs * runningModelMultiplier;
        // spend daily first, then referral wallet
        if (dailyHoursMs > 0) {
          const fromDaily = Math.min(dailyHoursMs, cost);
          const rest = cost - fromDaily;
          if (rest > 0 && referralWalletMs > 0) {
            const fromWallet = Math.min(referralWalletMs, rest);
            set({
              dailyHoursMs: dailyHoursMs - fromDaily,
              referralWalletMs: referralWalletMs - fromWallet,
            });
          } else {
            set({ dailyHoursMs: dailyHoursMs - fromDaily });
          }
        } else if (referralWalletMs > 0) {
          const fromWallet = Math.min(referralWalletMs, cost);
          set({ referralWalletMs: referralWalletMs - fromWallet });
        }
      },

      spendForTurn: (multiplier, realMs) => {
        const cost = realMs * multiplier;
        const { dailyHoursMs, referralWalletMs } = get();
        let spent = 0;
        if (dailyHoursMs > 0) {
          const fromDaily = Math.min(dailyHoursMs, cost);
          spent += fromDaily;
          const rest = cost - fromDaily;
          if (rest > 0 && referralWalletMs > 0) {
            const fromWallet = Math.min(referralWalletMs, rest);
            spent += fromWallet;
          }
        } else if (referralWalletMs > 0) {
          spent += Math.min(referralWalletMs, cost);
        }
        return spent;
      },

      addReferralHours: (ms) =>
        set((s) => ({ referralWalletMs: s.referralWalletMs + ms })),

      recordReferral: () =>
        set((s) => ({
          referralCount: Math.min(s.referralTarget, s.referralCount + 1),
          referralWalletMs: s.referralWalletMs + 60 * 60 * 1000, // +1h per referral
        })),

      recordStreak: () => {
        const t = todayKey();
        const { lastStreakDate, streakDays } = get();
        if (lastStreakDate === t) return;
        const yesterday = new Date(Date.now() - DAY_MS)
          .toISOString()
          .slice(0, 10);
        const next = lastStreakDate === yesterday ? streakDays + 1 : 1;
        set({ streakDays: next, lastStreakDate: t });
      },

      canRun: (multiplier) => {
        const { dailyHoursMs, referralWalletMs } = get();
        if (multiplier === 0) return true; // unlimited models
        return dailyHoursMs > 0 || referralWalletMs > 0;
      },
    }),
    { name: "forge-account" }
  )
);

export function formatHours(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}`;
}
