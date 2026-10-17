"use client";
import { toast } from "sonner";
import { Dossier, type DeepPartial, type JudgeResult, type Outcome, type QuickReplies, type Scenario, type Tactic, type Turn } from "@/lib/schemas";
import { get, initial, selectedScenario, set, type Judge, type Stage } from "@/lib/store";
import { isAbort, jitter, rafBatch, readNdjson, sleep, streamFixtureObject, streamFixtureText, type Line } from "@/lib/client/stream";
import { looksLikeRealSecret } from "@/lib/guard";
import { DEMO_DOSSIER, DEMO_SCENARIOS } from "@/lib/demo/fixtures";
import { SAMPLE_PROFILE, segment } from "@/lib/demo/sample";
import { demoDebrief, demoJudge, nextScammerTurn, openingMeta } from "@/lib/demo/engine";
import { blip, hush, speak } from "@/lib/client/fx";

// ---------- abort bookkeeping: every request gets a controller; wipe/back/regenerate cancel them ----------
const controllers = new Set<AbortController>();
function controller() {
  const c = new AbortController();
  controllers.add(c);
  c.signal.addEventListener("abort", () => controllers.delete(c), { once: true });
  return c;
}
const release = (c: AbortController) => controllers.delete(c);
export function abortAll() {
  for (const c of controllers) c.abort();
  controllers.clear();
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Live request with one silent retry, then a visible "Reconnecting…" attempt is not made again:
 * after two failures we switch to Demo Mode and the caller falls back to the fixture.
 * Returns false when the caller should use its fixture.
 */
async function live(url: string, body: unknown, signal: AbortSignal, onLine: (l: Line) => void): Promise<Line | false> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt === 1) set({ reconnecting: true });
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (res.status === 503) {
        enterDemo("No API keys configured — running in Demo Mode.");
        return false;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const last = await readNdjson(res, onLine);
      set({ reconnecting: false });
      return last;
    } catch (e) {
      if (isAbort(e)) throw e;
    }
  }
  set({ reconnecting: false });
  enterDemo("Connection trouble — switched to Demo Mode for this step.");
  return false;
}

function enterDemo(msg: string) {
  if (!get().demoMode) toast(msg);
  set({ demoMode: true });
}

export async function initDemoMode() {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo")) {
    set({ demoMode: true });
    return;
  }
  try {
    const r = await fetch("/api/status");
    const { live } = (await r.json()) as { live: boolean };
    if (!live) set({ demoMode: true });
  } catch {
    set({ demoMode: true });
  }
}

// ---------- Stage 1: INFER ----------
export async function analyze() {
  const s = get();
  if (!s.consent) return;
  abortAll();
  let text = s.rawText;
  if (s.demoMode && text.trim() !== SAMPLE_PROFILE.trim()) {
    text = SAMPLE_PROFILE;
    toast("Demo Mode analyses the sample profile.");
  }
  if (!text.trim()) return;
  const { segments, lines } = segment(text);
  set({
    rawText: text,
    segments,
    lines,
    analyzing: true,
    dossier: null,
    dossierDone: false,
    scenarios: [],
    attacksDone: false,
    playedIds: [],
  });
  const c = controller();
  const apply = rafBatch((o: unknown) => set({ dossier: o as DeepPartial<Dossier> }));
  try {
    const onPartial = (o: unknown) => apply.push(o);
    const ok = get().demoMode
      ? false
      : await live("/api/infer", { segments }, c.signal, (l) => l.o && onPartial(l.o));
    if (ok === false) {
      if (text !== SAMPLE_PROFILE) set({ rawText: SAMPLE_PROFILE, ...segment(SAMPLE_PROFILE) }); // fixture spans need the sample text
      await streamFixtureObject(DEMO_DOSSIER, onPartial, c.signal, 1400);
    }
    apply.flush();
    set({ analyzing: false, dossierDone: true });
    blip("tick");
    void fetchAttacks(); // speculative prefetch while the user reads the dossier
  } catch (e) {
    if (!isAbort(e)) set({ analyzing: false });
  } finally {
    release(c);
  }
}

// ---------- Stage 2a: ATTACKS ----------
let attacksInFlight: Promise<void> | null = null;
export function fetchAttacks() {
  attacksInFlight ??= (async () => {
    const c = controller();
    const apply = rafBatch((o: { scenarios?: unknown[] }) => set({ scenarios: (o.scenarios ?? []) as Scenario[] }));
    try {
      const d = Dossier.safeParse(get().dossier);
      const onPartial = (o: unknown) => apply.push(o as { scenarios?: unknown[] });
      const ok =
        get().demoMode || !d.success
          ? false
          : await live("/api/attacks", { dossier: d.data }, c.signal, (l) => l.o && onPartial(l.o));
      if (ok === false) await streamFixtureObject({ scenarios: DEMO_SCENARIOS }, onPartial, c.signal, 2400);
      apply.flush();
      set({ attacksDone: true });
    } catch {
      // aborted (wipe/back) — leave state as the canceller set it
    } finally {
      release(c);
      attacksInFlight = null;
    }
  })();
  return attacksInFlight;
}

