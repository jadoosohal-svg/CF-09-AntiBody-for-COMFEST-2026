// Client-side guard: block anything that looks like a real card number, Aadhaar, PAN or password.
const CARD = /(?:\d[ -]?){13,19}/;
const AADHAAR = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/;
const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/i;
const PASSWORD_PHRASE = /\b(password|passcode|pin|mpin|cvv)\b\s*(is|:|=)?\s*\S{3,}/i;
// ponytail: strong-password heuristic (upper+lower+digit+symbol, 8+ chars); misses weak real passwords
const STRONG_TOKEN = /(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s])\S{8,}/;

export function looksLikeRealSecret(text: string): boolean {
  return [CARD, AADHAAR, PAN, PASSWORD_PHRASE, STRONG_TOKEN].some((r) => r.test(text));
}
