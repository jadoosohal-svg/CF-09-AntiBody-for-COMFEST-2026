import "server-only";
import type { SystemModelMessage } from "ai";
import type { z } from "zod";
import { sanitizeDeep, sanitizeText } from "./sanitize";

// Wire format for every route: NDJSON. Object routes send {"o": partial}, text routes {"t": text}.
// The last line carries "done": true. Every payload is sanitized before it leaves the server.

const enc = new TextEncoder();
const line = (v: unknown) => enc.encode(JSON.stringify(v) + "\n");
const HEADERS = { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" };

export const cached = (content: string): SystemModelMessage => ({
  role: "system",
  content,
  providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
});

export const badRequest = (err: z.ZodError) =>
  Response.json({ error: "invalid request", issues: err.issues.slice(0, 5) }, { status: 400 });
export const noModel = () => Response.json({ error: "no model configured", demo: true }, { status: 503 });

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}

/** Streams sanitized partial objects, throttled to one line per ~40ms. */
export function objectResponse<T>(stream: AsyncIterable<unknown>, final: PromiseLike<T>): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      let last = 0;
      let pending: unknown;
      try {
        for await (const partial of stream) {
          pending = partial;
          const now = Date.now();
          if (now - last > 40) {
            c.enqueue(line({ o: sanitizeDeep(partial) }));
            last = now;
            pending = undefined;
          }
        }
        let out: unknown;
        try {
          out = await final;
        } catch {
          out = pending; // schema validation failed: ship the best partial we have
        }
        c.enqueue(line({ o: sanitizeDeep(out ?? pending ?? {}), done: true }));
      } catch {
        c.enqueue(line({ error: true }));
      }
      c.close();
    },
  });
  return new Response(body, { headers: HEADERS });
}

const OUTCOME_RE = /\[\[(COMPROMISED|RESISTED|TIMEOUT)\]\]/;
const REPLIES_RE = /<<replies>>\s*(\{[\s\S]*?\})/;

/** Strip everything from the first control marker on (also partial "[[" / "<<" at the tail). */
export function visibleText(raw: string): string {
  const cut = raw.search(/\[\[|<<|\[$|<$/);
  return (cut === -1 ? raw : raw.slice(0, cut)).trim();
}

export function parseRoleplay(raw: string) {
  const outcome = raw.match(OUTCOME_RE)?.[1] ?? null;
  let replies: unknown = null;
  const m = raw.match(REPLIES_RE);
  if (m) {
    try {
      replies = sanitizeDeep(JSON.parse(m[1]));
    } catch {}
  }
  return { text: sanitizeText(visibleText(raw)), outcome, replies };
}

/** Streams the scammer's visible text; final line carries the outcome token + hidden quick replies. */
export function roleplayResponse(textStream: AsyncIterable<string>): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      let raw = "";
      let sent = "";
      try {
        for await (const delta of textStream) {
          raw += delta;
          // hold back the trailing word so a number/link is never sent half-formed and unsanitized
          const vis = visibleText(raw).replace(/\S*$/, "");
          const safe = sanitizeText(vis);
          if (safe !== sent) {
            c.enqueue(line({ t: safe }));
            sent = safe;
          }
        }
        const p = parseRoleplay(raw);
        c.enqueue(line({ t: p.text, outcome: p.outcome, replies: p.replies, done: true }));
      } catch {
        c.enqueue(line({ error: true }));
      }
      c.close();
    },
  });
  return new Response(body, { headers: HEADERS });
}
