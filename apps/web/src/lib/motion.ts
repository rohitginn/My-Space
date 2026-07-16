// ============================================================
// Shared motion tokens
// Rules: durations ≤300ms (entrances 250ms, exits ~150ms),
// entrances are opacity 0 + y 8 or scale 0.97 (never scale 0),
// stagger 50ms, whileTap 0.97 on action buttons.
// ============================================================

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Prop-spread form: `{...fadeSlideUp}` on a motion element. */
export const fadeSlideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: EASE_OUT },
};

/** Variants form for staggered children (parent uses `staggerParent`). */
export const fadeSlideUpItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE_OUT } },
};

export const staggerParent = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const pressTap = { scale: 0.97 }; // use as whileTap={pressTap}
export const hoverLift = { scale: 1.02 }; // interactive cards only, as whileHover
