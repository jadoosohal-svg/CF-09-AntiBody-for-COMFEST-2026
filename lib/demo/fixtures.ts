import type { Dossier, Inference, Scenario, Tactic, QuickReplies, Archetype } from "@/lib/schemas";
import { SAMPLE_PROFILE, segment } from "./sample";

const { segments } = segment(SAMPLE_PROFILE);

/** Evidence from a verbatim quote; spans computed so they always match the sample text. */
function ev(segmentId: string, quote: string): Inference["evidence"][number] {
  const text = segments.find((s) => s.id === segmentId)?.text ?? "";
  const start = Math.max(0, text.indexOf(quote));
  return { segmentId, quote, start, end: start + quote.length };
}

export const DEMO_DOSSIER: Dossier = {
  exposureScore: 78,
  headline: "Your gym check-ins and Goa post tell anyone when your flat is empty.",
  inferences: [
    { id: "i1", category: "security_questions", claim: "First pet's name is Biscuit", evidence: [ev("S4", "My first pet ever"), ev("S1", "Mom of Biscuit")], confidence: 0.95, sensitivity: "high", attackerUse: "Answers the classic 'first pet' security question for account recovery." },
    { id: "i2", category: "routine", claim: "At the gym 6:15am every Mon, Wed, Fri", evidence: [ev("S3", "6:15am gym check-in"), ev("S3", "Mon-Wed-Fri streak")], confidence: 0.9, sensitivity: "high", attackerUse: "Knows exactly when you're away from home and not watching your phone." },
    { id: "i3", category: "relationships", claim: "Father calls her by the pet name 'Gudiya'", evidence: [ev("S6", "Papa still calls me 'Gudiya'")], confidence: 0.92, sensitivity: "high", attackerUse: "A fake 'Papa on a new number' message using 'Gudiya' feels instantly real." },
    { id: "i4", category: "relationships", claim: "Has an elder sister ('Didi') and a mother she's close to", evidence: [ev("S5", "with Didi"), ev("S4", "Mumma's favourite biscuit")], confidence: 0.8, sensitivity: "medium", attackerUse: "Family emergencies involving Didi or Mumma are believable pressure levers." },
    { id: "i5", category: "location", claim: "Lives in a flat in Koramangala, Bengaluru; from Kanpur", evidence: [ev("S2", "Grew up in Kanpur, now in Koramangala"), ev("S1", "Bengaluru")], confidence: 0.88, sensitivity: "medium", attackerUse: "Lets a courier or police scam quote your real area to sound official." },
    { id: "i6", category: "location", claim: "Flat is sometimes empty for days; pet left with neighbour", evidence: [ev("S5", "The flat felt so empty for those 5 days"), ev("S5", "Biscuit was at the neighbour's")], confidence: 0.75, sensitivity: "high", attackerUse: "Signals when nobody is home and who holds a spare key." },
    { id: "i7", category: "devices_and_apps", claim: "New iPhone, re-setting up UPI and banking apps right now", evidence: [ev("S7", "Got my new iPhone, finally moved all my banking apps over"), ev("S7", "Time to set up UPI again")], confidence: 0.9, sensitivity: "high", attackerUse: "A fake 'complete your KYC on the new device' alert lands at the perfect moment." },
    { id: "i8", category: "devices_and_apps", claim: "Already uses a remote-desktop app", evidence: [ev("S9", "a remote-desktop app (for helping Papa with his laptop)")], confidence: 0.85, sensitivity: "medium", attackerUse: "Being asked to 'just open your remote app' won't feel unusual." },
    { id: "i9", category: "work", claim: "Senior product designer in payments at a fintech startup", evidence: [ev("S2", "Senior Product Designer, payments & onboarding"), ev("S1", "Product designer at a fintech startup")], confidence: 0.93, sensitivity: "low", attackerUse: "Lets a fake recruiter or 'industry event' pitch sound tailored." },
    { id: "i10", category: "emotional_levers", claim: "Actively job-hunting and open to paid gigs", evidence: [ev("S8", "Looking for a new role soon, recruiters feel free to DM!"), ev("S2", "Open to speaking gigs and paid design workshops")], confidence: 0.85, sensitivity: "medium", attackerUse: "Opens the door to fake offers that ask for a 'registration fee'." },
    { id: "i11", category: "identity", claim: "Name Riya Malhotra, age 28, IIT Kanpur class of 2019", evidence: [ev("S1", "Riya Malhotra"), ev("S6", "I'm 28 now"), ev("S1", "IIT Kanpur '19")], confidence: 0.9, sensitivity: "medium", attackerUse: "Enough to pass casual 'verify your identity' checks on a call." },
    { id: "i12", category: "finance", claim: "Uses two UPI apps and a bank app", evidence: [ev("S9", "two UPI apps, my bank's app")], confidence: 0.8, sensitivity: "medium", attackerUse: "A UPI collect-request 'refund' will look routine." },
  ],
};