// ---------- Stage 2b: ROLEPLAY ----------
const GENERIC_REPLIES: QuickReplies = {
  resist: "Who is this? I'll verify myself.",
  waver: "What is this about?",
  comply: "Ok, tell me what to do",
};
const demoTactics = new Map<string, { tag: Tactic; quote: string }[]>();

async function typeScammer(text: string, signal: AbortSignal) {
  set({ typing: true, streaming: null });
  await sleep(jitter(400, 900), signal);
  set({ typing: false });
  await streamFixtureText(text, (t) => set({ streaming: t }), signal);
}

function commitScammer(text: string, outcome: Outcome | null, replies: QuickReplies | null) {
  const turn: Turn = { id: uid(), role: "scammer", text, ts: Date.now() };
  set((s) => ({ turns: [...s.turns, turn], streaming: null, typing: false, replies: outcome ? null : replies }));
  speak(text);
  if (outcome) finish(outcome);
  else blip("tick");
  return turn;
}

function finish(outcome: Outcome) {
  set({ outcome, replies: null, typing: false, streaming: null });
  blip(outcome === "COMPROMISED" ? "threat" : "safe");
}

export async function startScenario(id: string) {
  abortAll();
  hush();
  demoTactics.clear();
  set({
    selectedScenarioId: id,
    turns: [],
    judgeByTurnId: {},
    outcome: null,
    guardTripped: false,
    replies: null,
    debrief: null,
    debriefDone: false,
    fixesDone: {},
  });
  const sc = selectedScenario(get());
  if (!sc) return;
  const c = controller();
  try {
    await typeScammer(sc.openingMessage, c.signal);
    const meta = openingMeta(sc);
    const t = commitScammer(sc.openingMessage, null, get().demoMode ? meta.replies : GENERIC_REPLIES);
    demoTactics.set(t.id, meta.tactics);
  } catch {
  } finally {
    release(c);
  }
}

export async function sendUser(raw: string) {
  const text = raw.trim();
  const s = get();
  const sc = selectedScenario(s);
  if (!text || !sc || s.outcome || s.typing || s.streaming !== null) return;

  if (looksLikeRealSecret(text)) {
    // The secret itself is never stored: the transcript gets a redacted placeholder.
    const lastS = [...s.turns].reverse().find((t) => t.role === "scammer");
    const redacted: Turn = { id: uid(), role: "user", text: "[blocked — you started typing real card / ID / password details]", ts: Date.now() };
    set((x) => ({
      guardTripped: true,
      turns: [...x.turns, redacted],
      judgeByTurnId: {
        ...x.judgeByTurnId,
        [redacted.id]: {
          turnId: redacted.id,
          scammerTurnId: lastS?.id ?? "",
          scammerTactics: [],
          userRisk: 100,
          userSignal: "complying",
          coachNote: "Typing real details — even into a chat you half-trust — is the exact moment a real scam succeeds.",
        },
      },
    }));
    finish("COMPROMISED");
    return;
  }
  blip("send");
  const lastScammer = [...s.turns].reverse().find((t) => t.role === "scammer");
  const userTurn: Turn = { id: uid(), role: "user", text, ts: Date.now() };
  const turns = [...s.turns, userTurn];
  set({ turns, replies: null });

  // Judge runs in parallel and never blocks the chat.
  if (lastScammer) void judge(sc, lastScammer, userTurn);

  const c = controller();
  try {
    let reply: { text: string; outcome: Outcome | null; replies: QuickReplies | null } | null = null;
    if (!get().demoMode) {
      set({ typing: true, streaming: null });
      const minTyping = sleep(jitter(400, 900), c.signal); // typing dots overlap the real request
      let first = true;
      const apply = rafBatch((t: string) => set({ streaming: t }));
      const last = await live("/api/roleplay", { dossier: get().dossier, scenario: sc, turns }, c.signal, (l) => {
        if (l.done || typeof l.t !== "string" || !l.t) return;
        if (first) {
          first = false;
          void minTyping.then(() => set({ typing: false }));
        }
        void minTyping.then(() => apply.push(l.t!));
      });
      await minTyping;
      apply.flush();
      if (last) {
        const outcome = (last.outcome as Outcome | null) ?? (turns.filter((t) => t.role === "user").length >= 12 ? "TIMEOUT" : null);
        reply = { text: last.t || "…", outcome, replies: (last.replies as QuickReplies | null) ?? GENERIC_REPLIES };
      }
    }
    if (!reply) {
      const n = nextScammerTurn(sc, turns);
      await typeScammer(n.text, c.signal);
      reply = n;
      const t = commitScammer(n.text, n.outcome, n.replies);
      demoTactics.set(t.id, n.tactics);
      return;
    }
    commitScammer(reply.text, reply.outcome, reply.replies);
  } catch {
  } finally {
    release(c);
  }
}

