"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { AgentStepCard } from "./AgentStepCard";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

function ApprovalActions() {
  const [approvals, setApprovals] = useState<{ id: string; executionId?: string; action: string; description: string; status: string }[]>([]);
  const refresh = async (active = true) => {
    const res = await fetch("/api/approvals");
    if (res.ok && active) setApprovals(((await res.json()) as { approvals?: typeof approvals }).approvals || []);
  };
  useEffect(() => { let active = true; window.setTimeout(() => void refresh(active), 0); const timer = window.setInterval(() => void refresh(active), 1500); return () => { active = false; window.clearInterval(timer); }; }, []);
  const decide = async (approval: (typeof approvals)[number], decision: "approved" | "rejected") => {
    await fetch(`/api/approvals/${encodeURIComponent(approval.id)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    if (decision === "approved" && approval.executionId) await fetch(`/api/executions/${encodeURIComponent(approval.executionId)}/resume`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvalId: approval.id }) });
    await refresh();
  };
  if (!approvals.some((approval) => approval.status === "pending")) return null;
  return <div className="mx-auto w-full max-w-[820px] px-4 pb-2 flex flex-col gap-2">{approvals.filter((approval) => approval.status === "pending").map((approval) => <div key={approval.id} className="rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-foreground"><div className="font-medium">Approval required: {approval.description || approval.action}</div><div className="mt-2 flex gap-2"><button type="button" onClick={() => void decide(approval, "approved")} className="rounded-[7px] bg-accent-fill px-2.5 py-1 text-white">Approve</button><button type="button" onClick={() => void decide(approval, "rejected")} className="rounded-[7px] border border-ws-border px-2.5 py-1 text-ws-secondary">Reject</button></div></div>)}</div>;
}

export function ChatView({ tabId }: { tabId: string }) {
  const conv = useChatStore((s) => s.conversations[tabId]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // whether the user is currently pinned to the bottom (so we don't fight
  // someone who scrolled up to read earlier output)
  const atBottomRef = useRef(true);

  const lastLen =
    conv && conv.messages.length > 0
      ? conv.messages[conv.messages.length - 1].content.length
      : 0;
  const stepCount = conv?.steps.length ?? 0;
  const lastStepStatus = conv?.steps[conv.steps.length - 1]?.status;
  const streaming = !!conv?.streaming;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // While streaming, run a rAF loop that keeps the view pinned to the bottom
  // (instant per-frame scroll — smoother than queuing smooth-scroll animations
  // on every token). Stops if the user scrolled up.
  useEffect(() => {
    if (!streaming) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      if (atBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [streaming]);

  // On new messages / steps / tab switch, jump to the bottom if the user is
  // already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conv?.messages.length, lastLen, stepCount, lastStepStatus, tabId]);

  if (!conv || conv.messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-[13px] text-ws-disabled">
          Send a message to begin.
        </div>
        <div className="border-t border-ws-border p-3">
          <div className="mx-auto w-full max-w-[820px]">
            <Composer tabId={tabId} />
          </div>
        </div>
      </div>
    );
  }

  // Find the index of the last assistant message — steps render right above it.
  const messages = conv.messages;
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  const hasSteps = conv.steps.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto ws-scroll"
      >
        <div className="mx-auto w-full max-w-[820px] px-4 py-6 flex flex-col gap-5 ws-fade-in">
          {messages.map((m, i) => {
            const showStepsHere =
              hasSteps && i === lastAssistantIdx && lastAssistantIdx >= 0;
            return (
              <Fragment key={m.id}>
                {showStepsHere ? (
                  <div className="flex flex-col gap-2">
                    {conv.steps.map((st) => (
                      <AgentStepCard key={st.id} step={st} />
                    ))}
                  </div>
                ) : null}
                <MessageBubble message={m} />
              </Fragment>
            );
          })}
        </div>
      </div>
      <ApprovalActions />
      <div className="border-t border-ws-border p-3">
        <div className="mx-auto w-full max-w-[820px]">
          <Composer tabId={tabId} />
        </div>
      </div>
    </div>
  );
}
