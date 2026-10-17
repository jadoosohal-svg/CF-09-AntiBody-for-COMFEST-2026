import { parsePartialJson } from "ai";

export type Line = {
  o?: unknown;
  t?: string;
  done?: boolean;
  error?: boolean;
  outcome?: string | null;
  replies?: unknown;
};

export class StreamError extends Error {}

/** Reads an NDJSON response line by line. Throws StreamError on a server-side error line. */
export async function readNdjson(res: Response, onLine: (l: Line) => void): Promise<Line> {
  if (!res.body) throw new StreamError("no body");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let last: Line | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const raw = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!raw) continue;
      const l = JSON.parse(raw) as Line;
      if (l.error) throw new StreamError("stream error");
      last = l;
      onLine(l);
    }
  }
  if (!last?.done) throw new StreamError("stream ended early");
  return last;
}

/** Coalesce rapid updates into one store write per animation frame. */
export function rafBatch<T>(apply: (v: T) => void) {
  let pending: { v: T } | null = null;
  let id = 0;
  const flush = () => {
    id = 0;
    if (pending) {
      const { v } = pending;
      pending = null;
      apply(v);
    }
  };
  return {
    push(v: T) {
      pending = { v };
      if (!id) id = requestAnimationFrame(flush);
    },
    flush() {
      if (id) cancelAnimationFrame(id);
      flush();
    },
  };
}

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export const jitter = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Replays a fixture object as a stream of partial objects, so Demo Mode looks identical to live. */
export async function streamFixtureObject(obj: unknown, onPartial: (p: unknown) => void, signal: AbortSignal, cps = 1100) {
  const s = JSON.stringify(obj);
  let i = 0;
  while (i < s.length) {
    const step = Math.round(jitter(14, 34));
    i = Math.min(s.length, i + step);
    await sleep((step / cps) * 1000, signal);
    const { value } = await parsePartialJson(s.slice(0, i));
    if (value && typeof value === "object") onPartial(value);
  }
  onPartial(obj);
}

/** Replays text token-by-token. */
export async function streamFixtureText(text: string, onText: (t: string) => void, signal: AbortSignal) {
  const tokens = text.match(/\S+\s*/g) ?? [text];
  let acc = "";
  for (const tok of tokens) {
    acc += tok;
    await sleep(jitter(25, 70), signal);
    onText(acc);
  }
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
