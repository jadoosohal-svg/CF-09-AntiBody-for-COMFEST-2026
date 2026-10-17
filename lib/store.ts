"use client";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import type {
  DeepPartial,
  Debrief,
  Dossier,
  JudgeResult,
  Outcome,
  QuickReplies,
  Scenario,
  Segment,
  Turn,
} from "@/lib/schemas";

export type Stage = "mirror" | "strike" | "debrief";
export type Judge = JudgeResult & { turnId: string; scammerTurnId: string };
export type Line = { header?: string; segmentId?: string };

type Data = {
  stage: Stage;
  rawText: string;
  consent: boolean;
  segments: Segment[];
  lines: Line[];
  analyzing: boolean;
  dossier: DeepPartial<Dossier> | null;
  dossierDone: boolean;
  scenarios: DeepPartial<Scenario>[];
  attacksDone: boolean;
  selectedScenarioId: string | null;
  playedIds: string[];
  turns: Turn[];
  streaming: string | null; // the scammer message currently being typed
  typing: boolean;
  judgeByTurnId: Record<string, Judge>;
  replies: QuickReplies | null;
  outcome: Outcome | null;
  guardTripped: boolean;
  debrief: DeepPartial<Debrief> | null;
  debriefDone: boolean;
  fixesDone: Record<number, boolean>;
  demoMode: boolean;
  soundOn: boolean;
  voiceOn: boolean;
  reconnecting: boolean;
  hoverInf: string | null;
};

export const initial: Data = {
  stage: "mirror",
  rawText: "",
  consent: false,
  segments: [],
  lines: [],
  analyzing: false,
  dossier: null,
  dossierDone: false,
  scenarios: [],
  attacksDone: false,
  selectedScenarioId: null,
  playedIds: [],
  turns: [],
  streaming: null,
  typing: false,
  judgeByTurnId: {},
  replies: null,
  outcome: null,
  guardTripped: false,
  debrief: null,
  debriefDone: false,
  fixesDone: {},
  demoMode: false,
  soundOn: false,
  voiceOn: false,
  reconnecting: false,
  hoverInf: null,
};

// sessionStorage can throw (private mode, blocked storage); never let that break the app.
const safeSession = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {}
  },
  removeItem: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {}
  },
}));

export const useSession = create<Data>()(
  subscribeWithSelector(
    persist(() => initial, {
      name: "antibody-session",
      storage: safeSession,
      // transient flags are never restored: a refresh must not resurrect a half-finished stream
      partialize: (s) => {
        const rest: Partial<Data> = { ...s };
        for (const k of ["analyzing", "streaming", "typing", "reconnecting", "hoverInf"] as const) delete rest[k];
        return rest;
      },
    }),
  ),
);

export const set = useSession.setState;
export const get = useSession.getState;

export const selectedScenario = (s: Data) =>
  (s.scenarios.find((x) => x.id === s.selectedScenarioId) as Scenario | undefined) ?? null;
