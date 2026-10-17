import type { Transition, Variants } from "motion/react";

export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 35 },
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  gentle: { type: "spring", stiffness: 140, damping: 22 },
} satisfies Record<string, Transition>;

export const fade = { fast: { duration: 0.12, ease: "easeOut" } } satisfies Record<string, Transition>;

export const stagger = { list: 0.04 };

export const press = { whileHover: { scale: 1.015 }, whileTap: { scale: 0.97 }, transition: spring.snappy };

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: spring.smooth },
};

export const stageVariants: Variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0, transition: spring.gentle, transitionEnd: { transform: "none" } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18, ease: "easeIn" } },
};
