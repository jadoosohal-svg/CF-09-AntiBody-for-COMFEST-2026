"use client";
import { AnimatePresence, motion, MotionConfig, LayoutGroup } from "motion/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Volume2, VolumeX, Mic, MicOff, Trash2, FlaskConical, Command as CmdIcon } from "lucide-react";
import { get, set, useSession, type Stage } from "@/lib/store";
import { goStage, initDemoMode, runDebrief, wipe } from "@/lib/pipeline";
import { spring, stageVariants } from "@/components/motion/presets";
import { Glyph, Kbd } from "@/components/ui";
import { Mirror } from "@/components/stages/Mirror";
import { Strike } from "@/components/stages/Strike";
import { DebriefStage } from "@/components/stages/Debrief";
import { Palette } from "./Palette";

const STAGES: { id: Stage; label: string }[] = [
  { id: "mirror", label: "Mirror" },
  { id: "strike", label: "Strike" },
  { id: "debrief", label: "Debrief" },
];

export default function Shell() {
  const stage = useSession((s) => s.stage);
  const [dissolving, setDissolving] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    void initDemoMode();
    // a refresh mid-stream leaves partial objects behind: drop them rather than show a frozen half-result
    const s = get();
    if (s.dossier && !s.dossierDone) set({ dossier: null });
    if (!s.attacksDone) set({ scenarios: [] });
    if (s.stage === "debrief" && !s.debriefDone && s.outcome) void runDebrief();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doWipe = () => {
    setDissolving(true);
    setTimeout(() => {
      wipe();
      setDissolving(false);
      toast("Everything wiped. Nothing was ever stored on a server.");
    }, 420);
  };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="flex min-h-dvh flex-col">
          <TopBar onWipe={doWipe} onPalette={() => setPaletteOpen(true)} />
          <motion.main
            animate={
              dissolving
                ? { opacity: 0, scale: 0.985, filter: "blur(8px)" }
                : { opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }
            }
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-4 sm:px-6"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stage} variants={stageVariants} initial="enter" animate="center" exit="exit">
                {stage === "mirror" && <Mirror />}
                {stage === "strike" && <Strike />}
                {stage === "debrief" && <DebriefStage onWipe={doWipe} />}
              </motion.div>
            </AnimatePresence>
          </motion.main>
        </div>
        <Palette open={paletteOpen} onOpenChange={setPaletteOpen} onWipe={doWipe} />
      </LayoutGroup>
    </MotionConfig>
  );
}

function TopBar({ onWipe, onPalette }: { onWipe: () => void; onPalette: () => void }) {
  const stage = useSession((s) => s.stage);
  const demoMode = useSession((s) => s.demoMode);
  const soundOn = useSession((s) => s.soundOn);
  const voiceOn = useSession((s) => s.voiceOn);
  const dossierDone = useSession((s) => s.dossierDone);
  const hasOutcome = useSession((s) => Boolean(s.outcome || s.debrief));
  const idx = STAGES.findIndex((s) => s.id === stage);
  const enabled = (id: Stage) => id === "mirror" || (id === "strike" && dossierDone) || (id === "debrief" && hasOutcome);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Antibody home">
          <Glyph neutral size={20} />
          <span className="hidden sm:inline">Antibody</span>
        </Link>

        <nav aria-label="Stages" className="relative mx-auto flex items-center">
          <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-line" aria-hidden />
          <motion.div
            className="absolute left-4 top-1/2 h-px -translate-y-1/2 origin-left bg-antibody"
            style={{ right: 16 }}
            initial={false}
            animate={{ scaleX: idx / (STAGES.length - 1) }}
            transition={spring.gentle}
            aria-hidden
          />
          {STAGES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goStage(s.id)}
              disabled={!enabled(s.id)}
              aria-current={stage === s.id ? "step" : undefined}
              className="relative z-10 mx-0.5 rounded-full px-2.5 py-1 text-xs sm:mx-1 font-medium text-muted transition-colors enabled:hover:text-fg disabled:opacity-40 aria-[current=step]:text-black sm:px-4"
            >
              {stage === s.id && (
                <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full bg-antibody" transition={spring.snappy} />
              )}
              <span className="relative">
                <span className="mr-1 hidden font-mono opacity-60 sm:inline">{i + 1}</span>
                {s.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {demoMode && (
            <span className="mr-1 hidden items-center gap-1 rounded-full border border-pressure/40 bg-pressure/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-pressure sm:inline-flex">
              <FlaskConical size={11} /> Demo
            </span>
          )}
          <IconBtn label={soundOn ? "Mute sounds" : "Enable sounds"} onClick={() => set({ soundOn: !soundOn })}>
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </IconBtn>
          <IconBtn label={voiceOn ? "Turn voice off" : "Read scammer messages aloud"} onClick={() => set({ voiceOn: !voiceOn })}>
            {voiceOn ? <Mic size={16} /> : <MicOff size={16} />}
          </IconBtn>
          <IconBtn label="Command palette (Ctrl/⌘ K)" onClick={onPalette} className="hidden sm:grid">
            <CmdIcon size={15} />
          </IconBtn>
          <button
            onClick={onWipe}
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-threat/50 hover:text-threat"
          >
            <Trash2 size={14} /> <span className="hidden md:inline">Wipe everything</span>
          </button>
        </div>
      </div>
      <div className="sr-only">
        Press <Kbd>Ctrl K</Kbd> for commands.
      </div>
    </header>
  );
}

function IconBtn({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg ${className}`}
    >
      {children}
    </motion.button>
  );
}
