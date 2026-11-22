"use client";

import { create } from "zustand";
import { uid } from "@/lib/id";
import type { AppMode, RailPage, RightPanelView, Tab, TabType } from "@/lib/types";

interface AppState {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  toggleMode: () => void;

  railPage: RailPage;
  setRailPage: (p: RailPage) => void;

  tabs: Tab[];
  activeTabId: string;
  setActiveTab: (id: string) => void;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  newChatTab: () => string;
  renameTab: (id: string, title: string) => void;

  // layout
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (v: boolean) => void;

  rightPanelView: RightPanelView | null;
  setRightPanelView: (v: RightPanelView | null) => void;

  rightTabOpen: boolean;
  setRightTabOpen: (v: boolean) => void;

  // overlays
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  upgradeOpen: boolean;
  setUpgradeOpen: (v: boolean) => void;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
  hoursExhaustedOpen: boolean;
  setHoursExhaustedOpen: (v: boolean) => void;

  // mobile
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  mobileRightOpen: boolean;
  setMobileRightOpen: (v: boolean) => void;
}

function makeTab(type: TabType = "chat", title = "New chat"): Tab {
  return { id: uid("tab"), title, type, createdAt: Date.now() };
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: "code",
  setMode: (m) => set({ mode: m }),
  toggleMode: () => set((s) => ({ mode: s.mode === "code" ? "chat" : "code" })),

  railPage: "home",
  setRailPage: (p) => set({ railPage: p }),

  tabs: [makeTab()],
  activeTabId: "",
  setActiveTab: (id) => set({ activeTabId: id }),
  openTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    })),
  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const next = s.tabs.filter((t) => t.id !== id);
      let active = s.activeTabId;
      if (id === s.activeTabId) {
        const fallback = next[idx] ?? next[idx - 1] ?? next[0];
        active = fallback ? fallback.id : "";
      }
      if (next.length === 0) {
        const fresh = makeTab();
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      return { tabs: next, activeTabId: active };
    }),
  newChatTab: () => {
    const t = makeTab();
    set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.id, mode: s.mode }));
    return t.id;
  },
  renameTab: (id, title) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  rightPanelOpen: false,
  toggleRightPanel: () =>
    set((s) => ({
      rightPanelOpen: !s.rightPanelOpen,
      rightTabOpen: !s.rightPanelOpen,
    })),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v, rightTabOpen: v }),

  rightPanelView: null,
  setRightPanelView: (v) => set({ rightPanelView: v }),

  rightTabOpen: false,
  setRightTabOpen: (v) => set({ rightTabOpen: v }),

  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  upgradeOpen: false,
  setUpgradeOpen: (v) => set({ upgradeOpen: v }),
  inviteOpen: false,
  setInviteOpen: (v) => set({ inviteOpen: v }),
  hoursExhaustedOpen: false,
  setHoursExhaustedOpen: (v) => set({ hoursExhaustedOpen: v }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
  mobileRightOpen: false,
  setMobileRightOpen: (v) => set({ mobileRightOpen: v }),
}));

// initialize active tab after creation
if (useAppStore.getState().tabs.length && !useAppStore.getState().activeTabId) {
  useAppStore.setState({ activeTabId: useAppStore.getState().tabs[0].id });
}

export { makeTab };
