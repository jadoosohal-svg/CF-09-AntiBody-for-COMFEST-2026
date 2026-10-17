"use client";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Clock,
  HeartCrack,
  IdCard,
  KeyRound,
  MapPin,
  PencilLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { set, useSession } from "@/lib/store";
import { analyze, abortAll, goStage, loadSample } from "@/lib/pipeline";
import type { DeepPartial, Inference } from "@/lib/schemas";
import { spring, stagger, listItem } from "@/components/motion/presets";
import { Button, CATEGORY_COLOR, CATEGORY_LABEL, Glyph, Portal, Ring, SENS_COLOR, riskColor } from "@/components/ui";

const ICON: Record<string, LucideIcon> = {
  identity: IdCard,
  location: MapPin,
  routine: Clock,
  relationships: Users,
  work: Briefcase,
  finance: Wallet,
  security_questions: KeyRound,
  devices_and_apps: Smartphone,
  emotional_levers: HeartCrack,
};

/** Only fully-emitted inferences are shown: everything but the last while streaming. */
export function completeInferences(inf: DeepPartial<Inference>[] | undefined, done: boolean): Inference[] {
  const list = inf ?? [];
  return (done ? list : list.slice(0, -1)).filter(
    (i): i is Inference => Boolean(i?.id && i.claim && i.category && i.evidence?.length),
  );
}

/** Snap a cited span to its verbatim quote when the model's offsets drift; clamp otherwise. */
export function spanFor(e: Inference["evidence"][number], text: string): [number, number] | null {
  if (e.quote) {
    const at = text.indexOf(e.quote);
    if (at !== -1) return [at, at + e.quote.length];
  }
  const s = Math.max(0, Math.min(text.length, e.start ?? 0));
  const t = Math.max(s, Math.min(text.length, e.end ?? 0));
  return t > s ? [s, t] : null;
}

export function Mirror() {
  const hasSegments = useSession((s) => s.segments.length > 0 && (s.analyzing || s.dossier !== null));
  const dossierDone = useSession((s) => s.dossierDone);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section aria-label="Your public text" className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          {hasSegments ? (
            <motion.div key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReadingMode />
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InputPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <section aria-label="Attacker's dossier" className="min-w-0">
        <DossierPanel />
      </section>
      <Portal>
        <Beams />
      </Portal>
      <Portal>
      <AnimatePresence>
        {dossierDone && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring.smooth}
            className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
          >
            <Button variant="primary" className="px-5 py-3 text-base" onClick={() => goStage("strike")}>
              Show me how they&apos;d attack <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
}

const CHIPS = ["Instagram bio", "LinkedIn headline", "Recent posts", "Apps I use"];

function InputPanel() {
  const rawText = useSession((s) => s.rawText);
  const consent = useSession((s) => s.consent);
  const ref = useRef<HTMLTextAreaElement>(null);
  const ready = consent && rawText.trim().length > 0;

  const addSection = (label: string) => {
    const sep = rawText && !rawText.endsWith("\n") ? "\n" : "";
    set({ rawText: `${rawText}${sep}## ${label}\n` });
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });
  };

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Paste what&apos;s public about you</h1>
        <button onClick={loadSample} className="text-xs text-signal underline-offset-4 hover:underline">
          Load sample profile
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Your bio, a few post captions, the apps you use. Antibody only reads what you paste — no lookups, no scraping.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.95 }}
            onClick={() => addSection(c)}
            className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            + {c}
          </motion.button>
        ))}
      </div>
      <div className="relative">
        <label htmlFor="profile" className="sr-only">
          Your public information
        </label>
        <textarea
          id="profile"
          ref={ref}
          value={rawText}
          onChange={(e) => set({ rawText: e.target.value })}
          rows={14}
          spellCheck={false}
          placeholder={`## Instagram bio\nDesigner in Bengaluru · dog mom 🐶\n## Recent posts\n6am gym again 💪\n## Apps I use\nWhatsApp, a UPI app, my bank's app…`}
          className="scroll-thin min-h-[320px] w-full resize-y rounded-xl border border-line bg-bg/60 p-4 font-mono text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted/50 focus:border-signal/60"
        />
        <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] text-muted tnum">
          {rawText.length.toLocaleString()} chars
        </span>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2/50 p-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => set({ consent: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-[var(--antibody)]"
          required
        />
        <span>
          This is my own information, or I have this person&apos;s explicit consent.
          <span className="block text-xs text-muted">Required. Antibody never analyses anyone without consent.</span>
        </span>
      </label>
      <Button
        variant={ready ? "primary" : "ghost"}
        disabled={!ready}
        onClick={() => void analyze()}
        className="mt-4 w-full py-3 text-base"
        aria-describedby="analyze-hint"
      >
        <Sparkles size={17} /> Analyze my exposure
      </Button>
      <p id="analyze-hint" className="mt-2 text-center text-xs text-muted">
        {consent ? "Nothing is stored. Wipe anytime." : "Tick the consent box to continue."}
      </p>
    </div>
  );
}

