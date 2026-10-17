"use client";
import { motion, MotionConfig, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Ban, EyeOff, Play, SendHorizontal, ServerOff } from "lucide-react";
import Lenis from "lenis";
import { Glyph, HelplineFooter } from "@/components/ui";
import { spring } from "@/components/motion/presets";

export default function Landing() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Glyph neutral size={22} /> Antibody
        </div>
        <Link href="/lab" className="text-sm text-muted hover:text-fg">
          Open the lab →
        </Link>
      </header>
      <Hero />
      <Guardrails />
      <Steps />
      <Footer />
    </MotionConfig>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-antibody" /> Prebunking, personalized
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.05 }}
          className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl"
        >
          See the scam built for you — <span className="text-antibody">before a scammer does.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.12 }}
          className="mt-5 max-w-xl text-lg text-muted"
        >
          Antibody reads what you share publicly, builds the exact scam a criminal would aim at you, runs it on you in a safe simulation — then shows the moment you&apos;d have been caught and how to fix it.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.gentle, delay: 0.2 }} className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/lab"
            className="border-beam inline-flex items-center gap-2 rounded-xl bg-antibody px-5 py-3 font-medium text-black shadow-[0_0_40px_-10px_var(--antibody)] transition-transform hover:scale-[1.02] active:scale-[0.97]"
            style={{ ["--beam" as string]: "#ffffff" }}
          >
            Start your inoculation <ArrowRight size={18} />
          </Link>
          <Link
            href="/lab?demo=1"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 font-medium transition-colors hover:bg-surface-2 active:scale-[0.97]"
          >
            <Play size={16} /> Watch the demo
          </Link>
        </motion.div>
      </div>
      <HeroLoop />
    </section>
  );
}

const BUBBLES = [
  { kind: "Chat", text: "Gudiya beta, Papa here. New number, need small help urgently 🙏", x: "4%", delay: 0 },
  { kind: "SMS", text: "ALERT: UPI will be BLOCKED in 2 hrs. Verify at kyc.antibody.sim", x: "30%", delay: 0.5 },
  { kind: "Email", text: "Paid speaker slot (₹75,000) — register by tonight, slots closing!", x: "12%", delay: 1 },
];

/** 6s loop: bubbles drift up as antigens, a scan line passes, each neutralizes into an antibody. */
function HeroLoop() {
  const [cycle, setCycle] = useState(0);
  const [neutral, setNeutral] = useState([false, false, false]);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setNeutral([false, false, false]), 0));
    [2200, 2700, 3200].forEach((ms, i) => timers.push(setTimeout(() => setNeutral((n) => n.map((v, k) => (k === i ? true : v))), ms)));
    timers.push(setTimeout(() => setCycle((c) => c + 1), 6000));
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="relative h-[380px] overflow-hidden rounded-3xl border border-line bg-surface/60" aria-hidden>
      <div className="watermark" />
      <motion.div
        key={`scan${cycle}`}
        className="absolute inset-x-0 z-20 h-16 border-b border-antibody/50 bg-gradient-to-b from-transparent via-antibody/10 to-transparent"
        initial={{ y: -80 }}
        animate={{ y: 400 }}
        transition={{ duration: 2.2, delay: 1.4, ease: [0.4, 0, 0.2, 1] }}
      />
      {BUBBLES.map((b, i) => (
        <motion.div
          key={`${cycle}-${i}`}
          className="absolute z-10 w-[68%] rounded-2xl border border-line bg-surface-2 p-3 shadow-xl"
          style={{ left: b.x, top: 40 + i * 104 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: [0, 1, 1, 0], y: [40, 0, -10, -30] }}
          transition={{ duration: 6, delay: b.delay * 0.4, times: [0, 0.12, 0.85, 1], ease: "easeOut" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{b.kind}</span>
            <Glyph neutral={neutral[i]} size={18} />
          </div>
          <p className="text-[13px] leading-snug">{b.text}</p>
        </motion.div>
      ))}
      <div className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted/70">Simulation · Antibody</div>
    </div>
  );
}

const GUARDS: { icon: typeof Ban; label: string; tip: string }[] = [
  { icon: EyeOff, label: "Own data only", tip: "A consent checkbox gates every analysis: your info, or explicit consent." },
  { icon: Ban, label: "No scraping", tip: "No name, phone or URL lookup exists. Antibody only reads text you paste." },
  { icon: SendHorizontal, label: "Can't send anything", tip: "No email, SMS, WhatsApp or call integration. Scams live only inside the app." },
  { icon: ServerOff, label: "Nothing stored", tip: "No database. Session data lives in your browser and wipes in one click." },
];

