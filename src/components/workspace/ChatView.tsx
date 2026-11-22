"use client";

import { Fragment, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { AgentStepCard } from "./AgentStepCard";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

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
      <div className="border-t border-ws-border p-3">
        <div className="mx-auto w-full max-w-[820px]">
          <Composer tabId={tabId} />
        </div>
      </div>
    </div>
  );
}
