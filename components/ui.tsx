"use client";
import { motion, useSpring, useTransform } from "motion/react";
import { useEffect, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { press, spring } from "@/components/motion/presets";

/** green → amber → red as a CSS colour, for scores where higher = worse. */
export function riskColor(v: number) {
  const x = Math.max(0, Math.min(100, v));
  return x < 50
    ? `color-mix(in oklab, var(--pressure) ${x * 2}%, var(--antibody))`
    : `color-mix(in oklab, var(--threat) ${(x - 50) * 2}%, var(--pressure))`;
}
export const goodColor = (v: number) => riskColor(100 - v);

export function Ticker({ value, className }: { value: number; className?: string }) {
  const mv = useSpring(0, { stiffness: 70, damping: 18 });
  const text = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => mv.set(value), [mv, value]);
  return <motion.span className={`tnum ${className ?? ""}`}>{text}</motion.span>;
}

export function Ring({
  value,
  size = 120,
  label,
  color,
}: {
  value: number;
  size?: number;
  label: string;
  color: string;
}) {
  const r = size / 2 - 7;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{ stroke: color, transition: "stroke 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <Ticker value={value} className="font-mono text-3xl font-semibold" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      </div>
      <span className="sr-only">
        {label}: {Math.round(value)} out of 100
      </span>
    </div>
  );
}

// Antigen (jagged threat) ⇄ antibody (smooth Y) — both 12-point closed paths so `d` morphs cleanly.
const STAR = (() => {
  const pts: string[] = [];
  for (let k = 0; k < 12; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 12;
    const rad = k % 2 ? 4.6 : 10;
    pts.push(`${(12 + rad * Math.cos(a)).toFixed(2)} ${(12 + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
})();
const Y = "M10.5 22 L10.5 17 L10.5 13 L5 6.5 L4.5 4 L6.5 3 L12 9.5 L17.5 3 L19.5 4 L19 6.5 L13.5 13 L13.5 22 Z";

export function Glyph({ neutral, size = 18, className }: { neutral: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <motion.path
        initial={false}
        animate={{ d: neutral ? Y : STAR, rotate: neutral ? 0 : 15 }}
        transition={spring.smooth}
        style={{
          fill: neutral ? "var(--antibody)" : "var(--threat)",
          transition: "fill 0.4s ease",
          transformOrigin: "12px 12px",
        }}
      />
    </svg>
  );
}

type BtnProps = ComponentProps<typeof motion.button> & { variant?: "primary" | "ghost" | "danger"; children: ReactNode };
export function Button({ variant = "ghost", className = "", children, ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 select-none";
  const v = {
    primary: "bg-antibody text-black hover:brightness-110 shadow-[0_0_24px_-6px_var(--antibody)]",
    ghost: "border border-line bg-surface hover:bg-surface-2 text-fg",
    danger: "border border-line bg-surface hover:border-threat/50 hover:text-threat text-muted",
  }[variant];
  return (
    <motion.button {...press} className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </motion.button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">{children}</kbd>
  );
}

export const CATEGORY_LABEL: Record<string, string> = {
  identity: "Identity",
  location: "Location",
  routine: "Routine",
  relationships: "Relationships",
  work: "Work",
  finance: "Finance",
  security_questions: "Security answers",
  devices_and_apps: "Devices & apps",
  emotional_levers: "Emotional levers",
};

export const CATEGORY_COLOR: Record<string, string> = {
  identity: "var(--signal)",
  location: "#c084fc",
  routine: "var(--pressure)",
  relationships: "#f472b6",
  work: "#38bdf8",
  finance: "#facc15",
  security_questions: "var(--threat)",
  devices_and_apps: "#2dd4bf",
  emotional_levers: "#fb923c",
};

export const SENS_COLOR = { low: "var(--antibody)", medium: "var(--pressure)", high: "var(--threat)" } as const;

export const TACTIC_LABEL: Record<string, string> = {
  urgency: "Urgency",
  authority: "Authority",
  fear: "Fear",
  scarcity: "Scarcity",
  reciprocity: "Reciprocity",
  social_proof: "Social proof",
  isolation: "Isolation",
  familiarity: "Familiarity",
  foot_in_door: "Foot in the door",
  guilt: "Guilt",
};

export function TacticChip({ tag, count, quote }: { tag: string; count?: number; quote?: string }) {
  const hot = ["urgency", "fear", "scarcity", "guilt", "isolation"].includes(tag);
  return (
    <motion.span
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      title={quote ? `“${quote}”` : undefined}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{
        borderColor: `color-mix(in oklab, ${hot ? "var(--pressure)" : "var(--signal)"} 40%, transparent)`,
        color: hot ? "var(--pressure)" : "var(--signal)",
        background: `color-mix(in oklab, ${hot ? "var(--pressure)" : "var(--signal)"} 8%, transparent)`,
      }}
    >
      {TACTIC_LABEL[tag] ?? tag}
      {count !== undefined && <span className="tnum opacity-70">×{count}</span>}
    </motion.span>
  );
}

export function HelplineFooter() {
  return (
    <p className="text-center font-mono text-xs text-muted">
      If this happens for real: call <span className="font-semibold text-fg">1930</span> or report at{" "}
      <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-fg underline underline-offset-4">
        cybercrime.gov.in
      </a>
    </p>
  );
}

/** Fixed overlays render into <body> so transformed/filtered ancestors can't become their containing block. */
const noop = () => () => {};
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}