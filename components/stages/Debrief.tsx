"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { set, selectedScenario, useSession, type Judge } from "@/lib/store";
import { nextScenario, startOver } from "@/lib/pipeline";
import type { Debrief, DeepPartial, Turn } from "@/lib/schemas";
import { spring, stagger, listItem } from "@/components/motion/presets";
import { Button, Glyph, HelplineFooter, Ring, TacticChip, Ticker, goodColor, riskColor } from "@/components/ui";

const SENS_WEIGHT = { high: 9, medium: 6, low: 3 } as const;

export function DebriefStage({ onWipe }: { onWipe: () => void }) {
  const debrief = useSession((s) => s.debrief);
  const done = useSession((s) => s.debriefDone);
  const reconnecting = useSession((s) => s.reconnecting);
  const d = debrief ?? {};

  return (
    <div className="space-y-6">
      <Header d={d} done={done} />
      {reconnecting && <p className="shimmer text-center text-sm">Reconnecting…</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Replay momentIndex={typeof d.momentOfCompromise?.turnIndex === "number" ? d.momentOfCompromise.turnIndex : -1} explanation={d.momentOfCompromise?.explanation} />
          <RiskChart />
          <Tactics d={d} />
        </div>
        <div className="min-w-0 space-y-6">
          <Fixes d={d} done={done} />
          <Worked d={d} />
        </div>
      </div>
      <Actions d={d} done={done} onWipe={onWipe} />
      <div className="card p-4">
        <HelplineFooter />
      </div>
    </div>
  );
}

function Header({ d, done }: { d: DeepPartial<Debrief>; done: boolean }) {
  const outcome = useSession((s) => s.outcome);
  const color = outcome === "COMPROMISED" ? "var(--threat)" : outcome === "RESISTED" ? "var(--antibody)" : "var(--signal)";
  const score = typeof d.resilienceScore === "number" ? d.resilienceScore : 0;
  return (
    <div className="card grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <Ring value={score} label="Resilience" color={goodColor(score)} size={136} />
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
          Stage 3 · Debrief · {outcome}
        </div>
        {d.verdict ? (
          <h1 className={`mt-1 text-xl font-semibold leading-snug sm:text-2xl ${done ? "" : "shimmer"}`}>{d.verdict}</h1>
        ) : (
          <div className="skeleton mt-2 h-7 w-4/5" />
        )}
        {d.realWorldRule ? (
          <blockquote className="mt-4 border-l-2 pl-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl" style={{ borderColor: color }}>
            “{d.realWorldRule}”
          </blockquote>
        ) : (
          <div className="skeleton mt-4 h-9 w-3/5" />
        )}
      </div>
    </div>
  );
}

/** Risk the user was at, at each transcript index (carried forward from the last judged user turn). */
function useRiskSeries(turns: Turn[], judges: Record<string, Judge>) {
  return useMemo(
    () =>
      turns.reduce<number[]>(
        (acc, t) => [...acc, t.role === "user" && judges[t.id] ? judges[t.id].userRisk : (acc.at(-1) ?? 0)],
        [],
      ),
    [turns, judges],
  );
}

function Replay({ momentIndex, explanation }: { momentIndex: number; explanation?: string }) {
  const turns = useSession((s) => s.turns);
  const judges = useSession((s) => s.judgeByTurnId);
  const risks = useRiskSeries(turns, judges);
  // until the user picks a node, the selection follows the decisive moment
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked ?? (momentIndex >= 0 && momentIndex < turns.length ? momentIndex : 0);
  const setSel = (f: number | ((i: number) => number)) => setPicked((p) => (typeof f === "function" ? f(p ?? sel) : f));
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const selRef = useRef(sel);

  useEffect(() => {
    selRef.current = sel;
    scroller.current?.querySelector(`[data-node="${sel}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [sel]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const i = selRef.current;
      if (i >= turns.length - 1) setPlaying(false);
      else setPicked(i + 1);
    }, 1200);
    return () => clearInterval(t);
  }, [playing, turns.length]);

  const t = turns[sel];
  const j = t?.role === "user" ? judges[t.id] : Object.values(judges).find((x) => x.scammerTurnId === t?.id);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Replay</h2>
        <button
          onClick={() => {
            if (!playing && sel >= turns.length - 1) setSel(0);
            setPlaying((p) => !p);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-fg"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div ref={scroller} className="scroll-thin overflow-x-auto pb-2" role="listbox" aria-label="Conversation turns">
        <div className="relative flex min-w-max items-center gap-2 px-1 py-3">
          <div className="absolute left-2 right-2 top-1/2 h-px bg-line" aria-hidden />
          {turns.map((x, i) => (
            <button
              key={x.id}
              data-node={i}
              role="option"
              aria-selected={sel === i}
              aria-label={`Turn ${i + 1}, ${x.role}, risk ${risks[i]}`}
              onClick={() => {
                setPlaying(false);
                setSel(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setSel((s) => Math.min(turns.length - 1, s + 1));
                if (e.key === "ArrowLeft") setSel((s) => Math.max(0, s - 1));
              }}
              className="relative z-10 grid h-8 w-8 place-items-center rounded-full"
            >
              {i === momentIndex && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: riskColor(risks[i]) }}
                  animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              <span
                className="block rounded-full transition-transform"
                style={{
                  width: x.role === "user" ? 14 : 10,
                  height: x.role === "user" ? 14 : 10,
                  background: x.role === "user" ? riskColor(risks[i]) : "var(--text-muted)",
                  transform: sel === i ? "scale(1.5)" : "scale(1)",
                  boxShadow: sel === i ? "0 0 0 3px var(--bg), 0 0 0 4px var(--signal)" : "none",
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {t && (
          <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-3 rounded-xl border border-line bg-surface-2/50 p-4">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
              <span>
                Turn {sel + 1} · {t.role === "user" ? "You" : "Scammer"}
              </span>
              {sel === momentIndex && <span className="text-pressure">Decisive moment</span>}
            </div>
            <p className="text-sm leading-relaxed">{t.text}</p>
            {t.role === "scammer" && j && j.scammerTactics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {j.scammerTactics.map((x, k) => (
                  <TacticChip key={k} tag={x.tag} quote={x.quote} />
                ))}
              </div>
            )}
            {t.role === "user" && j?.coachNote && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                <span className="font-mono text-[10px] uppercase tracking-wider text-signal">Coach · </span>
                {j.coachNote}
              </p>
            )}
            {sel === momentIndex && explanation && <p className="mt-3 text-sm text-pressure/90">{explanation}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RiskChart() {
  const turns = useSession((s) => s.turns);
  const judges = useSession((s) => s.judgeByTurnId);
  const points = turns.flatMap((t) => (t.role === "user" && judges[t.id] ? [judges[t.id]] : []));
  if (points.length === 0) return null;
  const W = 600, H = 150, P = 18;
  const x = (i: number) => P + (points.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (points.length - 1));
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.userRisk)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H - P} L${x(0)} ${H - P} Z`;

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Risk over the conversation</h2>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`Risk by turn: ${points.map((p) => p.userRisk).join(", ")}`}>
        <defs>
          <linearGradient id="risk-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--threat)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--antibody)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <line x1={P} x2={W - P} y1={y(70)} y2={y(70)} stroke="var(--threat)" strokeOpacity="0.4" strokeDasharray="4 4" />
        <text x={W - P} y={y(70) - 4} textAnchor="end" className="fill-muted font-mono text-[9px]">
          point of no return
        </text>
        <motion.path d={area} fill="url(#risk-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path d={line} fill="none" stroke="var(--text)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
        {points.map((p, i) => (
          <g key={p.turnId}>
            <circle cx={x(i)} cy={y(p.userRisk)} r="4" style={{ fill: riskColor(p.userRisk) }} />
            {p.scammerTactics.slice(0, 2).map((t, k) => (
              <text key={k} x={x(i)} y={H + 6 + k * 10} textAnchor="middle" className="fill-muted font-mono text-[8px] uppercase">
                {t.tag.replace(/_/g, " ").slice(0, 10)}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Tactics({ d }: { d: DeepPartial<Debrief> }) {
  const list = (d.tacticsSeen ?? []).filter((t) => t?.tag);
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tactics used on you</h2>
      {list.length === 0 ? (
        <div className="space-y-2">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      ) : (
        <motion.ul className="space-y-2" initial="hidden" animate="show" transition={{ staggerChildren: stagger.list }}>
          {list.map((t, i) => (
            <motion.li key={(t.tag ?? "") + i} variants={listItem} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:gap-3">
              <TacticChip tag={t.tag!} count={t.count} />
              {t.example && <span className="text-sm text-muted">“{t.example}”</span>}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function Worked({ d }: { d: DeepPartial<Debrief> }) {
  const list = (d.whatWorked ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">What you did well</h2>
      <ul className="space-y-2">
        {list.map((w, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.smooth, delay: i * stagger.list }} className="flex gap-2.5 text-sm">
            <Glyph neutral size={16} className="mt-0.5 shrink-0" />
            {w}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Fixes({ d, done }: { d: DeepPartial<Debrief>; done: boolean }) {
  const dossier = useSession((s) => s.dossier);
  const checked = useSession((s) => s.fixesDone);
  const fixes = (done ? d.fixes ?? [] : (d.fixes ?? []).slice(0, -1)).filter((f) => f?.action);
  const base = typeof dossier?.exposureScore === "number" ? dossier.exposureScore : 0;
  const sensOf = (id?: string) => dossier?.inferences?.find((i) => i?.id === id)?.sensitivity;
  const exposure = Math.max(
    0,
    base - fixes.reduce((sum, f, i) => (checked[i] ? sum + (SENS_WEIGHT[sensOf(f.inferenceId) ?? "low"] ?? 4) : sum), 0),
  );

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Your fixes</h2>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <Ticker value={exposure} className="font-mono text-2xl font-semibold" />
            <span className="font-mono text-xs text-muted">/100</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: riskColor(exposure) }}>
            exposure
          </div>
        </div>
      </div>
      {fixes.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((k) => (
            <div key={k} className="skeleton h-14" />
          ))}
        </div>
      )}
      <motion.ul className="space-y-2" initial="hidden" animate="show" transition={{ staggerChildren: stagger.list }}>
        {[...fixes.entries()]
          .sort(([, a], [, b]) => (a.priority ?? 3) - (b.priority ?? 3))
          .map(([i, f]) => {
            const inf = dossier?.inferences?.find((x) => x?.id === f.inferenceId);
            const on = Boolean(checked[i]);
            return (
              <motion.li key={i} variants={listItem} layout>
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${on ? "border-antibody/40 bg-antibody/5" : "border-line bg-surface-2/40 hover:border-line-strong"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => set((s) => ({ fixesDone: { ...s.fixesDone, [i]: !on } }))} />
                  <Glyph neutral={on} size={20} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${on ? "text-muted line-through decoration-antibody/60" : ""}`}>{f.action}</span>
                    {inf?.claim && (
                      <span className="mt-1 inline-block rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                        fixes: {inf.claim}
                      </span>
                    )}
                  </span>
                  {f.priority === 1 && <span className="h-fit shrink-0 rounded-full bg-threat/10 px-2 py-0.5 font-mono text-[9px] uppercase text-threat">today</span>}
                </label>
              </motion.li>
            );
          })}
      </motion.ul>
    </div>
  );
}

function Actions({ d, done, onWipe }: { d: DeepPartial<Debrief>; done: boolean; onWipe: () => void }) {
  const remaining = useSession((s) => s.scenarios.filter((x) => x.id && !s.playedIds.includes(x.id) && x.id !== s.selectedScenarioId).length);
  const sc = useSession(selectedScenario);
  const cardRef = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!cardRef.current) return;
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = "antibody-safety-card.png";
      a.click();
    } catch {
      toast("Couldn't render the card — try again.");
    }
  };

  // No personal data on the card: quoted fragments (names, nicknames) are scrubbed.
  const scrub = (s: string) => s.replace(/(['"‘’“”]).+?\1/g, "…").replace(/[‘“][^’”]*[’”]/g, "…");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {remaining > 0 && (
        <Button variant="primary" onClick={nextScenario}>
          <Shuffle size={15} /> Try the next scenario
        </Button>
      )}
      <Button onClick={startOver}>
        <RotateCcw size={15} /> Start over
      </Button>
      <Button onClick={() => void download()} disabled={!done}>
        <Download size={15} /> Download my safety card
      </Button>
      <Button variant="danger" onClick={onWipe}>
        <Trash2 size={15} /> Wipe everything
      </Button>

      {/* off-screen render target for the PNG */}
      <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden>
        <div ref={cardRef} style={{ width: 600, padding: 36, background: "#07080a", color: "#ecedee", fontFamily: "var(--font-geist-sans)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            <Glyph neutral size={22} /> Antibody · Safety card
          </div>
          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" }}>“{d.realWorldRule}”</div>
          <div style={{ marginTop: 14, fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#8a8f98" }}>
            Resilience {Math.round(d.resilienceScore ?? 0)}/100 · {sc?.archetype?.replace(/_/g, " ")}
          </div>
          <ol style={{ marginTop: 22, paddingLeft: 18, fontSize: 15, lineHeight: 1.6 }}>
            {(d.fixes ?? []).filter((f) => f?.action).map((f, i) => (
              <li key={i}>{scrub(f!.action!)}</li>
            ))}
          </ol>
          <div style={{ marginTop: 24, fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#3dffa8" }}>
            If this happens for real: call 1930 or report at cybercrime.gov.in
          </div>
        </div>
      </div>
    </div>
  );
}
