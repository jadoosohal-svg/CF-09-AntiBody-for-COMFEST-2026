import { streamText, Output } from "ai";
import { models } from "@/lib/ai/models";
import { debriefPrompt, debriefSystem } from "@/lib/ai/prompts";
import { badRequest, noModel, objectResponse, readJson } from "@/lib/ai/stream";
import { Debrief, DebriefReq } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = DebriefReq.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error);
  const { smart } = models();
  if (!smart) return noModel();
  const { dossier, scenario, turns, judges, outcome } = parsed.data;

  const r = streamText({
    model: smart,
    instructions: debriefSystem(),
    prompt: debriefPrompt(dossier, scenario, turns, judges, outcome),
    output: Output.object({ schema: Debrief, name: "Debrief" }),
    abortSignal: req.signal,
    maxRetries: 1,
  });
  return objectResponse(r.partialOutputStream, r.output);
}
