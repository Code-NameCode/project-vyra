"use client";

import { useEffect, useRef, useState } from "react";
import { CodeViewer } from "./CodeViewer";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  code?: string;
  language?: string;
  filename?: string;
  /** Called when the user edits a text-based document. */
  onChange?: (content: string) => void;
}

function extOf(filename?: string, language?: string): string {
  const fromName = (filename || "").toLowerCase().split(".").pop() || "";
  if (fromName) return fromName;
  return (language || "").toLowerCase();
}

const MD_EXT = new Set(["md", "mdx", "markdown"]);
const HTML_EXT = new Set(["html", "htm"]);
const PDF_EXT = new Set(["pdf"]);
const DOCX_EXT = new Set(["docx", "doc"]);
const XLSX_EXT = new Set(["xlsx", "xls", "csv", "tsv"]);
const PPTX_EXT = new Set(["pptx", "ppt"]);

function isTextEditable(ext: string): boolean {
  return (
    MD_EXT.has(ext) ||
    HTML_EXT.has(ext) ||
    !PDF_EXT.has(ext) &&
      !DOCX_EXT.has(ext) &&
      !XLSX_EXT.has(ext) &&
      !PPTX_EXT.has(ext)
  );
}

function SourceEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <textarea
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        spellCheck={false}
        className="flex-1 min-h-0 w-full resize-none bg-page text-foreground font-mono text-[12px] p-3 outline-none ws-scroll"
      />
      <div className="shrink-0 border-t border-ws-border px-3 py-1 text-[11px] text-ws-secondary">
        {language ? language.toUpperCase() : "TEXT"} · editing
      </div>
    </div>
  );
}

