"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/** Recursively extract raw text from a React node tree. */
function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return nodeText(props.children);
  }
  return "";
}

const components: Components = {
  pre: ({ children }) => {
    const child = React.Children.toArray(children)[0];
    let language: string | undefined;
    let code = "";
    if (React.isValidElement(child)) {
      const className: string =
        (child.props as { className?: string })?.className ?? "";
      const match = /language-([\w-]+)/.exec(className);
      if (match) language = match[1];
      code = nodeText((child.props as { children?: React.ReactNode }).children);
    } else if (typeof child === "string") {
      code = child;
    }
    // strip a single trailing newline that markdown often adds
    const trimmed = code.replace(/\n$/, "");
    return <CodeBlock code={trimmed} language={language} />;
  },
  code: ({ children }) => <code>{children}</code>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent-hi underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export function MarkdownRenderer({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className="ws-md text-[14px] leading-relaxed text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {streaming && content.trim().length > 0 ? (
        <span className="stream-caret" aria-hidden="true" />
      ) : null}
    </div>
  );
}
