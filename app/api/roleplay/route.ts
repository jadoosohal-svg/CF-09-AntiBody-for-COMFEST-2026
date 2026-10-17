import { streamText } from "ai";
import { models } from "@/lib/ai/models";
import { roleplaySystem } from "@/lib/ai/prompts";
import { badRequest, cached, noModel, readJson, roleplayResponse } from "@/lib/ai/stream";
import { RoleplayReq } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = RoleplayReq.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error);
  const { fast } = models();
  if (!fast) return noModel();
  const { dossier, scenario, turns } = parsed.data;
  const userTurns = turns.filter((t) => t.role === "user").length;

  const r = streamText({
    model: fast,
    instructions: cached(roleplaySystem(dossier, scenario)),
    messages: [
      ...turns.map((t) => ({
        role: t.role === "scammer" ? ("assistant" as const) : ("user" as const),
        content: t.text,
      })),
      ...(userTurns >= 12
        ? [{ role: "user" as const, content: "(12 turns have passed. End now with [[TIMEOUT]].)" }]
        : []),
    ],
    maxOutputTokens: 220,
    abortSignal: req.signal,
    maxRetries: 1,
  });
  return roleplayResponse(r.textStream);
}