async function judge(sc: Scenario, scammer: Turn, user: Turn) {
  const n = get().turns.length;
  const store = (j: JudgeResult) =>
    set((s) => ({ judgeByTurnId: { ...s.judgeByTurnId, [user.id]: { ...j, turnId: user.id, scammerTurnId: scammer.id } } }));
  const fallback = () => demoJudge(demoTactics.get(scammer.id) ?? [], user.text, n);
  if (get().demoMode) {
    await sleep(jitter(500, 1100));
    return store(fallback());
  }
  const c = controller();
  try {
    const r = await fetch("/api/judge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: sc, scammerText: scammer.text, userText: user.text }),
      signal: c.signal,
    });
    store(r.ok ? ((await r.json()) as JudgeResult) : fallback());
  } catch (e) {
    if (!isAbort(e)) store(fallback());
  } finally {
    release(c);
  }
}

// ---------- Stage 3: DEBRIEF ----------
export async function runDebrief() {
  const s = get();
  const sc = selectedScenario(s);
  if (!sc || !s.outcome) return;
  set({ stage: "debrief", debrief: null, debriefDone: false, fixesDone: {} });
  hush();
  const c = controller();
  const judges = s.turns.flatMap((t) => (s.judgeByTurnId[t.id] ? [s.judgeByTurnId[t.id]] : []));
  const apply = rafBatch((o: unknown) => set({ debrief: o as never }));
  try {
    const onPartial = (o: unknown) => apply.push(o);
    const d = Dossier.safeParse(s.dossier);
    const ok =
      s.demoMode || !d.success
        ? false
        : await live(
            "/api/debrief",
            { dossier: d.data, scenario: sc, turns: s.turns, judges: judges.map(stripJudge), outcome: s.outcome },
            c.signal,
            (l) => l.o && onPartial(l.o),
          );
    if (ok === false) await streamFixtureObject(demoDebrief(sc, s.turns, judges, s.outcome), onPartial, c.signal, 1600);
    apply.flush();
    set((x) => ({ debriefDone: true, playedIds: [...new Set([...x.playedIds, sc.id])] }));
  } catch {
  } finally {
    release(c);
  }
}
const stripJudge = ({ scammerTurnId, ...j }: Judge) => (void scammerTurnId, j);

// ---------- navigation ----------
const ORDER: Stage[] = ["mirror", "strike", "debrief"];
export function goStage(stage: Stage) {
  const s = get();
  if (ORDER.indexOf(stage) < ORDER.indexOf(s.stage)) {
    // going back cancels in-flight streams, but never the attack prefetch we still want
    for (const c of controllers) c.abort();
    hush();
    attacksInFlight = null;
    set({ typing: false, streaming: null, analyzing: false });
    if (stage === "strike") set({ selectedScenarioId: null, turns: [], outcome: null, guardTripped: false });
    if (s.dossierDone && !get().attacksDone) void fetchAttacks();
  }
  if (stage === "strike" && !get().dossierDone) return;
  if (stage === "debrief" && !get().outcome && !get().debrief) return;
  set({ stage });
  if (stage === "strike" && !get().attacksDone) void fetchAttacks();
}

export function nextScenario() {
  abortAll();
  hush();
  set({ stage: "strike", selectedScenarioId: null, turns: [], outcome: null, guardTripped: false, debrief: null, debriefDone: false, judgeByTurnId: {}, replies: null });
}

export function startOver() {
  abortAll();
  hush();
  const { demoMode, soundOn, voiceOn, rawText } = get();
  set({ ...initial, demoMode, soundOn, voiceOn, rawText });
}

export function wipe() {
  abortAll();
  hush();
  attacksInFlight = null;
  demoTactics.clear();
  const { demoMode } = get();
  set({ ...initial, demoMode });
  try {
    sessionStorage.clear();
    localStorage.removeItem("antibody-session");
  } catch {}
}

export function loadSample() {
  set({ rawText: SAMPLE_PROFILE });
}