function MarkdownDoc({ code, onChange }: { code?: string; onChange?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const content = code || "";
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-ws-border px-3 py-1.5 flex items-center gap-2">
        <span className="text-[12px] font-medium text-foreground">Markdown</span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto text-[11px] px-2 py-0.5 rounded border border-ws-border text-ws-secondary hover:text-foreground"
        >
          {editing ? "Preview" : "Edit"}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto ws-scroll p-4">
        {editing ? (
          <SourceEditor value={content} onChange={onChange} language="md" />
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  );
}

function HtmlDoc({ code, onChange }: { code?: string; onChange?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const content = code || "";
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-ws-border px-3 py-1.5 flex items-center gap-2">
        <span className="text-[12px] font-medium text-foreground">HTML</span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto text-[11px] px-2 py-0.5 rounded border border-ws-border text-ws-secondary hover:text-foreground"
        >
          {editing ? "Preview" : "Edit"}
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-[11px] px-2 py-0.5 rounded border border-ws-border text-ws-secondary hover:text-foreground"
          >
            {showPreview ? "Source" : "Preview"}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {editing ? (
          <SourceEditor value={content} onChange={onChange} language="html" />
        ) : showPreview ? (
          <iframe
            title="html-preview"
            srcDoc={content}
            sandbox="allow-scripts"
            className="w-full h-full bg-white"
          />
        ) : (
          <CodeViewer code={content} language="html" />
        )}
      </div>
    </div>
  );
}

function PdfDoc({ code }: { code?: string }) {
  const src = code?.startsWith("data:")
    ? code
    : code
    ? `data:application/pdf;base64,${code}`
    : undefined;
  if (!src) {
    return <EmptyState label="No PDF content" />;
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <iframe title="pdf-viewer" src={src} className="w-full h-full" />
    </div>
  );
}

function DocxDoc({ code }: { code?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      try {
        const mod: any = await import("docx-preview");
        const renderAsync = mod.renderAsync || mod.default?.renderAsync;
        if (!renderAsync) throw new Error("docx-preview not available");
        let blob: Blob;
        if (code?.startsWith("data:")) {
          const res = await fetch(code);
          blob = await res.blob();
        } else if (code) {
          // treat as base64
          const binary = atob(code);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
        } else {
          return;
        }
        if (cancelled) return;
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to render DOCX");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (err) return <EmptyState label={`DOCX render error: ${err}`} />;
  return (
    <div className="flex-1 min-h-0 overflow-auto ws-scroll bg-white">
      <div ref={containerRef} className="p-4" />
    </div>
  );
}

function XlsxDoc({ code }: { code?: string }) {
  const [html, setHtml] = useState<string>("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const XLSX: any = await import("xlsx");
        let wb: any;
        if (code?.startsWith("data:")) {
          const res = await fetch(code);
          const buf = await res.arrayBuffer();
          wb = XLSX.read(buf, { type: "array" });
        } else if (code) {
          // csv/tsv fallback
          if (code.includes("\t")) {
            wb = XLSX.read(code, { type: "string" });
          } else if (code.trim().startsWith("<")) {
            // maybe html table; just show raw
            setHtml(`<pre>${code}</pre>`);
            return;
          } else {
            wb = XLSX.read(code, { type: "string" });
          }
        } else {
          return;
        }
        if (cancelled) return;
        const names: string[] = wb.SheetNames || [];
        setSheets(names);
        const first = names[0] || "";
        setActive(first);
        const ws = wb.Sheets[first];
        const h = XLSX.utils.sheet_to_html(ws);
        setHtml(h);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to render spreadsheet");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // re-render on sheet change
  useEffect(() => {
    if (!sheets.length || !active) return;
    (async () => {
      try {
        const XLSX: any = await import("xlsx");
        // re-read from code
        let wb: any;
        if (code?.startsWith("data:")) {
          const res = await fetch(code);
          const buf = await res.arrayBuffer();
          wb = XLSX.read(buf, { type: "array" });
        } else if (code) {
          wb = XLSX.read(code, { type: "string" });
        } else return;
        const ws = wb.Sheets[active];
        if (ws) setHtml(XLSX.utils.sheet_to_html(ws));
      } catch {
        /* ignore */
      }
    })();
  }, [active, code, sheets.length]);

  if (err) return <EmptyState label={`Spreadsheet render error: ${err}`} />;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {sheets.length > 1 && (
        <div className="shrink-0 border-b border-ws-border px-2 py-1 flex gap-1 overflow-x-auto">
          {sheets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActive(s)}
              className={cn(
                "text-[11px] px-2 py-0.5 rounded border",
                active === s
                  ? "border-accent-fill/40 text-accent-hi bg-accent-fill/10"
                  : "border-ws-border text-ws-secondary"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div
        className="flex-1 min-h-0 overflow-auto ws-scroll p-2 bg-white text-black"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function PptxDoc({ code }: { code?: string }) {
  const [slides, setSlides] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const JSZip: any = (await import("jszip")).default;
        let buf: ArrayBuffer;
        if (code?.startsWith("data:")) {
          const res = await fetch(code);
          buf = await res.arrayBuffer();
        } else if (code) {
          const binary = atob(code);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          buf = bytes.buffer;
        } else {
          return;
        }
        const zip = await JSZip.loadAsync(buf);
        const slideFiles = Object.keys(zip.files)
          .filter((n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort();
        const out: string[] = [];
        for (const sf of slideFiles) {
          const xml = await zip.files[sf].async("string");
          // strip tags, keep text
          const text = xml
            .replace(/<a:br\/>/g, "\n")
            .replace(/<\/a:p>/g, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim();
          out.push(text || "(empty slide)");
        }
        if (!cancelled) setSlides(out);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to render PPTX");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (err) return <EmptyState label={`PPTX render error: ${err}`} />;
  if (!slides.length) return <EmptyState label="No slides found" />;
  return (
    <div className="flex-1 min-h-0 overflow-auto ws-scroll p-4 space-y-4">
      {slides.map((s, i) => (
        <div key={i} className="rounded-[10px] border border-ws-border bg-card-ws p-4">
          <div className="text-[11px] text-ws-secondary mb-2">Slide {i + 1}</div>
          <pre className="whitespace-pre-wrap text-[13px] text-foreground">{s}</pre>
        </div>
      ))}
    </div>
  );
}

function TextDoc({
  code,
  language,
  filename,
  onChange,
  editable,
}: {
  code?: string;
  language?: string;
  filename?: string;
  onChange?: (v: string) => void;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const content = code || "";
  if (!editable || !onChange) {
    return <CodeViewer code={code} language={language} filename={filename} />;
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-ws-border px-3 py-1.5 flex items-center gap-2">
        <span className="text-[12px] font-medium text-foreground truncate">
          {filename ?? "Untitled"}
        </span>
        {language && (
          <span className="text-[11px] text-ws-secondary ml-auto uppercase tracking-wide">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-[11px] px-2 py-0.5 rounded border border-ws-border text-ws-secondary hover:text-foreground"
        >
          {editing ? "View" : "Edit"}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {editing ? (
          <SourceEditor value={content} onChange={onChange} language={language || ""} />
        ) : (
          <CodeViewer code={content} language={language} filename={filename} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-ws-secondary text-[13px]">
      {label}
    </div>
  );
}

export function DocumentViewer({
  code,
  language,
  filename,
  onChange,
}: DocumentViewerProps) {
  const ext = extOf(filename, language);

  // text-editable code fallthrough handled by CodeViewer for unknown; but we
  // want md/html special-cased.
  if (MD_EXT.has(ext)) {
    return <MarkdownDoc code={code} onChange={onChange} />;
  }
  if (HTML_EXT.has(ext)) {
    return <HtmlDoc code={code} onChange={onChange} />;
  }
  if (PDF_EXT.has(ext)) {
    return <PdfDoc code={code} />;
  }
  if (DOCX_EXT.has(ext)) {
    return <DocxDoc code={code} />;
  }
  if (XLSX_EXT.has(ext)) {
    return <XlsxDoc code={code} />;
  }
  if (PPTX_EXT.has(ext)) {
    return <PptxDoc code={code} />;
  }

  // default: code viewer with optional edit toggle
  return (
    <TextDoc code={code} language={language} filename={filename} onChange={onChange} editable={isTextEditable(ext)} />
  );
}
