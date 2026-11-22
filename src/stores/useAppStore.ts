"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  openSession: (sessionId: string, title: string) => void;
  openProject: (projectId: string, name: string) => string;
  closeTab: (id: string) => void;
  newChatTab: () => string;
  renameTab: (id: string, title: string) => void;
  setTabProject: (tabId: string, projectId: string | undefined, projectName?: string) => void;

  // layout
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (v: boolean) => void;

  rightTabs: RightPanelView[];
  rightActiveTab: number;
  openRightTab: (view: RightPanelView) => void;
  closeRightTab: (index: number) => void;
  setRightActiveTab: (index: number) => void;

  rightTabOpen: boolean;
  setRightTabOpen: (v: boolean) => void;

  // overlays
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  // mobile
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  mobileRightOpen: boolean;
  setMobileRightOpen: (v: boolean) => void;
}

function makeTab(type: TabType = "chat", title = "New chat"): Tab {
  return { id: uid("tab"), title, type, createdAt: Date.now() };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mode: "code",
      setMode: (m) => set({ mode: m }),
      toggleMode: () => set((s) => ({ mode: s.mode === "code" ? "chat" : "code" })),

      railPage: "home",
      setRailPage: (p) => set({ railPage: p }),

      tabs: [makeTab()],
      activeTabId: "",
      setActiveTab: (id) => set({ activeTabId: id, railPage: "home" }),
      openTab: (tab) =>
        set((s) => ({
          tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
          activeTabId: tab.id,
          railPage: "home",
        })),
      // open (or focus) a tab backed by an existing persisted session
      openSession: (sessionId, title) =>
        set((s) => {
          const existing = s.tabs.find((t) => t.id === sessionId);
          if (existing) {
            return { activeTabId: existing.id, railPage: "home" as RailPage };
          }
          const tab: Tab = {
            id: sessionId,
            title: title || "New chat",
            type: "chat",
            createdAt: Date.now(),
          };
          return { tabs: [...s.tabs, tab], activeTabId: tab.id, railPage: "home" };
        }),
      // open (or focus) a project workspace tab linked to a project
      openProject: (projectId, name) => {
        const s = get();
        const existing = s.tabs.find(
          (t) => t.projectId === projectId
        );
        if (existing) {
          set({ activeTabId: existing.id, railPage: "home" });
          return existing.id;
        }
        const tab: Tab = {
          id: uid("tab"),
          title: name || "Project",
          type: "project",
          projectId,
          createdAt: Date.now(),
        };
        set({ tabs: [...s.tabs, tab], activeTabId: tab.id, railPage: "home" });
        return tab.id;
      },
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
        set((s) => ({
          tabs: [...s.tabs, t],
          activeTabId: t.id,
          railPage: "home",
          mode: s.mode,
        }));
        return t.id;
      },
      renameTab: (id, title) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
        })),
      setTabProject: (tabId, projectId, projectName) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  projectId,
                  type: projectId ? "project" : "chat",
                  title: projectName && (!t.title || t.title === "New chat") ? projectName : t.title,
                }
              : t
          ),
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

      rightTabs: [],
      rightActiveTab: 0,
      openRightTab: (view) =>
        set((s) => {
          const idx = s.rightTabs.indexOf(view);
          if (idx !== -1) {
            return {
              rightTabs: s.rightTabs,
              rightActiveTab: idx,
              rightPanelOpen: true,
              rightTabOpen: true,
            };
          }
          const tabs = [...s.rightTabs, view];
          return {
            rightTabs: tabs,
            rightActiveTab: tabs.length - 1,
            rightPanelOpen: true,
            rightTabOpen: true,
          };
        }),
      closeRightTab: (index) =>
        set((s) => {
          const tabs = s.rightTabs.filter((_, i) => i !== index);
          let active = s.rightActiveTab;
          if (tabs.length === 0) {
            return { rightTabs: [], rightActiveTab: 0 };
          }
          if (index <= s.rightActiveTab) {
            active = Math.max(0, s.rightActiveTab - 1);
          }
          return { rightTabs: tabs, rightActiveTab: active };
        }),
      setRightActiveTab: (index) => set({ rightActiveTab: index }),

      rightTabOpen: false,
      setRightTabOpen: (v) => set({ rightTabOpen: v }),

      searchOpen: false,
      setSearchOpen: (v) => set({ searchOpen: v }),
      settingsOpen: false,
      setSettingsOpen: (v) => set({ settingsOpen: v }),

      mobileSidebarOpen: false,
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      mobileRightOpen: false,
      setMobileRightOpen: (v) => set({ mobileRightOpen: v }),
    }),
    {
      name: "forge-app",
      partialize: (s) => ({
        mode: s.mode,
        railPage: s.railPage,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        sidebarCollapsed: s.sidebarCollapsed,
        rightPanelOpen: s.rightPanelOpen,
        rightTabs: s.rightTabs,
        rightActiveTab: s.rightActiveTab,
        rightTabOpen: s.rightTabOpen,
      }),
    }
  )
);

// ensure there's always at least one tab and a valid active tab (handles
// first run + rehydrated state)
const st = useAppStore.getState();
if (st.tabs.length === 0) {
  const t = makeTab();
  useAppStore.setState({ tabs: [t], activeTabId: t.id });
} else if (!st.activeTabId || !st.tabs.some((t) => t.id === st.activeTabId)) {
  useAppStore.setState({ activeTabId: st.tabs[0].id });
}

export { makeTab };
