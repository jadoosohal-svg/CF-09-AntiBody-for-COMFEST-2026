// Exercises the live streaming path with a mock model (no API keys needed).
// Run: npm run check  (uses --conditions=react-server so "server-only" imports resolve)
import assert from "node:assert/strict";
import { streamText, simulateReadableStream, Output } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { objectResponse, roleplayResponse } from "../lib/ai/stream";
import { Attacks } from "../lib/schemas";
import { DEMO_SCENARIOS } from "../lib/demo/fixtures";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const mock = (text: string, size = 7) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t" },
          ...(text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? []).map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          { type: "text-end" as const, id: "t" },
          { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, logprobs: undefined, usage },
        ],
      }),
    }),
  });

const lines = async (res: Response) => (await res.text()).trim().split("\n").map((l) => JSON.parse(l));

// 1) Roleplay: real-looking contact details never leave the server, control tokens are stripped and parsed.
{
  const raw =
    'Beta call me on 9876543210 or pay ramesh@okaxis, link https://hdfcbank.com/kyc\n[[COMPROMISED]]\n<<replies>>{"resist":"No","waver":"Hmm","comply":"Ok"}';
  const r = streamText({ model: mock(raw, 3), prompt: "x" });
  const out = await lines(roleplayResponse(r.textStream));
  const all = JSON.stringify(out);
  for (const leak of ["9876543210", "98765", "okaxis", "hdfcbank", "[[", "<<"]) assert.ok(!all.includes(leak), `leaked ${leak}: ${all}`);
  const last = out.at(-1);
  assert.equal(last.done, true);
  assert.equal(last.outcome, "COMPROMISED");
  assert.deepEqual(last.replies, { resist: "No", waver: "Hmm", comply: "Ok" });
  assert.ok(last.t.includes("+91 00000 00000") && last.t.includes("refund@antibody-sim"), last.t);
}

// 2) Structured stream: partials arrive progressively and are sanitized; final object validates.
{
  const evil = { scenarios: DEMO_SCENARIOS.map((s, i) => (i ? s : { ...s, openingMessage: "Pay at www.realbank.in now" })) };
  const r = streamText({ model: mock(JSON.stringify(evil), 40), prompt: "x", output: Output.object({ schema: Attacks }) });
  const out = await lines(objectResponse(r.partialOutputStream, r.output));
  assert.ok(out.length >= 2, "expected progressive partials");
  assert.ok(!JSON.stringify(out).includes("realbank"), "url leaked");
  assert.equal(out.at(-1).done, true);
  assert.equal(Attacks.parse(out.at(-1).o).scenarios.length, 3);
}
console.log("ok: live stream path (sanitize + control tokens + partials)");
