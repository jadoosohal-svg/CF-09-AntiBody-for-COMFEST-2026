import { streamText, Output } from "ai";
import { models } from "@/lib/ai/models";
import { inferPrompt, inferSystem } from "@/lib/ai/prompts";
import { badRequest, noModel, objectResponse, readJson } from "@/lib/ai/stream";
import { Dossier, InferReq } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = InferReq.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error);
  const { smart } = models();
  if (!smart) return noModel();

  const r = streamText({
    model: smart,
    instructions: inferSystem(),
    prompt: inferPrompt(parsed.data.segments),
    output: Output.object({ schema: Dossier, name: "Dossier" }),
    abortSignal: req.signal,
    maxRetries: 1,
  });
  return objectResponse(r.partialOutputStream, r.output);
}
