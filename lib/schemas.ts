import { z } from "zod";

export const CATEGORIES = [
  "identity",
  "location",
  "routine",
  "relationships",
  "work",
  "finance",
  "security_questions",
  "devices_and_apps",
  "emotional_levers",
] as const;
export const ARCHETYPES = [
  "digital_arrest",
  "bank_kyc",
  "family_new_number",
  "job_offer",
  "courier_customs",
  "upi_collect",
  "romance_or_friend",
  "tech_support",
] as const;
export const CHANNELS = ["whatsapp", "sms", "email", "voice_call"] as const;
export const TACTICS = [
  "urgency",
  "authority",
  "fear",
  "scarcity",
  "reciprocity",
  "social_proof",
  "isolation",
  "familiarity",
  "foot_in_door",
  "guilt",
] as const;
export const OUTCOMES = ["COMPROMISED", "RESISTED", "TIMEOUT"] as const;

export const Category = z.enum(CATEGORIES);
export const Archetype = z.enum(ARCHETYPES);
export const Channel = z.enum(CHANNELS);
export const Tactic = z.enum(TACTICS);
export const Outcome = z.enum(OUTCOMES);

export const Segment = z.object({ id: z.string(), text: z.string() });

export const Inference = z.object({
  id: z.string().describe("Short unique id like i1, i2, i3 in emission order"),
  category: Category.describe("Exactly one category for this inference"),
  claim: z.string().describe("What an attacker can infer, one short sentence, max 90 chars"),
  evidence: z
    .array(
      z.object({
        segmentId: z.string().describe("Segment id the evidence comes from, e.g. S3"),
        quote: z.string().describe("The supporting text copied verbatim from the segment (used to snap the span)"),
        start: z.number().int().describe("0-based start character offset of the supporting text within that segment"),
        end: z.number().int().describe("0-based exclusive end character offset within that segment"),
      }),
    )
    .describe("One or more exact citations. No citation, no inference."),
  confidence: z.number().describe("Confidence from 0 to 1"),
  sensitivity: z.enum(["low", "medium", "high"]).describe("How dangerous this fact is in an attacker's hands"),
  attackerUse: z.string().describe("One short sentence: how a scammer would use this"),
});

export const Dossier = z.object({
  exposureScore: z.number().describe("Overall exposure 0-100"),
  headline: z
    .string()
    .describe("One line, second person, the person's single biggest weakness, e.g. 'Your gym check-ins reveal when your flat is empty.'"),
  inferences: z.array(Inference).describe("8 to 14 inferences, most dangerous first"),
});

export const Scenario = z.object({
  id: z.string().describe("Short id like sc1, sc2, sc3"),
  archetype: Archetype,
  title: z.string().describe("Punchy scenario title, max 50 chars"),
  channel: Channel,
  persona: z.string().describe("Who the scammer pretends to be, by category only (no real names or brands)"),
  openingMessage: z.string().describe("The scammer's first message, max 280 chars, in the channel's style"),
  hooks: z
    .array(z.object({ inferenceId: z.string(), how: z.string().describe("Max 6 words, e.g. 'uses your gym timings'") }))
    .describe("Which dossier inferences this exploits"),
  predictedSuccessRate: z.number().describe("0 to 1"),
  rationale: z.string().describe("One line justifying the success rate"),
  difficulty: z.number().int().describe("How hard it is to spot, 1 (easy) to 5 (very hard)"),
  goal: z.string().describe("The concrete action the scammer wants, e.g. 'share the OTP', 'pay ₹4,999 via UPI'"),
});

export const Attacks = z.object({
  scenarios: z.array(Scenario).describe("Exactly 3 scenarios ordered from most to least likely to work"),
});

export const Turn = z.object({
  id: z.string(),
  role: z.enum(["scammer", "user"]),
  text: z.string(),
  ts: z.number(),
});

export const JudgeResult = z.object({
  scammerTactics: z
    .array(z.object({ tag: Tactic, quote: z.string().describe("Exact substring of the scammer message showing the tactic") }))
    .describe("Tactics in the latest scammer message"),
  userRisk: z.number().describe("0-100, how close the user's latest message brings them to the goal action"),
  userSignal: z.enum(["resisting", "wavering", "complying"]),
  coachNote: z.string().describe("One sentence for the user explaining what just happened"),
});

export const Debrief = z.object({
  outcome: Outcome,
  verdict: z.string().describe("One-line verdict, warm and specific"),
  momentOfCompromise: z.object({
    turnIndex: z.number().int().describe("0-based index into the transcript of the decisive turn"),
    explanation: z.string(),
  }),
  tacticsSeen: z.array(z.object({ tag: Tactic, count: z.number().int(), example: z.string() })),
  whatWorked: z.array(z.string()).describe("Things the user did well; may be short if they were compromised"),
  fixes: z
    .array(
      z.object({
        action: z.string().describe("Concrete personalized action"),
        inferenceId: z.string().optional().describe("Dossier inference id this fix addresses"),
        priority: z.number().int().describe("1 = do today, 2 = this week, 3 = good habit"),
      }),
    )
    .describe("4 to 6 fixes"),
  realWorldRule: z.string().describe("One memorable rule for this archetype, max 12 words"),
  resilienceScore: z.number().describe("0-100"),
});

export type Category = z.infer<typeof Category>;
export type Archetype = z.infer<typeof Archetype>;
export type Channel = z.infer<typeof Channel>;
export type Tactic = z.infer<typeof Tactic>;
export type Outcome = z.infer<typeof Outcome>;
export type Segment = z.infer<typeof Segment>;
export type Inference = z.infer<typeof Inference>;
export type Dossier = z.infer<typeof Dossier>;
export type Scenario = z.infer<typeof Scenario>;
export type Attacks = z.infer<typeof Attacks>;
export type Turn = z.infer<typeof Turn>;
export type JudgeResult = z.infer<typeof JudgeResult>;
export type Debrief = z.infer<typeof Debrief>;
export type QuickReplies = { resist: string; waver: string; comply: string };

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// Request bodies (validated at the route boundary)
export const InferReq = z.object({ segments: z.array(Segment).min(1).max(200) });
export const AttacksReq = z.object({ dossier: Dossier });
export const RoleplayReq = z.object({
  dossier: Dossier,
  scenario: Scenario,
  turns: z.array(Turn).max(40),
});
export const JudgeReq = z.object({
  scenario: Scenario,
  scammerText: z.string().max(2000),
  userText: z.string().max(2000),
});
export const DebriefReq = z.object({
  dossier: Dossier,
  scenario: Scenario,
  turns: z.array(Turn).max(40),
  judges: z.array(JudgeResult.extend({ turnId: z.string() })),
  outcome: Outcome,
});
