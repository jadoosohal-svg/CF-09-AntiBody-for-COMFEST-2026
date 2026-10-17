import type { Segment } from "@/lib/schemas";

// A fictional person. Any resemblance to a real person is coincidental.
export const SAMPLE_PROFILE = `## Instagram bio
Riya Malhotra 🌸 Product designer at a fintech startup, Bengaluru. IIT Kanpur '19. Mom of Biscuit 🐶
## LinkedIn headline
Senior Product Designer, payments & onboarding. Grew up in Kanpur, now in Koramangala. Open to speaking gigs and paid design workshops.
## Recent posts
6:15am gym check-in again 💪 Mon-Wed-Fri streak, 40 days and counting!
Biscuit turns 3 today! My first pet ever, named after Mumma's favourite biscuit 😂
Back from Goa with Didi. The flat felt so empty for those 5 days, Biscuit was at the neighbour's.
Papa still calls me 'Gudiya' on the phone even though I'm 28 now 🙄❤️
Got my new iPhone, finally moved all my banking apps over. Time to set up UPI again 😅
Looking for a new role soon, recruiters feel free to DM!
## Apps I use
Instagram, LinkedIn, WhatsApp, two UPI apps, my bank's app, a food delivery app, a cab app, a gym app, a remote-desktop app (for helping Papa with his laptop)`;

/** One segment per non-empty, non-header line. Headers ("## ...") are kept for display only. */
export function segment(text: string): { segments: Segment[]; lines: { header?: string; segmentId?: string }[] } {
  const segments: Segment[] = [];
  const lines: { header?: string; segmentId?: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith("##")) {
      lines.push({ header: l.replace(/^#+\s*/, "") });
      continue;
    }
    const id = `S${segments.length + 1}`;
    segments.push({ id, text: l });
    lines.push({ segmentId: id });
  }
  return { segments, lines };
}
