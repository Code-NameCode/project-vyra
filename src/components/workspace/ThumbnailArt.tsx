"use client";

import { cn } from "@/lib/utils";

/**
 * ThumbnailArt — original inline CSS/SVG 16:9 thumbnails for each template.
 * No external images; everything is built from divs and small SVGs in the
 * dark/accent/streak palette. Each thumbKey has a distinct, tasteful look.
 */
export function ThumbnailArt({
  thumbKey,
  className,
}: {
  thumbKey: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full aspect-video overflow-hidden rounded-[6px]",
        "bg-gradient-to-br from-[#1a1c1e] to-[#0e0f10]",
        className
      )}
    >
      <ThumbBody thumbKey={thumbKey} />
    </div>
  );
}

function ThumbBody({ thumbKey }: { thumbKey: string }) {
  switch (thumbKey) {
    case "crosscut":
      return <CrosscutThumb />;
    case "retro-terminal":
      return <RetroTerminalThumb />;
    case "creative-agency":
      return <CreativeAgencyThumb />;
    case "look-out-below":
      return <LookOutBelowThumb />;
    case "climate-story":
      return <ClimateStoryThumb />;
    case "fusion-energy":
      return <FusionEnergyThumb />;
    case "minimal-store":
      return <MinimalStoreThumb />;
    case "dev-portfolio":
      return <DevPortfolioThumb />;
    case "saas-dashboard":
      return <SaaSDashboardThumb />;
    case "pixel-platformer":
      return <PixelPlatformerThumb />;
    case "starter-next":
      return <StarterNextThumb />;
    case "agency-studio":
      return <AgencyStudioThumb />;
    default:
      return <DefaultThumb />;
  }
}

/* ---- shared helpers ---- */

function GridBackdrop({
  color = "rgba(122,198,90,0.07)",
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}

/* ---- individual thumbnails ---- */

function CrosscutThumb() {
  // SaaS video clipping tool — filmstrip + play triangle + clip bars
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1f17] to-[#0d0f0c]" />
      {/* filmstrip top & bottom */}
      <div className="absolute top-0 left-0 right-0 h-2.5 bg-[#0b0b0c] flex items-center gap-1 px-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-[1px] bg-[#2a2d31]" />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-2.5 bg-[#0b0b0c] flex items-center gap-1 px-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-[1px] bg-[#2a2d31]" />
        ))}
      </div>
      {/* play triangle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-7 rounded-full border border-accent-fill/60 bg-[#0b0b0c]/60 flex items-center justify-center">
          <div
            className="ml-0.5"
            style={{
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "9px solid #ff8c75",
            }}
          />
        </div>
      </div>
      {/* clip scrubber */}
      <div className="absolute left-2 right-2 bottom-3 flex items-center gap-1">
        <span className="h-1 flex-1 rounded-full bg-accent-fill/40" />
        <span className="h-1 w-6 rounded-full bg-accent-hi" />
        <span className="h-1 flex-1 rounded-full bg-accent-fill/25" />
        <span className="h-1 w-4 rounded-full bg-streak/70" />
        <span className="h-1 flex-1 rounded-full bg-accent-fill/25" />
      </div>
    </>
  );
}

function RetroTerminalThumb() {
  // Retro terminal starter — scanlines + amber prompt + cursor
  return (
    <>
      <div className="absolute inset-0 bg-[#0c0e0a]" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(240,138,60,0.07) 0px, rgba(240,138,60,0.07) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* terminal text lines */}
      <div className="absolute left-2 top-2 right-2 flex flex-col gap-[3px] font-mono">
        <span className="text-[7px] text-streak/90">forge@home:~$</span>
        <span className="text-[7px] text-streak/70 ml-3">boot.sequence</span>
        <span className="text-[7px] text-streak/90">forge@home:~$</span>
        <span className="text-[7px] text-accent-hi ml-3">_init portfolio</span>
        <span className="text-[7px] text-streak/70 ml-3">ready...</span>
        <div className="flex items-center gap-1 ml-3">
          <span className="text-[7px] text-streak/90">&gt;</span>
          <span className="inline-block h-2 w-1.5 bg-accent-hi animate-pulse" />
        </div>
      </div>
      {/* vignette */}
      <div className="absolute inset-0 rounded-[6px] shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />
    </>
  );
}

function CreativeAgencyThumb() {
  // Bold creative agency — large "Aa" mark + diagonal accent stripe
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#171a13] to-[#0b0d0a]" />
      {/* diagonal stripe */}
      <div
        className="absolute -right-4 top-0 bottom-0 w-8 bg-accent-fill/15"
        style={{ transform: "skewX(-18deg)" }}
      />
      <div
        className="absolute -right-1 top-0 bottom-0 w-2 bg-streak/40"
        style={{ transform: "skewX(-18deg)" }}
      />
      {/* big Aa */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[26px] font-bold leading-none text-accent-hi tracking-tight">
          Aa
        </span>
      </div>
      {/* tiny dots row */}
      <div className="absolute left-2 bottom-2 flex items-center gap-1">
        <span className="size-1 rounded-full bg-streak" />
        <span className="size-1 rounded-full bg-accent-fill" />
        <span className="size-1 rounded-full bg-ws-disabled" />
      </div>
    </>
  );
}

