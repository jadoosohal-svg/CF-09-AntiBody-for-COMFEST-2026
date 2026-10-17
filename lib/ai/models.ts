import "server-only";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Single source of truth for every model choice. Override IDs with SMART_MODEL / FAST_MODEL.
const has = (k: string) => Boolean(process.env[k]);

function smartModel(): LanguageModel | null {
  const id = process.env.SMART_MODEL;
  if (has("ANTHROPIC_API_KEY") && id) return anthropic(id); // Anthropic needs SMART_MODEL set
  if (has("OPENAI_API_KEY")) return openai(id ?? "gpt-4.1");
  if (has("GOOGLE_GENERATIVE_AI_API_KEY")) return google(id ?? "gemini-pro-latest");
  return null;
}

function fastModel(): LanguageModel | null {
  const id = process.env.FAST_MODEL;
  if (has("GROQ_API_KEY")) return groq(id ?? "moonshotai/kimi-k2-instruct-0905");
  if (has("ANTHROPIC_API_KEY") && id) return anthropic(id); // Anthropic needs FAST_MODEL set
  if (has("OPENAI_API_KEY")) return openai(id ?? "gpt-4.1-mini");
  if (has("GOOGLE_GENERATIVE_AI_API_KEY")) return google(id ?? "gemini-flash-latest");
  return null;
}

/** Smart tier falls back to fast tier; fast falls back to smart. Both null => demo mode. */
export function models() {
  const smart = smartModel();
  const fast = fastModel();
  return { smart: smart ?? fast, fast: fast ?? smart };
}

export const hasAnyKey = () => models().smart !== null;