function Guardrails() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Safety guardrails">
      <div className="flex flex-wrap justify-center gap-3">
        {GUARDS.map((g) => (
          <div key={g.label} className="group relative">
            <div tabIndex={0} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none transition-colors hover:border-antibody/40 focus-visible:border-antibody/40">
              <g.icon size={15} className="text-antibody" /> {g.label}
            </div>
            <div role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface-2 p-2.5 text-xs text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              {g.tip}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center font-mono text-[11px] text-muted">
        Every generated link uses the fake domain <span className="text-fg">*.antibody.sim</span> and every number is <span className="text-fg">+91 00000 00000</span>.
      </p>
    </section>
  );
}

function Steps() {
  return (
    <section className="mx-auto max-w-6xl space-y-24 px-4 py-28 sm:px-6">
      <Step n="01" title="Mirror" body="Paste your bio, posts and app list. An agent builds the attacker's dossier — every inference linked to the exact words that gave it away." preview={<MirrorPreview />} />
      <Step n="02" title="Strike" body="Antibody designs the three scams most likely to work on you, then drops you into a live, clearly-labelled simulation with a scammer agent." preview={<StrikePreview />} flip />
      <Step n="03" title="Debrief" body="Replay the conversation, see the exact moment you'd have been compromised, every manipulation tactic named, and a personal fix list." preview={<DebriefPreview />} />
    </section>
  );
}

function Step({ n, title, body, preview, flip }: { n: string; title: string; body: string; preview: ReactNode; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  return (
    <motion.div ref={ref} style={{ opacity, y }} className={`grid items-center gap-10 md:grid-cols-2 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <div className="font-mono text-sm text-antibody">{n}</div>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-md text-muted">{body}</p>
      </div>
      <div className="card relative h-64 overflow-hidden p-5">{preview}</div>
    </motion.div>
  );
}

function MirrorPreview() {
  return (
    <div className="grid h-full grid-cols-2 gap-4 text-[12px]">
      <div className="space-y-2 font-mono leading-relaxed text-muted">
        <p>
          <span className="text-muted/50">S3 </span>
          <motion.mark className="rounded px-0.5 text-fg" animate={{ backgroundColor: ["rgba(255,181,71,0)", "rgba(255,181,71,0.25)", "rgba(255,181,71,0.25)"] }} transition={{ duration: 3, repeat: Infinity }}>
            6:15am gym
          </motion.mark>{" "}
          check-in again
        </p>
        <p>
          <span className="text-muted/50">S4 </span>
          <motion.mark className="rounded px-0.5 text-fg" animate={{ backgroundColor: ["rgba(255,77,94,0)", "rgba(255,77,94,0)", "rgba(255,77,94,0.25)"] }} transition={{ duration: 3, repeat: Infinity }}>
            My first pet
          </motion.mark>
          , Biscuit
        </p>
      </div>
      <div className="space-y-2">
        {["At the gym 6:15am, Mon/Wed/Fri", "First pet's name is Biscuit"].map((c, i) => (
          <motion.div key={c} className="rounded-lg border border-line bg-surface-2 p-2" animate={{ opacity: [0, 1, 1], x: [10, 0, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, times: [0, 0.2, 1] }}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: i ? "var(--threat)" : "var(--pressure)" }} />
            {c}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StrikePreview() {
  return (
    <div className="flex h-full flex-col justify-end gap-2 text-[13px]">
      <div className="watermark" />
      <motion.div className="w-3/4 rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2" animate={{ opacity: [0, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 1] }}>
        Mumma&apos;s BP shot up, need ₹18,500 deposit. Don&apos;t tell Didi 🙏
      </motion.div>
      <motion.div className="flex gap-1" animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.35, 1] }}>
        <span className="rounded-full border border-pressure/40 px-2 font-mono text-[10px] uppercase text-pressure">Fear</span>
        <span className="rounded-full border border-pressure/40 px-2 font-mono text-[10px] uppercase text-pressure">Isolation</span>
      </motion.div>
      <motion.div className="ml-auto w-2/3 rounded-2xl rounded-br-md bg-antibody/15 px-3 py-2" animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.6, 1] }}>
        I&apos;m calling Mumma directly now.
      </motion.div>
    </div>
  );
}

function DebriefPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="relative flex items-center justify-between px-2">
        <div className="absolute left-2 right-2 top-1/2 h-px bg-line" />
        {[10, 40, 55, 88, 92].map((r, i) => (
          <motion.span
            key={i}
            className="relative h-3.5 w-3.5 rounded-full"
            style={{ background: r > 70 ? "var(--threat)" : r > 35 ? "var(--pressure)" : "var(--antibody)" }}
            animate={i === 3 ? { scale: [1, 1.5, 1] } : {}}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        ))}
      </div>
      <p className="text-center text-xl font-semibold tracking-tight">“New number + money request = call the old number first.”</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 text-center sm:px-6">
        <p className="mx-auto max-w-2xl text-sm text-muted">
          Built on inoculation theory: controlled exposure to a weakened form of manipulation builds resistance — the idea behind{" "}
          <a className="text-fg underline underline-offset-4" href="https://doi.org/10.1057/s41599-019-0279-9" target="_blank" rel="noreferrer">
            Roozenbeek &amp; van der Linden&apos;s Bad News game research
          </a>
          . Antibody makes the weakened dose personal.
        </p>
        <HelplineFooter />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">HACKCOM 26 · Building a safer digital world</p>
      </div>
    </footer>
  );
}