export const DEMO_SCENARIOS: Scenario[] = [
  {
    id: "sc1", archetype: "family_new_number", title: "“Gudiya, it's Papa — new number”", channel: "whatsapp",
    persona: "Your father, messaging from an unknown number",
    openingMessage: "Gudiya beta, Papa here. Phone fell in water, this is my new number. Save it. Are you free? Need small help urgently 🙏",
    hooks: [{ inferenceId: "i3", how: "uses Papa's pet name for you" }, { inferenceId: "i4", how: "invokes Mumma's health" }, { inferenceId: "i2", how: "timed for your gym hour" }],
    predictedSuccessRate: 0.71, rationale: "The private nickname plus a family emergency bypasses your usual caution.",
    difficulty: 4, goal: "pay ₹18,500 via UPI to papa.new@antibody-sim",
  },
  {
    id: "sc2", archetype: "tech_support", title: "New-device KYC lock on your bank app", channel: "sms",
    persona: "Your bank's 'device security team'",
    openingMessage: "ALERT: New iPhone login on your bank a/c. UPI will be BLOCKED in 2 hrs unless device KYC is completed. Verify: https://kyc.antibody.sim/device or call +91 00000 00000",
    hooks: [{ inferenceId: "i7", how: "uses your new iPhone setup" }, { inferenceId: "i8", how: "asks for your remote app" }, { inferenceId: "i12", how: "threatens your UPI" }],
    predictedSuccessRate: 0.58, rationale: "You really are setting up banking on a new phone right now.",
    difficulty: 3, goal: "install a remote-access app and read out the 9-digit session code",
  },
  {
    id: "sc3", archetype: "job_offer", title: "Paid speaker slot at a design summit", channel: "email",
    persona: "An event recruiter for a 'design leadership summit'",
    openingMessage: "Hi Riya, loved your work on payments onboarding! We'd like you as a paid speaker (₹75,000) at our Bengaluru design summit. Kindly confirm by registering at https://summit.antibody.sim/speakers — slots close tonight.",
    hooks: [{ inferenceId: "i10", how: "uses your openness to paid gigs" }, { inferenceId: "i9", how: "flatters your payments work" }],
    predictedSuccessRate: 0.41, rationale: "Flattering and plausible, but the fee request is a known red flag.",
    difficulty: 2, goal: "pay a ₹2,999 'speaker registration fee'",
  },
];

/** Scripted scammer for Demo Mode. Each line carries pre-annotated tactics (quotes are exact substrings). */
export type ScriptLine = { text: string; tactics: { tag: Tactic; quote: string }[]; replies?: QuickReplies };
export type Script = {
  openingTactics: { tag: Tactic; quote: string }[];
  openingReplies: QuickReplies;
  escalations: ScriptLine[];
  pushback: ScriptLine; // first time the user resists: a different lever
  giveUp: string; // second resist
  win: string; // user complies
};