function LookOutBelowThumb() {
  // Game — character dodging falling blocks + coins
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#10130d] to-[#0a0c08]" />
      <GridBackdrop color="rgba(122,198,90,0.05)" size={12} />
      {/* falling blocks */}
      <div className="absolute left-3 top-1 size-2 rounded-[2px] bg-streak/80" />
      <div className="absolute left-8 top-3 size-2 rounded-[2px] bg-streak/60 rotate-12" />
      <div className="absolute right-6 top-2 size-2 rounded-full bg-accent-hi" />
      <div className="absolute right-2 top-4 size-2 rounded-full bg-accent-hi/70" />
      {/* coin */}
      <div className="absolute right-9 top-5 size-1.5 rounded-full border border-streak bg-streak/40" />
      {/* ground */}
      <div className="absolute bottom-2 left-0 right-0 h-1 bg-accent-fill/40" />
      {/* character */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="size-2.5 rounded-full bg-accent-hi" />
        <div className="h-1.5 w-2 rounded-t-sm bg-accent-fill" />
      </div>
      {/* score */}
      <div className="absolute right-1.5 top-1 text-[6px] font-mono text-ws-secondary">
        x3
      </div>
    </>
  );
}

function ClimateStoryThumb() {
  // Scrollytelling climate data — rising temperature line chart
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a130d] to-[#0b0a07]" />
      {/* axis */}
      <div className="absolute left-2 bottom-3 right-2 h-px bg-ws-border" />
      <div className="absolute left-2 bottom-3 top-2 w-px bg-ws-border" />
      {/* line */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points="6,46 18,42 30,40 42,33 54,30 66,22 78,17 90,10"
          fill="none"
          stroke="#f08a3c"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* area fill */}
        <polygon
          points="6,46 18,42 30,40 42,33 54,30 66,22 78,17 90,10 90,52 6,52"
          fill="#f08a3c"
          opacity="0.12"
        />
        {/* end dot */}
        <circle cx="90" cy="10" r="2" fill="#f08a3c" />
      </svg>
      {/* label */}
      <div className="absolute left-2 top-1.5 text-[6px] font-mono text-streak/80">
        +1.2°C
      </div>
    </>
  );
}

function FusionEnergyThumb() {
  // Portfolio for fusion lab — concentric reactor rings + nucleus
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1310] to-[#0a0c0a]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden="true"
        >
          {/* rings */}
          <ellipse
            cx="28"
            cy="28"
            rx="22"
            ry="9"
            stroke="#fa3a18"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <ellipse
            cx="28"
            cy="28"
            rx="22"
            ry="9"
            stroke="#ff8c75"
            strokeOpacity="0.5"
            strokeWidth="1"
            transform="rotate(60 28 28)"
          />
          <ellipse
            cx="28"
            cy="28"
            rx="22"
            ry="9"
            stroke="#f08a3c"
            strokeOpacity="0.45"
            strokeWidth="1"
            transform="rotate(120 28 28)"
          />
          {/* nucleus */}
          <circle cx="28" cy="28" r="3.5" fill="#ff8c75" />
          <circle cx="28" cy="28" r="6" stroke="#ff8c75" strokeOpacity="0.3" />
        </svg>
      </div>
      {/* tick marks */}
      <div className="absolute left-2 bottom-1.5 text-[6px] font-mono text-ws-secondary">
        Reactor 01
      </div>
    </>
  );
}

function MinimalStoreThumb() {
  // E-commerce store — product grid + cart
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#131611] to-[#0b0d0a]" />
      {/* top bar */}
      <div className="absolute left-1.5 right-1.5 top-1.5 flex items-center justify-between">
        <span className="text-[6px] text-ws-secondary">store</span>
        <div className="flex items-center gap-0.5">
          <span className="size-1.5 rounded-[1px] bg-accent-fill/40" />
          <span className="text-[6px] text-accent-hi">2</span>
        </div>
      </div>
      {/* product grid */}
      <div className="absolute left-2 right-2 top-5 bottom-2 grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-[2px] bg-[#0b0b0c] border border-ws-border-soft flex flex-col"
          >
            <div
              className={cn(
                "flex-1 m-0.5 rounded-[1px]",
                i % 3 === 0
                  ? "bg-accent-fill/25"
                  : i % 3 === 1
                  ? "bg-streak/25"
                  : "bg-accent-hi/20"
              )}
            />
            <div className="h-0.5 mx-0.5 mb-0.5 rounded-full bg-ws-border" />
          </div>
        ))}
      </div>
    </>
  );
}

