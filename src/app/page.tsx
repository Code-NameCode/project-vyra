"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { TopBar } from "@/components/workspace/TopBar";
import { IconRail } from "@/components/workspace/IconRail";
import { Sidebar } from "@/components/workspace/Sidebar";
import { HeroScreen } from "@/components/workspace/HeroScreen";
import { ChatView } from "@/components/workspace/ChatView";
import { CenterToolbar } from "@/components/workspace/CenterToolbar";
import { RightPanel } from "@/components/workspace/RightPanel";
import { SessionsPage } from "@/components/workspace/SessionsPage";
import { TemplatesPage } from "@/components/workspace/TemplatesPage";
import { ExtensionsPage } from "@/components/workspace/ExtensionsPage";
import { ProjectsPage } from "@/components/workspace/ProjectsPage";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { SettingsModal } from "@/components/workspace/modals/SettingsModal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import { useProvidersStore } from "@/stores/useProvidersStore";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Desktop right panel with a left-edge drag handle to resize. */
function DesktopRightPanel() {
  const [width, setWidth] = useState(440);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rightEdge = window.innerWidth - 10; // container right margin
      const next = rightEdge - e.clientX;
      setWidth(Math.max(320, Math.min(680, next)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="relative shrink-0" style={{ width }}>
      <div
        onMouseDown={() => {
          dragging.current = true;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "col-resize";
        }}
        aria-hidden="true"
        className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-[3px] cursor-col-resize bg-transparent transition-colors hover:bg-accent-fill/50"
      />
      <RightPanel />
    </div>
  );
}

export default function Home() {
  const activeTabId = useAppStore((s) => s.activeTabId);
  const railPage = useAppStore((s) => s.railPage);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  const conv = useChatStore((s) =>
    activeTabId ? s.conversations[activeTabId] : undefined
  );
  const ensure = useChatStore((s) => s.ensure);

  const isDesktop = useMediaQuery("(min-width: 1100px)");

  // Apply the active theme (preset + custom overrides) to <html>.
  useTheme();

  // auto-detect locally installed Ollama models on mount (best-effort)
  useEffect(() => {
    void useProvidersStore.getState().detectOllama();
  }, []);

  // make sure a conversation object exists for the active tab
  useEffect(() => {
    if (activeTabId) ensure(activeTabId);
  }, [activeTabId, ensure]);

  // global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        useAppStore.getState().setSearchOpen(true);
      } else if (key === "n") {
        e.preventDefault();
        useAppStore.getState().newChatTab();
      } else if (key === "b") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1100px)").matches) {
          useAppStore.getState().toggleSidebar();
        } else {
          useAppStore.getState().setMobileSidebarOpen(true);
        }
      } else if (key === "j") {
        e.preventDefault();
        useAppStore.getState().toggleRightPanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const started = !!conv?.started;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-page text-foreground">
      <TopBar />

      <main
        className={cn(
          "mx-2.5 mb-2.5 flex flex-1 overflow-hidden rounded-[14px]",
          "border-x border-b border-ws-border-soft bg-surface"
        )}
      >
        {/* Icon rail (always visible) */}
        <IconRail />

        {railPage === "home" ? (
          <>
            {/* Sidebar */}
            {isDesktop ? (
              !sidebarCollapsed && (
                <div className="w-80 shrink-0">
                  <Sidebar />
                </div>
              )
            ) : (
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetContent
                  side="left"
                  className="w-80 max-w-[92vw] border-ws-border bg-surface p-0"
                >
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Workspace navigation and project list.
                  </SheetDescription>
                  <Sidebar />
                </SheetContent>
              </Sheet>
            )}

            {/* Center column */}
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-12 items-center justify-between gap-2 border-b border-ws-border px-3">
                {!isDesktop && (
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Open sidebar"
                    className="focus-ring flex size-9 items-center justify-center rounded-[8px] text-ws-secondary transition-colors hover:bg-hover hover:text-foreground"
                  >
                    <Menu className="size-4" />
                  </button>
                )}
                <div className={cn("flex items-center gap-1", isDesktop && "ml-auto")}>
                  <CenterToolbar />
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden">
                {started ? (
                  <ChatView tabId={activeTabId} />
                ) : (
                  <div className="ws-scroll h-full overflow-y-auto">
                    <div className="flex min-h-full flex-col items-center justify-center py-10">
                      <HeroScreen tabId={activeTabId} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Right panel */}
            {isDesktop ? (
              rightPanelOpen && <DesktopRightPanel />
            ) : (
              <Sheet
                open={rightPanelOpen}
                onOpenChange={(v) => useAppStore.getState().setRightPanelOpen(v)}
              >
                <SheetContent
                  side="right"
                  className="w-[420px] max-w-[92vw] border-ws-border bg-surface p-0"
                >
                  <SheetTitle className="sr-only">Tools panel</SheetTitle>
                  <SheetDescription className="sr-only">
                    Browser, files, terminal and changes views.
                  </SheetDescription>
                  <RightPanel />
                </SheetContent>
              </Sheet>
            )}
          </>
        ) : (
          // Full-width page view for non-home rail sections (Sessions,
          // Templates, Extensions). Settings opens as a modal from the rail.
          <section className="flex min-w-0 flex-1 flex-col">
            {railPage === "sessions" && <SessionsPage />}
            {railPage === "templates" && <TemplatesPage />}
            {railPage === "extensions" && <ExtensionsPage />}
            {railPage === "projects" && <ProjectsPage />}
          </section>
        )}
      </main>

      {/* overlays / modals */}
      <CommandPalette />
      <SettingsModal />
    </div>
  );
}
