// Self-check for the safety filters and demo fixtures. Run: npm run check
import assert from "node:assert/strict";
import { sanitizeText, sanitizeDeep, SIM } from "../lib/ai/sanitize.ts";
import { looksLikeRealSecret } from "../lib/guard.ts";
import { DEMO_DOSSIER, DEMO_SCENARIOS, DEMO_SCRIPTS, SAMPLE_SEGMENTS } from "../lib/demo/fixtures";
import { classify } from "../lib/demo/engine";

const cases: [string, string][] = [
  ["Visit https://hdfcbank.com/kyc now", `Visit ${SIM.url} now`],
  ["Go to www.sbi.co.in/login", `Go to ${SIM.url}`],
  ["open icici.in today", `open ${SIM.url} today`],
  ["Call +91 98765 43210", `Call ${SIM.phone}`],
  ["Call 9876543210.", `Call ${SIM.phone}.`],
  ["Toll free 1800 123 4567", `Toll free ${SIM.phone}`],
  ["mail help@sbi.co.in", `mail ${SIM.email}`],
  ["pay to ramesh@okaxis", `pay to ${SIM.upi}`],
  // allowed sim values pass through untouched
  ["https://kyc.antibody.sim/verify", "https://kyc.antibody.sim/verify"],
  ["+91 00000 00000", "+91 00000 00000"],
  ["support@antibody.sim", "support@antibody.sim"],
  ["refund@antibody-sim", "refund@antibody-sim"],
  ["Call 1930 or report", "Call 1930 or report"],
  ["Pay ₹4,999 in 30 minutes", "Pay ₹4,999 in 30 minutes"],
];
for (const [input, want] of cases) assert.equal(sanitizeText(input), want, input);

assert.ok(looksLikeRealSecret("4111 1111 1111 1111"));
assert.ok(looksLikeRealSecret("my aadhaar 1234 5678 9012"));
assert.ok(looksLikeRealSecret("PAN ABCDE1234F"));
assert.ok(looksLikeRealSecret("password is hunter22"));
assert.ok(!looksLikeRealSecret("OTP is 482913"));
assert.ok(!looksLikeRealSecret("Who is this? I'll call the bank myself."));

// Demo fixtures: spans must match quotes, tactic quotes must be exact, content must survive the filter.
for (const inf of DEMO_DOSSIER.inferences)
  for (const e of inf.evidence) {
    const seg = SAMPLE_SEGMENTS.find((s: { id: string }) => s.id === e.segmentId)!;
    assert.equal(seg.text.slice(e.start, e.end), e.quote, `${inf.id} ${e.quote}`);
  }
for (const [id, sc] of Object.entries(DEMO_SCRIPTS)) {
  const opening = DEMO_SCENARIOS.find((s: { id: string }) => s.id === id)!.openingMessage;
  for (const t of sc.openingTactics) assert.ok(opening.includes(t.quote), t.quote);
  for (const l of [...sc.escalations, sc.pushback]) for (const t of l.tactics) assert.ok(l.text.includes(t.quote), t.quote);
  for (const l of [sc.openingReplies, ...sc.escalations.map((e) => e.replies!), sc.pushback.replies!]) {
    assert.equal(classify(l.resist), "resisting", l.resist);
    assert.equal(classify(l.waver), "wavering", l.waver);
    assert.equal(classify(l.comply), "complying", l.comply);
  }
}
const all = { DEMO_DOSSIER, DEMO_SCENARIOS, DEMO_SCRIPTS };
assert.deepEqual(sanitizeDeep(all), all, "fixtures must already be sim-safe");
console.log("ok: sanitize + guard + fixtures");
