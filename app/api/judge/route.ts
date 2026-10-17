import { generateText, Output } from "ai";
import { models } from "@/lib/ai/models";
import { judgePrompt, judgeSystem } from "@/lib/ai/prompts";
import { badRequest, noModel, readJson } from "@/lib/ai/stream";
import { sanitizeDeep } from "@/lib/ai/sanitize";
import { JudgeReq, JudgeResult } from "@/lib/schemas";

// Small payload, off the critical path: plain JSON, no streaming needed.
export async function POST(req: Request) {
  const parsed = JudgeReq.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error);
  const { fast } = models();
  if (!fast) return noModel();
  const { scenario, scammerText, userText } = parsed.data;

  try {
    const { output } = await generateText({
      model: fast,
      instructions: judgeSystem(),
      prompt: judgePrompt(scenario, scammerText, userText),
      output: Output.object({ schema: JudgeResult, name: "Judge" }),
      abortSignal: req.signal,
      maxRetries: 1,
    });
    return Response.json(sanitizeDeep(output));
  } catch {
    return Response.json({ error: "judge failed" }, { status: 502 });
  }
}
