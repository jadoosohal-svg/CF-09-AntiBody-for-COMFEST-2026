// Runs the live pipeline once on the sample profile and saves the outputs to lib/demo/recorded/.
// Needs `npm run dev` running with API keys. Usage: npm run record-fixtures [-- http://localhost:3000]
// The demo engine uses the hand-checked fixtures in lib/demo/fixtures.ts (validated by `npm run check`);
// copy anything you like from the recordings into that file so the scripted chat stays consistent.
import { mkdir, writeFile } from "node:fs/promises";
import { SAMPLE_PROFILE, segment } from "../lib/demo/sample";

const base = process.argv[2] ?? "http://localhost:3000";

async function final(path: string, body: unknown) {
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
  const last = lines.at(-1);
  if (!last?.done) throw new Error(`${path}: stream did not finish`);
  return last.o;
}

const { segments } = segment(SAMPLE_PROFILE);
const dossier = await final("/api/infer", { segments });
const attacks = await final("/api/attacks", { dossier });
await mkdir("lib/demo/recorded", { recursive: true });
await writeFile("lib/demo/recorded/dossier.json", JSON.stringify(dossier, null, 2));
await writeFile("lib/demo/recorded/attacks.json", JSON.stringify(attacks, null, 2));
console.log(`recorded ${dossier.inferences?.length ?? 0} inferences, ${attacks.scenarios?.length ?? 0} scenarios`);