function ReadingMode() {
  const lines = useSession((s) => s.lines);
  const segments = useSession((s) => s.segments);
  const analyzing = useSession((s) => s.analyzing);
  const boxRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(600);
  useLayoutEffect(() => {
    if (boxRef.current) setH(boxRef.current.scrollHeight);
  }, [lines]);

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          {analyzing ? <span className="shimmer">Reading like an attacker…</span> : "Source text"}
        </h2>
        <button
          onClick={() => {
            abortAll();
            set({ dossier: null, dossierDone: false, analyzing: false, segments: [], lines: [], scenarios: [], attacksDone: false });
          }}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
        >
          <PencilLine size={13} /> Edit
        </button>
      </div>
      <div ref={boxRef} className="relative space-y-1.5" style={{ ["--scan-h" as string]: `${h}px` }}>
        {analyzing && <div className="scanline" aria-hidden />}
        {lines.map((l, i) =>
          l.header ? (
            <div key={i} className="pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70 first:pt-0">
              {l.header}
            </div>
          ) : (
            <SegmentLine key={l.segmentId} id={l.segmentId!} text={segments.find((s) => s.id === l.segmentId)?.text ?? ""} />
          ),
        )}
      </div>
    </div>
  );
}

const SegmentLine = memo(function SegmentLine({ id, text }: { id: string; text: string }) {
  const dossier = useSession((s) => s.dossier);
  const done = useSession((s) => s.dossierDone);
  const hover = useSession((s) => s.hoverInf);

  // Split the segment at every evidence boundary so overlapping citations render cleanly.
  const pieces = useMemo(() => {
    const ranges: { s: number; e: number; inf: Inference; first: boolean }[] = [];
    for (const inf of completeInferences(dossier?.inferences, done))
      inf.evidence.forEach((ev, k) => {
        if (ev.segmentId !== id) return;
        const sp = spanFor(ev, text);
        if (sp) ranges.push({ s: sp[0], e: sp[1], inf, first: k === 0 });
      });
    const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.s, r.e])])].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((s, i) => {
      const e = cuts[i + 1];
      const cover = ranges.filter((r) => r.s <= s && r.e >= e);
      return { s, e, cover };
    });
  }, [dossier, done, id, text]);

  return (
    <div className="flex gap-3 text-[14px] leading-relaxed">
      <span className="w-7 shrink-0 select-none pt-0.5 text-right font-mono text-[10px] text-muted/70">{id}</span>
      <p className="min-w-0 flex-1 break-words">
        {pieces.map(({ s, e, cover }) => {
          const t = text.slice(s, e);
          if (!cover.length) return <span key={s}>{t}</span>;
          const top = cover[cover.length - 1].inf;
          const active = cover.some((c) => c.inf.id === hover);
          const color = CATEGORY_COLOR[top.category];
          return (
            <motion.mark
              key={s}
              data-span={cover.find((c) => c.first)?.inf.id ?? top.id}
              data-span-of={cover.map((c) => c.inf.id).join(" ")}
              onMouseEnter={() => set({ hoverInf: top.id })}
              onMouseLeave={() => set({ hoverInf: null })}
              initial={{ backgroundColor: "rgba(0,0,0,0)" }}
              animate={{ backgroundColor: `color-mix(in oklab, ${color} ${active ? 38 : 20}%, transparent)` }}
              transition={{ duration: 0.25 }}
              className="cursor-default rounded-[3px] px-[1px] text-fg"
              style={{ boxShadow: active ? `0 0 0 1px ${color}` : "none" }}
            >
              {t}
            </motion.mark>
          );
        })}
      </p>
    </div>
  );
});

function DossierPanel() {
  const dossier = useSession((s) => s.dossier);
  const done = useSession((s) => s.dossierDone);
  const analyzing = useSession((s) => s.analyzing);
  const reconnecting = useSession((s) => s.reconnecting);
  const list = completeInferences(dossier?.inferences, done);

  const groups = useMemo(() => {
    const m = new Map<string, Inference[]>();
    for (const i of list) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m];
  }, [list]);

  if (!dossier && !analyzing) return <EmptyDossier />;
  const score = typeof dossier?.exposureScore === "number" ? dossier.exposureScore : 0;

  return (
    <motion.div
      className="card relative p-5"
      animate={done ? { boxShadow: ["inset 0 1px 0 0 var(--highlight)", "0 0 0 1px var(--antibody), 0 0 40px -10px var(--antibody)", "inset 0 1px 0 0 var(--highlight)"] } : {}}
      transition={{ duration: 1.2 }}
    >
      <div className="flex items-center gap-5 border-b border-line pb-5">
        <Ring value={score} label="Exposure" color={riskColor(score)} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">The attacker&apos;s dossier on you</div>
          {dossier?.headline ? (
            <p className={`text-lg font-semibold leading-snug ${done ? "" : "shimmer"}`}>{dossier.headline}</p>
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-2/3" />
            </div>
          )}
          {reconnecting && <p className="shimmer mt-2 text-xs">Reconnecting…</p>}
          <p className="mt-2 font-mono text-xs text-muted tnum">
            {list.length} inference{list.length === 1 ? "" : "s"}
            {!done && " · streaming"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map(([cat, items]) => (
          <motion.div key={cat} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring.smooth}>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: CATEGORY_COLOR[cat] }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLOR[cat] }} />
              {CATEGORY_LABEL[cat] ?? cat}
            </div>
            <motion.ul className="grid gap-2" initial="hidden" animate="show" transition={{ staggerChildren: stagger.list }}>
              {items.map((i) => (
                <InferenceCard key={i.id} inf={i} />
              ))}
            </motion.ul>
          </motion.div>
        ))}
        {!done &&
          Array.from({ length: Math.max(1, 3 - Math.min(2, list.length)) }).map((_, k) => (
            <div key={k} className="skeleton h-[86px]" aria-hidden />
          ))}
      </div>
    </motion.div>
  );
}