function DevPortfolioThumb() {
  // Developer portfolio — code braces + dot markers
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1310] to-[#0a0c0a]" />
      <GridBackdrop color="rgba(122,198,90,0.05)" size={10} />
      {/* braces */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[24px] font-mono font-bold text-accent-fill/70 leading-none">
          {"{ }"}
        </span>
      </div>
      {/* code lines */}
      <div className="absolute left-2 bottom-2 right-2 flex flex-col gap-[3px]">
        <div className="flex items-center gap-1">
          <span className="h-0.5 w-2 bg-streak/70" />
          <span className="h-0.5 w-6 bg-accent-hi/60" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-accent-fill/50" />
          <span className="h-0.5 w-8 bg-ws-border" />
        </div>
      </div>
      {/* corner dot */}
      <div className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-hi animate-pulse" />
    </>
  );
}

function SaaSDashboardThumb() {
  // SaaS analytics — KPI cards + bar chart
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#131611] to-[#0b0d0a]" />
      {/* KPI cards */}
      <div className="absolute left-2 right-2 top-2 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[2px] bg-[#0b0b0c] border border-ws-border-soft p-0.5"
          >
            <div className="h-0.5 w-3/4 bg-ws-border rounded-full mb-0.5" />
            <div className="h-1 w-1/2 bg-accent-hi/70 rounded-full" />
          </div>
        ))}
      </div>
      {/* bar chart */}
      <div className="absolute left-2 right-2 bottom-2 h-5 flex items-end gap-1">
        {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[1px]"
            style={{
              height: `${h}%`,
              background:
                i === 5
                  ? "#f08a3c"
                  : i % 2 === 0
                  ? "rgba(90,158,63,0.45)"
                  : "rgba(122,198,90,0.55)",
            }}
          />
        ))}
      </div>
    </>
  );
}

function PixelPlatformerThumb() {
  // Pixel art platformer — pixel grid + character + platforms + gems
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1310] to-[#0a0c0a]" />
      {/* pixel grid */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(122,198,90,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(122,198,90,0.06) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />
      {/* platforms */}
      <div className="absolute left-2 bottom-4 h-1 w-10 bg-accent-fill/60" />
      <div className="absolute right-3 bottom-7 h-1 w-8 bg-accent-fill/60" />
      {/* character */}
      <div
        className="absolute left-5 bottom-5 grid grid-cols-3 gap-px"
        style={{ width: 9, height: 9 }}
      >
        <span className="bg-accent-hi" />
        <span className="bg-accent-hi" />
        <span className="bg-transparent" />
        <span className="bg-accent-hi" />
        <span className="bg-accent-hi" />
        <span className="bg-accent-hi" />
        <span className="bg-transparent" />
        <span className="bg-accent-fill" />
        <span className="bg-transparent" />
      </div>
      {/* gems */}
      <div className="absolute right-5 top-2 size-1.5 rotate-45 bg-streak" />
      <div className="absolute right-3 top-4 size-1 rotate-45 bg-streak/70" />
    </>
  );
}

function StarterNextThumb() {
  // Next.js starter — atom/hex mark + route segments
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1310] to-[#0a0c0a]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r="3" fill="#ff8c75" />
          <ellipse cx="17" cy="17" rx="14" ry="5" stroke="#fa3a18" strokeOpacity="0.5" />
          <ellipse
            cx="17"
            cy="17"
            rx="14"
            ry="5"
            stroke="#ff8c75"
            strokeOpacity="0.4"
            transform="rotate(60 17 17)"
          />
          <ellipse
            cx="17"
            cy="17"
            rx="14"
            ry="5"
            stroke="#f08a3c"
            strokeOpacity="0.35"
            transform="rotate(120 17 17)"
          />
        </svg>
      </div>
      {/* route segments */}
      <div className="absolute left-2 bottom-1.5 flex items-center gap-1 font-mono text-[6px] text-ws-secondary">
        <span className="text-accent-hi">/</span>
        <span>about</span>
        <span className="text-ws-disabled">/</span>
        <span>blog</span>
      </div>
    </>
  );
}

function AgencyStudioThumb() {
  // Studio landing — fullscreen hero block + team grid
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#16190f] to-[#0b0d09]" />
      {/* hero block */}
      <div className="absolute left-2 right-2 top-2 h-7 rounded-[3px] bg-[#0b0b0c] border border-ws-border-soft overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-fill/15 to-transparent" />
        <div className="absolute left-1.5 top-1.5">
          <div className="h-1 w-8 bg-accent-hi/80 rounded-full mb-0.5" />
          <div className="h-0.5 w-6 bg-ws-secondary/60 rounded-full" />
        </div>
        <div className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-streak" />
      </div>
      {/* team grid */}
      <div className="absolute left-2 right-2 bottom-2 grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-[2px] border border-ws-border-soft bg-[#0b0b0c]"
            style={{
              background:
                i % 2 === 0
                  ? "linear-gradient(135deg, rgba(90,158,63,0.25), transparent)"
                  : "linear-gradient(135deg, rgba(240,138,60,0.2), transparent)",
            }}
          />
        ))}
      </div>
    </>
  );
}

function DefaultThumb() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#16190f] to-[#0b0d09]" />
      <GridBackdrop />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-[1px]",
                i === 4 ? "bg-accent-hi" : "bg-accent-fill/30"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}
