"use client";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { set, useSession } from "@/lib/store";
import { goStage, loadSample } from "@/lib/pipeline";

export function Palette({ open, onOpenChange, onWipe }: { open: boolean; onOpenChange: (o: boolean) => void; onWipe: () => void }) {
  const demoMode = useSession((s) => s.demoMode);
  const run = (fn: () => void) => () => {
    fn();
    onOpenChange(false);
  };
  const item =
    "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/50 pt-[18vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-[min(520px,92vw)] overflow-hidden"
          >
            <Command label="Command palette" loop>
              <Command.Input
                autoFocus
                placeholder="Jump to a stage, toggle demo mode…"
                className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
                onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
              />
              <Command.List className="max-h-80 overflow-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted">Nothing found.</Command.Empty>
                <Command.Group heading="Stages" className="text-[10px] uppercase tracking-wider text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item className={item} onSelect={run(() => goStage("mirror"))}>Go to Mirror</Command.Item>
                  <Command.Item className={item} onSelect={run(() => goStage("strike"))}>Go to Strike</Command.Item>
                  <Command.Item className={item} onSelect={run(() => goStage("debrief"))}>Go to Debrief</Command.Item>
                </Command.Group>
                <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item className={item} onSelect={run(() => set({ demoMode: !demoMode }))}>
                    {demoMode ? "Turn Demo Mode off" : "Turn Demo Mode on"}
                  </Command.Item>
                  <Command.Item className={item} onSelect={run(() => { goStage("mirror"); loadSample(); })}>Load sample profile</Command.Item>
                  <Command.Item className={item} onSelect={run(onWipe)}>Wipe everything</Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
