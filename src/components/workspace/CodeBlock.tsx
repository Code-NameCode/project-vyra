"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    if (!navigator?.clipboard) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        toast.success("Copied");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // clipboard may be blocked; still flip UI for feedback
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
  }, [code]);

  const lang = (language || "text").toLowerCase().replace(/^language-/, "");

  return (
    <div className="rounded-[10px] border border-ws-border bg-[#0d0e10] overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-2 bg-card-ws border-b border-ws-border">
        <span className="text-[12px] text-ws-secondary font-mono uppercase tracking-wide">
          {lang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className={cn(
            "focus-ring inline-flex items-center gap-1.5 rounded-md px-1.5 py-1",
            "text-[12px] text-ws-secondary hover:text-foreground transition-colors duration-150"
          )}
        >
          {copied ? (
            <Check className="size-3.5 text-accent-hi" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-3 overflow-x-auto ws-scroll">
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          customStyle={{
            margin: 0,
            background: "transparent",
            fontSize: "12.5px",
            padding: 0,
          }}
          codeTagProps={{
            style: {
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              color: "#f2f2f2",
            },
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
