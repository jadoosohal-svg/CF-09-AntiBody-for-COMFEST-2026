import { streamText, Output } from "ai";
import { models } from "@/lib/ai/models";
import { attacksPrompt, attacksSystem } from "@/lib/ai/prompts";
import { badRequest, noModel, objectResponse, readJson } from "@/lib/ai/stream";
import { Attacks, AttacksReq } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = AttacksReq.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error);
  const { smart } = models();
  if (!smart) return noModel();

  const r = streamText({
    model: smart,
    instructions: attacksSystem(),
    prompt: attacksPrompt(parsed.data.dossier),
    output: Output.object({ schema: Attacks, name: "Attacks" }),
    abortSignal: req.signal,
    maxRetries: 1,
  });
  return objectResponse(r.partialOutputStream, r.output);
}