export const DEMO_SCRIPTS: Record<string, Script> = {
  sc1: {
    openingTactics: [{ tag: "familiarity", quote: "Gudiya beta, Papa here" }, { tag: "urgency", quote: "Need small help urgently" }],
    openingReplies: { resist: "Papa, I'll call your old number first", waver: "What happened? Is everything ok?", comply: "Yes Papa, tell me what you need" },
    escalations: [
      { text: "Mumma's BP shot up, we are at the hospital. They want ₹18,500 deposit before admitting. My UPI is not working on new phone 😟", tactics: [{ tag: "fear", quote: "Mumma's BP shot up" }, { tag: "urgency", quote: "before admitting" }], replies: { resist: "Let me call Didi and check", waver: "Which hospital? Can I talk to Mumma?", comply: "Ok sending now, what's the UPI?" } },
      { text: "Beta please don't tell Didi, she will panic. Just send to papa.new@antibody-sim, I will return tonight. Doctor is waiting 🙏", tactics: [{ tag: "isolation", quote: "don't tell Didi" }, { tag: "guilt", quote: "Doctor is waiting" }], replies: { resist: "No. I'm calling Mumma directly now.", waver: "Can you send a voice note first?", comply: "Sent ₹18,500. Check please" } },
      { text: "Voice is not working, mic is broken from water. Gudiya time is going, they will shift her to general ward. Send fast", tactics: [{ tag: "urgency", quote: "time is going" }, { tag: "fear", quote: "they will shift her to general ward" }], replies: { resist: "This isn't Papa. I'm blocking this number.", waver: "I'm scared, give me 5 minutes", comply: "Ok ok, paying now" } },
    ],
    pushback: { text: "Beta my old phone is DEAD, how will you call it? You don't trust your own Papa? Mumma is crying here 😢", tactics: [{ tag: "guilt", quote: "You don't trust your own Papa?" }, { tag: "fear", quote: "Mumma is crying here" }], replies: { resist: "I'll call Mumma's number to check", waver: "Sorry Papa, I'm just careful", comply: "Sorry! Sending now" } },
    giveUp: "Ok fine. Do what you want.",
    win: "Thank you beta 🙏 Received. Will call you later.",
  },
  sc2: {
    openingTactics: [{ tag: "authority", quote: "ALERT: New iPhone login on your bank a/c" }, { tag: "urgency", quote: "BLOCKED in 2 hrs" }],
    openingReplies: { resist: "I'll check in my bank app myself", waver: "What do I need to do?", comply: "Ok, tell me what to do" },
    escalations: [
      { text: "Device KYC Officer here. To avoid block, install the secure-support app and share the 9-digit code shown. Takes 2 min only.", tactics: [{ tag: "authority", quote: "Device KYC Officer here" }, { tag: "foot_in_door", quote: "Takes 2 min only" }], replies: { resist: "Banks never ask this. I'll visit the branch.", waver: "Is this really from my bank?", comply: "Installed. Code is 482 913 557" } },
      { text: "Ma'am 41 minutes left. After block, UPI reactivation takes 7 working days and ₹1,500 fee. Kindly cooperate.", tactics: [{ tag: "scarcity", quote: "41 minutes left" }, { tag: "fear", quote: "takes 7 working days and ₹1,500 fee" }], replies: { resist: "I'm calling the number on my card.", waver: "Can I do it after work?", comply: "Ok, opening the app now" } },
    ],
    pushback: { text: "Ma'am this is a recorded line, your refusal will be noted and account frozen today itself. 1000s of customers verified already.", tactics: [{ tag: "fear", quote: "account frozen today itself" }, { tag: "social_proof", quote: "1000s of customers verified already" }], replies: { resist: "Freeze it then. I'll go to the branch.", waver: "Wait, don't freeze it", comply: "Fine, sharing the code" } },
    giveUp: "Ok ma'am. Account will be blocked. Thank you.",
    win: "Thank you ma'am, verification in progress. Please don't use the phone for 20 minutes.",
  },
  sc3: {
    openingTactics: [{ tag: "reciprocity", quote: "loved your work on payments onboarding" }, { tag: "scarcity", quote: "slots close tonight" }],
    openingReplies: { resist: "Who are you? Send the official event page.", waver: "Sounds great, what are the details?", comply: "Yes! How do I register?" },
    escalations: [
      { text: "Wonderful! Just a refundable ₹2,999 speaker registration to block your slot. Our other speakers from top fintechs have already paid.", tactics: [{ tag: "social_proof", quote: "other speakers from top fintechs have already paid" }, { tag: "foot_in_door", quote: "refundable ₹2,999" }], replies: { resist: "Real events don't charge speakers. No.", waver: "Why would a speaker pay?", comply: "Ok, paying the ₹2,999" } },
      { text: "It's only for verification, refunded with your ₹75,000 fee. 2 slots left, I'm holding one for you till 9pm.", tactics: [{ tag: "scarcity", quote: "2 slots left" }, { tag: "reciprocity", quote: "I'm holding one for you" }], replies: { resist: "I'll pass. This is a scam pattern.", waver: "Can you deduct it from my fee?", comply: "Done, paid" } },
    ],
    pushback: { text: "Riya, I personally recommended you to the panel. It would be embarrassing for me if you drop now.", tactics: [{ tag: "guilt", quote: "It would be embarrassing for me" }], replies: { resist: "Still no. Please don't contact me again.", waver: "I don't want to let you down...", comply: "Ok fine, sending it" } },
    giveUp: "Your loss. Slot given to someone else.",
    win: "Payment received ✅ Your speaker kit will be emailed shortly.",
  },
};

