// Output filter: every model payload passes through here before reaching the client.
// Anything contact-like that isn't on the reserved sim namespace is replaced with a sim placeholder.

export const SIM = {
  url: "https://verify.antibody.sim/secure",
  phone: "+91 00000 00000",
  email: "support@antibody.sim",
  upi: "refund@antibody-sim",
} as const;

const TLDS =
  "com|in|net|org|co|io|xyz|info|app|me|link|ly|gov|bank|online|site|top|biz|us|uk|ai|live|club|shop|store|tk|ml|cc";

// One combined pass, ordered: email > upi > url > phone. Alternation order prevents double replacement.
const PATTERN = new RegExp(
  [
    String.raw`(?<email>[\w.+-]+@[\w-]+(?:\.[\w-]+)+)`,
    String.raw`(?<upi>[\w.-]+@[a-z][a-z-]{1,20}\b)`,
    String.raw`(?<url>\b(?:https?:\/\/|www\.)[^\s"'<>)]+|\b(?:[a-z0-9-]+\.)+(?:${TLDS})\b(?:\/[^\s"'<>)]*)?)`,
    String.raw`(?<phone>(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b|\b1800[\s-]?\d{3}[\s-]?\d{4}\b|\b\d{10,12}\b)`,
  ].join("|"),
  "gi",
);

const hostOf = (u: string) =>
  u
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();

export function sanitizeText(s: string): string {
  return s.replace(PATTERN, (m, ...args) => {
    const g = args.at(-1) as Record<string, string | undefined>;
    if (g.email) return /@antibody\.sim$/i.test(m) ? m : SIM.email;
    if (g.upi) return /@antibody-sim$/i.test(m) ? m : SIM.upi;
    if (g.url) {
      const h = hostOf(m);
      return h === "antibody.sim" || h.endsWith(".antibody.sim") ? m : SIM.url;
    }
    return SIM.phone;
  });
}

export function sanitizeDeep<T>(v: T): T {
  if (typeof v === "string") return sanitizeText(v) as T;
  if (Array.isArray(v)) return v.map(sanitizeDeep) as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanitizeDeep(x)])) as T;
  return v;
}
