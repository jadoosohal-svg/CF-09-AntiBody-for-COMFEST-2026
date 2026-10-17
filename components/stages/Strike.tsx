"use client";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Mail, MessageCircle, MessageSquare, Phone, Send, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { get, selectedScenario, useSession } from "@/lib/store";
import { goStage, runDebrief, sendUser, startScenario } from "@/lib/pipeline";
import type { Channel, DeepPartial, Scenario, Turn } from "@/lib/schemas";
import { spring } from "@/components/motion/presets";
import { Button, Glyph, Portal, TacticChip, Ticker, riskColor } from "@/components/ui";

const CHANNEL: Record<Channel, { icon: typeof Mail; label: string }> = {
  whatsapp: { icon: MessageCircle, label: "Chat message" },
  sms: { icon: MessageSquare, label: "SMS" },
  email: { icon: Mail, label: "Email" },
  voice_call: { icon: Phone, label: "Voice call" },
};

const completeScenarios = (list: DeepPartial<Scenario>[], done: boolean) =>
  (done ? list : list.slice(0, -1)).filter((s): s is Scenario => Boolean(s?.id && s.title && s.openingMessage && s.goal));

export function Strike() {
  const selected = useSession((s) => s.selectedScenarioId);
  return selected ? <Simulation /> : <Picker />;
}