const InferenceCard = memo(function InferenceCard({ inf }: { inf: Inference }) {
  const active = useSession((s) => s.hoverInf === inf.id);
  const Icon = ICON[inf.category] ?? Sparkles;
  const color = CATEGORY_COLOR[inf.category];
  const enter = () => {
    set({ hoverInf: inf.id });
    document.querySelector(`[data-span="${inf.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return (
    <motion.li
      layout
      variants={listItem}
      data-card={inf.id}
      tabIndex={0}
      onMouseEnter={enter}
      onFocus={enter}
      onMouseLeave={() => set({ hoverInf: null })}
      onBlur={() => set({ hoverInf: null })}
      className="rounded-xl border bg-surface-2/60 p-3 outline-none transition-colors"
      style={{ borderColor: active ? color : "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">{inf.claim}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: SENS_COLOR[inf.sensitivity] }} />
              {inf.sensitivity}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            <span className="text-fg/70">How they&apos;d use it:</span> {inf.attackerUse}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: color }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: inf.confidence }}
                transition={spring.smooth}
              />
            </div>
            <span className="font-mono text-[10px] text-muted tnum">{Math.round(inf.confidence * 100)}% sure</span>
            <span className="font-mono text-[10px] text-muted/70">{[...new Set(inf.evidence.map((e) => e.segmentId))].join(" ")}</span>
          </div>
        </div>
      </div>
    </motion.li>
  );
});

function EmptyDossier() {
  return (
    <div className="card grid min-h-[420px] place-items-center p-8 text-center">
      <div>
        <div className="relative mx-auto mb-6 h-24 w-40" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <motion.div
              key={k}
              className="absolute"
              style={{ left: `${10 + k * 28}px`, top: `${k % 2 ? 40 : 14}px` }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3 + k * 0.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Glyph neutral={k === 2} size={k === 2 ? 34 : 22} />
            </motion.div>
          ))}
        </div>
        <h2 className="text-lg font-semibold">Your attacker&apos;s dossier appears here</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Every fact a scammer could infer, linked to the exact words that gave it away.
        </p>
        <Button className="mt-5" onClick={loadSample}>
          <ShieldCheck size={15} /> Load sample profile
        </Button>
      </div>
    </div>
  );
}

/** Draws a beam from a freshly-cited span to its card for ~600ms. */
function Beams() {
  const dossier = useSession((s) => s.dossier);
  const done = useSession((s) => s.dossierDone);
  const ids = completeInferences(dossier?.inferences, done).map((i) => i.id);
  const latest = ids.at(-1);
  const seen = useRef(new Set<string>());
  const [beam, setBeam] = useState<{ id: string; d: string } | null>(null);

  useEffect(() => {
    if (!latest || seen.current.has(latest)) return;
    seen.current.add(latest);
    const raf = requestAnimationFrame(() => {
      const a = document.querySelector(`[data-span="${latest}"]`)?.getBoundingClientRect();
      const b = document.querySelector(`[data-card="${latest}"]`)?.getBoundingClientRect();
      if (!a || !b || window.innerWidth < 1024) return;
      const x1 = a.right, y1 = a.top + a.height / 2, x2 = b.left, y2 = b.top + 20;
      const mx = (x1 + x2) / 2;
      setBeam({ id: latest, d: `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
    });
    const t = setTimeout(() => setBeam((b) => (b?.id === latest ? null : b)), 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [latest]);

  useEffect(() => {
    if (!dossier) seen.current.clear();
  }, [dossier]);

  return (
    <svg className="pointer-events-none fixed inset-0 z-20 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="beam-g" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--signal)" />
          <stop offset="100%" stopColor="var(--antibody)" />
        </linearGradient>
      </defs>
      <AnimatePresence>
        {beam && (
          <motion.path
            key={beam.id}
            d={beam.d}
            fill="none"
            stroke="url(#beam-g)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}