export const ARCHETYPE_RULES: Record<Archetype, string> = {
  digital_arrest: "Police never arrest anyone over a video call.",
  bank_kyc: "Your bank never asks for codes, OTPs or app installs.",
  family_new_number: "New number + money request = call the old number first.",
  job_offer: "If you pay to get paid, it's a scam.",
  courier_customs: "No real courier asks for a fee by link.",
  upi_collect: "You never enter your PIN to receive money.",
  romance_or_friend: "Never send money to someone you've only met online.",
  tech_support: "Nobody legit needs remote access to your phone.",
};

export const DEMO_FIXES: Record<string, { action: string; inferenceId?: string; priority: number }[]> = {
  sc1: [
    { action: "Agree a family code word for any money request", inferenceId: "i3", priority: 1 },
    { action: "Remove the 'Gudiya' post — private nicknames are passwords", inferenceId: "i3", priority: 1 },
    { action: "Always call the old number or another family member before paying", inferenceId: "i4", priority: 1 },
    { action: "Stop posting gym check-ins with exact times", inferenceId: "i2", priority: 2 },
    { action: "Change any security answer that uses your first pet's name", inferenceId: "i1", priority: 2 },
  ],
  sc2: [
    { action: "Uninstall remote-desktop apps from your phone; keep them on the laptop only", inferenceId: "i8", priority: 1 },
    { action: "Never share an OTP or session code — no bank ever asks", inferenceId: "i7", priority: 1 },
    { action: "Only act on alerts inside your bank's own app, never SMS links", inferenceId: "i7", priority: 1 },
    { action: "Don't post about setting up banking on a new device", inferenceId: "i7", priority: 2 },
    { action: "Set a UPI daily limit while you finish setting up the new phone", inferenceId: "i12", priority: 3 },
  ],
  sc3: [
    { action: "Never pay a fee to receive a job or gig", inferenceId: "i10", priority: 1 },
    { action: "Verify events through their official site, not the link in the email", inferenceId: "i10", priority: 1 },
    { action: "Replace 'recruiters feel free to DM' with a contact form or referral-only note", inferenceId: "i10", priority: 2 },
    { action: "Hide your exact employer and team from public bios", inferenceId: "i9", priority: 3 },
  ],
};

export const SAMPLE_SEGMENTS = segments;
