import type { Debrief, JudgeResult, Outcome, QuickReplies, Scenario, Tactic, Turn } from "@/lib/schemas";
import { ARCHETYPE_RULES, DEMO_FIXES, DEMO_SCRIPTS, type Script } from "./fixtures";

export type Signal = JudgeResult["userSignal"];

// ponytail: keyword classifier for Demo Mode only; live mode uses the judge model
export function classify(text: string): Signal {
  const t = text.toLowerCase();
  if (/\b(sent|paid|paying|sending|installed|sharing|code is|done)\b|\d{4,}/.test(t)) return "complying";
  if (/\b(scam\w*|fake|block\w*|report\w*|no|not|never|call\w*|verify|check\w*|branch|who are you|pass)\b/.test(t)) return "resisting";
  if (/^(ok|okay|yes|fine|sure)\b/.test(t)) return "complying";
  return "wavering";
}

const scriptFor = (s: Scenario): Script => DEMO_SCRIPTS[s.id] ?? DEMO_SCRIPTS.sc1;

type Next = { text: string; outcome: Outcome | null; replies: QuickReplies | null; tactics: { tag: Tactic; quote: string }[] };

/** Next scripted scammer turn given the conversation so far (last turn is the user's). */
export function nextScammerTurn(s: Scenario, turns: Turn[]): Next {
  const sc = scriptFor(s);
  const userTurns = turns.filter((t) => t.role === "user");
  const signals = userTurns.map((t) => classify(t.text));
  const last = signals.at(-1) ?? "wavering";
  const resists = signals.filter((x) => x === "resisting").length;
  const scammerTurns = turns.filter((t) => t.role === "scammer").length;

  if (last === "complying" && userTurns.length >= 2) return { text: sc.win, outcome: "COMPROMISED", replies: null, tactics: [] };
  if (last === "resisting" && resists >= 2) return { text: sc.giveUp, outcome: "RESISTED", replies: null, tactics: [] };
  if (userTurns.length >= 12) return { text: "Hello? Reply fast.", outcome: "TIMEOUT", replies: null, tactics: [] };
  if (last === "resisting" && resists === 1 && !turns.some((t) => t.text === sc.pushback.text))
    return { text: sc.pushback.text, outcome: null, replies: sc.pushback.replies ?? null, tactics: sc.pushback.tactics };

  const i = Math.min(scammerTurns - 1, sc.escalations.length - 1);
  const line = sc.escalations[Math.max(0, i)];
  return { text: line.text, outcome: null, replies: line.replies ?? null, tactics: line.tactics };
}

export function openingMeta(s: Scenario) {
  const sc = scriptFor(s);
  return { replies: sc.openingReplies, tactics: sc.openingTactics };
}

const COACH: Record<Signal, string[]> = {
  resisting: [
    "You paused and moved to a channel you control. That's the single strongest defence.",
    "Calling it out broke the scammer's script. Notice how they switched levers.",
  ],
  wavering: [
    "Asking questions felt safe, but it kept you in the scammer's channel.",
    "You hesitated. That gap is exactly where scammers pile on urgency.",
  ],
  complying: [
    "This is the point of no return: acting on a request you never verified.",
    "You followed the instruction inside the conversation instead of checking outside it.",
  ],
};
const RISK: Record<Signal, [number, number]> = { resisting: [6, 18], wavering: [42, 62], complying: [82, 96] };

/** Demo judge: scammer tactics come from the script annotations, user risk from the keyword signal. */
export function demoJudge(scammerTactics: { tag: Tactic; quote: string }[], userText: string, n: number): JudgeResult {
  const sig = classify(userText);
  const [lo, hi] = RISK[sig];
  return {
    scammerTactics,
    userRisk: Math.round(lo + ((n * 37) % (hi - lo))),
    userSignal: sig,
    coachNote: COACH[sig][n % 2],
  };
}

/** Demo debrief composed from the actual transcript + judge results, so it always matches what happened. */
export function demoDebrief(s: Scenario, turns: Turn[], judges: (JudgeResult & { turnId: string })[], outcome: Outcome): Debrief {
  const counts = new Map<Tactic, { count: number; example: string }>();
  for (const j of judges)
    for (const t of j.scammerTactics) {
      const c = counts.get(t.tag);
      counts.set(t.tag, { count: (c?.count ?? 0) + 1, example: c?.example ?? t.quote });
    }
  const pivot =
    outcome === "COMPROMISED"
      ? judges.findIndex((j) => j.userSignal === "complying")
      : judges.findIndex((j) => j.userSignal === "resisting");
  const pivotTurnId = judges[Math.max(0, pivot)]?.turnId;
  const turnIndex = Math.max(0, turns.findIndex((t) => t.id === pivotTurnId));
  const resisted = outcome !== "COMPROMISED";
  const worked = [
    judges.some((j) => j.userSignal === "resisting") && "You pushed back instead of acting on the first message.",
    judges.some((j) => j.userSignal === "wavering") && "You asked questions before acting — keep that instinct, then verify outside the chat.",
    resisted && "You never shared money, codes or app access.",
  ].filter((x): x is string => Boolean(x));

  return {
    outcome,
    verdict: resisted
      ? "You held the line. The scammer tried several levers and none of them landed."
      : "They got you with a story built from your own posts. It happens to careful people every day.",
    momentOfCompromise: {
      turnIndex,
      explanation: resisted
        ? "Here you moved the conversation to a channel you control. The scam can't survive that step."
        : "Here you acted on a request inside the conversation without verifying it outside. Everything after was the scammer collecting.",
    },
    tacticsSeen: [...counts].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.count - a.count),
    whatWorked: worked.length ? worked : ["You played it through to the end — now you know exactly how this one feels."],
    fixes: DEMO_FIXES[s.id] ?? DEMO_FIXES.sc1,
    realWorldRule: ARCHETYPE_RULES[s.archetype],
    resilienceScore: resisted ? 82 - judges.filter((j) => j.userSignal === "wavering").length * 6 : 34,
  };
}
