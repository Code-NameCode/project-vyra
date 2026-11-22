"use client";

import { Fragment, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { AgentStepCard } from "./AgentStepCard";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

export function ChatView({ tabId }: { tabId: string }) {
  const conv = useChatStore((s) => s.conversations[tabId]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Trigger auto-scroll when messages change, content grows, or steps update.
  const lastLen =
    conv && conv.messages.length > 0
      ? conv.messages[conv.messages.length - 1].content.length
      : 0;
  const stepCount = conv?.steps.length ?? 0;
  const lastStepStatus = conv?.steps[conv.steps.length - 1]?.status;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