// ---------------- D1: scenario picker ----------------
function Picker() {
  const scenarios = useSession((s) => s.scenarios);
  const done = useSession((s) => s.attacksDone);
  const played = useSession((s) => s.playedIds);
  const list = useMemo(
    () => [...completeScenarios(scenarios, done)].sort((a, b) => b.predictedSuccessRate - a.predictedSuccessRate),
    [scenarios, done],
  );
  const topId = list[0]?.id;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Stage 2 · Strike</div>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">The three scams built for you</h1>
          <p className="mt-1 text-sm text-muted">Ordered by how likely each is to work on you. Pick one to face it in a safe simulation.</p>
        </div>
        <button onClick={() => goStage("mirror")} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft size={14} /> Dossier
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {list.map((sc, i) => (
          <ScenarioCard key={sc.id} sc={sc} index={i} top={sc.id === topId} played={played.includes(sc.id)} />
        ))}
        {Array.from({ length: Math.max(0, 3 - list.length) }).map((_, k) => (
          <div key={`sk${k}`} className="card p-5" aria-hidden>
            <div className="skeleton mb-4 h-5 w-24" />
            <div className="skeleton mb-2 h-6 w-4/5" />
            <div className="skeleton mb-6 h-4 w-3/5" />
            <div className="skeleton mb-4 h-12 w-28" />
            <div className="skeleton h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

const ScenarioCard = memo(function ScenarioCard({ sc, index, top, played }: { sc: Scenario; index: number; top: boolean; played: boolean }) {
  const dossier = useSession((s) => s.dossier);
  const [hoverHook, setHoverHook] = useState<string | null>(null);
  const Icon = CHANNEL[sc.channel]?.icon ?? MessageCircle;
  const preview = dossier?.inferences?.find((i) => i?.id === hoverHook);

  return (
    <motion.button
      layoutId={`scenario-${sc.id}`}
      initial={{ opacity: 0, y: 30, rotate: (index - 1) * 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ ...spring.smooth, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => void startScenario(sc.id)}
      className={`card relative flex flex-col p-5 text-left ${top ? "border-beam" : ""}`}
      style={top ? ({ ["--beam" as string]: "var(--threat)" } as React.CSSProperties) : undefined}
      aria-label={`Start simulation: ${sc.title}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
          <Icon size={12} /> {CHANNEL[sc.channel]?.label}
        </span>
        {top ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-threat">Most likely to work on you</span>
        ) : played ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-antibody">Played</span>
        ) : null}
      </div>
      <h2 className="text-lg font-semibold leading-snug">{sc.title}</h2>
      <p className="mt-1 text-sm text-muted">{sc.persona}</p>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="flex items-baseline">
            <Ticker value={Math.round(sc.predictedSuccessRate * 100)} className="font-mono text-5xl font-semibold" />
            <span className="ml-0.5 font-mono text-xl text-muted">%</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">predicted success</div>
        </div>
        <div className="text-right">
          <div className="flex gap-1" aria-label={`Difficulty ${sc.difficulty} of 5`}>
            {[1, 2, 3, 4, 5].map((d) => (
              <span key={d} className="h-2.5 w-1.5 rounded-sm" style={{ background: d <= sc.difficulty ? "var(--pressure)" : "var(--surface-2)" }} />
            ))}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">to spot</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{sc.rationale}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {sc.hooks.map((h) => (
          <span
            key={h.inferenceId + h.how}
            onMouseEnter={() => setHoverHook(h.inferenceId)}
            onMouseLeave={() => setHoverHook(null)}
            className="rounded-full border border-signal/30 bg-signal/10 px-2 py-0.5 text-[11px] text-signal"
          >
            uses: {h.how.replace(/^uses\s+/i, "")}
          </span>
        ))}
      </div>
      <AnimatePresence>
        {preview?.claim && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mt-3 rounded-lg border border-signal/30 bg-surface-2 p-2 text-xs"
          >
            <span className="font-mono text-[10px] uppercase text-signal">From your dossier · </span>
            {preview.claim}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

// ---------------- D2: the simulation ----------------
const LINK_RE = /(https?:\/\/[^\s]+|[\w.-]+@antibody-sim|[\w.-]+@antibody\.sim|\+91 00000 00000)/g;

/** Sim links/handles are rendered inert: underlined, not clickable, with a warning tooltip. */
function SimText({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span
            key={i}
            tabIndex={0}
            title="Fake link. In real life, this is where you'd be phished."
            className="cursor-not-allowed break-all underline decoration-dotted underline-offset-2 opacity-90"
            onClick={(e) => e.preventDefault()}
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Simulation() {
  const sc = useSession(selectedScenario);
  const outcome = useSession((s) => s.outcome);
  const risk = useSession((s) => {
    const users = s.turns.filter((t) => t.role === "user");
    for (let i = users.length - 1; i >= 0; i--) {
      const j = s.judgeByTurnId[users[i].id];
      if (j) return j.userRisk;
    }
    return 0;
  });
  if (!sc) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="lg:hidden">
        <VitalsStrip risk={risk} />
      </div>
      <div className="min-w-0">
        <ChatSurface sc={sc} risk={risk} />
      </div>
      <aside aria-label="Vitals" className="hidden lg:block">
        <Vitals risk={risk} />
      </aside>
      <Portal>
        <AnimatePresence>{outcome && <Ending key="end" sc={sc} />}</AnimatePresence>
      </Portal>
    </div>
  );
}

function ChatSurface({ sc, risk }: { sc: Scenario; risk: number }) {
  const turns = useSession((s) => s.turns);
  const streaming = useSession((s) => s.streaming);
  const typing = useSession((s) => s.typing);
  const outcome = useSession((s) => s.outcome);
  const resisted = useSession((s) => Object.values(s.judgeByTurnId).filter((j) => j.userSignal === "resisting").length);
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = CHANNEL[sc.channel].icon;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length, streaming, typing]);

  const lastAnnounce = [...turns].reverse().find((t) => t.role === "scammer")?.text;

  return (
    <div className="relative">
      {/* antigens around the chat; each resisted push neutralizes one */}
      <div className="pointer-events-none absolute -inset-3 z-0 hidden sm:block" aria-hidden>
        {[
          "left-0 top-16",
          "right-0 top-28",
          "left-1 bottom-40",
          "right-1 bottom-24",
          "left-1/3 -top-1",
          "right-1/4 -bottom-1",
        ].map((pos, k) => (
          <div key={k} className={`absolute ${pos}`}>
            <Glyph neutral={outcome === "RESISTED" || k < resisted} size={16} />
          </div>
        ))}
      </div>

      <motion.div
        layoutId={`scenario-${sc.id}`}
        transition={spring.smooth}
        className={`card relative z-10 flex h-[min(72vh,720px)] flex-col overflow-hidden ${risk >= 70 && !outcome ? "vignette-threat" : ""}`}
        style={{ filter: outcome === "COMPROMISED" ? "grayscale(0.85)" : "none", transition: "filter 0.8s ease" }}
      >
        <div className="relative z-10 flex items-center justify-center gap-2 bg-threat/10 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-threat">
          <ShieldAlert size={11} /> Simulation · Antibody — nothing here is real or can be sent
        </div>
        <div className="relative z-10 flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted">
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{sc.persona}</div>
            <div className="truncate font-mono text-[11px] text-muted">
              {sc.channel === "voice_call" ? "+91 00000 00000 · on call" : sc.channel === "email" ? `${sc.title}` : "+91 00000 00000"}
            </div>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted sm:inline">{CHANNEL[sc.channel].label}</span>
        </div>

        {sc.channel === "voice_call" && <CallScreen active={!outcome} />}

        <div ref={scrollRef} className="scroll-thin relative flex-1 overflow-y-auto px-4 py-4">
          <div className="watermark" aria-hidden />
          <div className="relative z-10 space-y-3">
            {turns.map((t, i) => (
              <Message key={t.id} turn={t} channel={sc.channel} isLastUser={i === lastUserIndex(turns)} />
            ))}
            {typing && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="dots w-fit rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2.5" aria-label="Typing">
                <span />
                <span />
                <span />
              </motion.div>
            )}
            {streaming !== null && <Bubble role="scammer" channel={sc.channel} text={streaming} />}
          </div>
        </div>
        <Composer />
      </motion.div>
      <div aria-live="polite" className="sr-only">
        {lastAnnounce && `Scammer says: ${lastAnnounce}`}
        {outcome && ` Simulation ended: ${outcome.toLowerCase()}.`}
      </div>
    </div>
  );
}

const lastUserIndex = (turns: Turn[]) => {
  for (let i = turns.length - 1; i >= 0; i--) if (turns[i].role === "user") return i;
  return -1;
};

function CallScreen({ active }: { active: boolean }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return (
    <div className="relative z-10 flex items-center gap-4 border-b border-line bg-surface-2/40 px-4 py-3">
      <div className="flex h-8 items-center gap-[3px]" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-antibody/70"
            animate={active ? { scaleY: [0.3, 1, 0.5, 0.8, 0.3] } : { scaleY: 0.2 }}
            transition={{ duration: 1.2 + (i % 5) * 0.15, repeat: Infinity, delay: i * 0.04 }}
            style={{ height: 28, originY: 0.5 }}
          />
        ))}
      </div>
      <div className="ml-auto inline-flex items-center gap-1.5 font-mono text-sm tnum text-muted">
        <Timer size={14} /> {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
      </div>
    </div>
  );
}

const Message = memo(function Message({ turn, channel, isLastUser }: { turn: Turn; channel: Channel; isLastUser: boolean }) {
  // Only this message re-renders when its judge tags arrive.
  const tactics = useSession((s) => Object.values(s.judgeByTurnId).find((j) => j.scammerTurnId === turn.id)?.scammerTactics);
  const outcome = useSession((s) => s.outcome);
  return (
    <div className="relative">
      <Bubble role={turn.role} channel={channel} text={turn.text} />
      {tactics && tactics.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tactics.map((t, i) => (
            <TacticChip key={t.tag + i} tag={t.tag} quote={t.quote} />
          ))}
        </div>
      )}
      {isLastUser && outcome && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute right-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
          style={{ background: outcome === "COMPROMISED" ? "var(--threat)" : outcome === "RESISTED" ? "var(--antibody)" : "var(--signal)" }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 30, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      )}
    </div>
  );
});

function Bubble({ role, channel, text }: { role: Turn["role"]; channel: Channel; text: string }) {
  const mine = role === "user";
  if (channel === "email" && !mine)
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line bg-surface-2/70 p-3 text-sm leading-relaxed">
        <div className="mb-1 font-mono text-[10px] text-muted">From: events@antibody.sim</div>
        <SimText text={text} />
      </motion.div>
    );
  const shape =
    channel === "sms" ? (mine ? "rounded-3xl rounded-br-lg" : "rounded-3xl rounded-bl-lg") : mine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.snappy}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] px-3.5 py-2 text-[14px] leading-relaxed sm:max-w-[75%] ${shape} ${
          mine ? (channel === "sms" ? "bg-signal/90 text-white" : "bg-antibody/15 text-fg") : "bg-surface-2 text-fg"
        }`}
      >
        {channel === "voice_call" && !mine && <span className="mr-1 font-mono text-[10px] uppercase text-muted">Caller:</span>}
        <SimText text={text} />
      </div>
    </motion.div>
  );
}

function Composer() {
  const replies = useSession((s) => s.replies);
  const busy = useSession((s) => s.typing || s.streaming !== null);
  const outcome = useSession((s) => s.outcome);
  const guard = useSession((s) => s.guardTripped);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const disabled = busy || Boolean(outcome);

  const send = (t: string) => {
    if (disabled || !t.trim()) return;
    void sendUser(t);
    if (!get().guardTripped) setText("");
  };

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const chips = replies ? shuffle([replies.resist, replies.waver, replies.comply]) : [];

  return (
    <div className="relative z-10 border-t border-line bg-surface p-3">
      <AnimatePresence>
        {chips.length > 0 && !outcome && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <motion.button
                key={c}
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                onClick={() => send(c)}
                className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-fg transition-colors hover:border-line-strong disabled:opacity-40"
              >
                {c}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor="composer" className="sr-only">
          Your reply
        </label>
        <input
          id="composer"
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder={outcome ? "Simulation ended" : busy ? "…" : "Type a reply — never real details"}
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg/60 px-3.5 py-2.5 text-sm outline-none transition-[filter,border-color] focus:border-signal/60 disabled:opacity-60"
          style={{ filter: guard ? "blur(5px)" : "none" }}
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Send"
          className="grid h-10 w-10 place-items-center rounded-xl bg-antibody text-black disabled:opacity-30"
        >
          <Send size={16} />
        </motion.button>
      </form>
    </div>
  );
}

// stable per-render-set shuffle so chip order doesn't reveal which is the "right" answer
function shuffle(a: string[]) {
  const seed = a.join("").length;
  return [...a].sort((x, y) => ((x.length * 7 + seed) % 5) - ((y.length * 7 + seed) % 5));
}

function useTacticCounts() {
  const judges = useSession((s) => s.judgeByTurnId);
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const j of Object.values(judges)) for (const t of j.scammerTactics) m.set(t.tag, (m.get(t.tag) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [judges]);
}

function Vitals({ risk }: { risk: number }) {
  const userTurns = useSession((s) => s.turns.filter((t) => t.role === "user").length);
  const counts = useTacticCounts();
  const color = riskColor(risk);
  return (
    <div className="card sticky top-20 p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Vitals</div>
      <div className="flex gap-4">
        <div className="relative h-56 w-4 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={risk} aria-valuemin={0} aria-valuemax={100} aria-label="Compromise risk">
          <motion.div
            className="absolute inset-x-0 bottom-0 origin-bottom rounded-full"
            style={{ height: "100%", background: color, transition: "background 0.5s ease" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: risk / 100 }}
            transition={spring.smooth}
          />
          <div className="absolute inset-x-0 border-t border-dashed border-threat/60" style={{ bottom: "70%" }} />
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <Ticker value={risk} className="font-mono text-3xl font-semibold" />
              <span className="font-mono text-xs text-muted">/100</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">compromise risk</div>
          </div>
          <div>
            <div className="font-mono text-2xl tnum">
              {userTurns}
              <span className="text-muted">/12</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">turns</div>
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tactics detected</div>
        {counts.length === 0 ? (
          <p className="text-xs text-muted">Reply to see the tactics being used on you.</p>
        ) : (
          <motion.div layout className="flex flex-wrap gap-1.5">
            {counts.map(([tag, n]) => (
              <TacticChip key={tag} tag={tag} count={n} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function VitalsStrip({ risk }: { risk: number }) {
  const userTurns = useSession((s) => s.turns.filter((t) => t.role === "user").length);
  return (
    <div className="card flex items-center gap-3 px-3 py-2">
      <span className="font-mono text-[10px] uppercase text-muted">Risk</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={risk} aria-valuemin={0} aria-valuemax={100} aria-label="Compromise risk">
        <motion.div className="h-full origin-left rounded-full" style={{ background: riskColor(risk) }} animate={{ scaleX: risk / 100 }} initial={{ scaleX: 0 }} transition={spring.smooth} />
      </div>
      <span className="font-mono text-sm tnum">{Math.round(risk)}</span>
      <span className="font-mono text-xs text-muted tnum">{userTurns}/12</span>
    </div>
  );
}

function loss(goal: string) {
  const amt = goal.match(/₹\s?[\d,]+/)?.[0];
  if (amt) return `lost ${amt}`;
  if (/otp|code|pin/i.test(goal)) return "handed over your OTP — and your account";
  if (/install|remote|app/i.test(goal)) return "given a stranger control of your phone";
  if (/security|answer|password/i.test(goal)) return "given away your account recovery answer";
  if (/link|click/i.test(goal)) return "landed on a phishing page";
  return "lost your account";
}

function Ending({ sc }: { sc: Scenario }) {
  const outcome = useSession((s) => s.outcome)!;
  const guard = useSession((s) => s.guardTripped);
  const copy: Record<string, { title: string; body: string; cta: string; color: string; icon: ReactNode }> = {
    COMPROMISED: {
      title: guard ? "Don't type real details — even here." : `This is where you'd have ${loss(sc.goal)}.`,
      body: guard ? "In a real scam, this is the moment you'd lose." : "The simulation froze at the exact moment the scam succeeded.",
      cta: "See what happened",
      color: "var(--threat)",
      icon: <ShieldAlert size={18} />,
    },
    RESISTED: { title: "You shut it down.", body: "Every lever they pulled, you neutralized.", cta: "See your debrief", color: "var(--antibody)", icon: <ShieldCheck size={18} /> },
    TIMEOUT: { title: "Conversation timed out.", body: "No money moved — but you stayed in their channel for 12 turns.", cta: "See your debrief", color: "var(--signal)", icon: <Timer size={18} /> },
  };
  const c = copy[outcome];
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ ...spring.smooth, delay: 0.6 }}
      className="fixed inset-x-0 bottom-5 z-30 mx-auto w-[min(560px,calc(100%-2rem))]"
      role="alertdialog"
      aria-label={c.title}
    >
      <div className="card flex flex-col gap-3 p-5 shadow-2xl sm:flex-row sm:items-center" style={{ borderColor: c.color }}>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: c.color }}>
            {c.icon} {outcome}
          </div>
          <h2 className="text-lg font-semibold leading-snug">{c.title}</h2>
          <p className="mt-1 text-sm text-muted">{c.body}</p>
        </div>
        <Button variant="primary" onClick={() => void runDebrief()} autoFocus>
          {c.cta} <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
}
