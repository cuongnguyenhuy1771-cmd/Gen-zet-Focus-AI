export type FocusPhase =
  | "focus"
  | "break";

export interface DurationSettings {
  focusMinutes: number;
  breakMinutes: number;
}

// =========================================
// Defaults
// =========================================

export const DEFAULT_FOCUS_MINUTES = 25;

export const DEFAULT_BREAK_MINUTES = 5;

export const DEFAULT_DURATIONS: DurationSettings =
  {
    focusMinutes:
      DEFAULT_FOCUS_MINUTES,

    breakMinutes:
      DEFAULT_BREAK_MINUTES,
  };

// =========================================
// Bounds
// =========================================

export const MIN_FOCUS_MINUTES = 1;

export const MAX_FOCUS_MINUTES = 120;

export const MIN_BREAK_MINUTES = 1;

export const MAX_BREAK_MINUTES = 60;

// =========================================
// Presets
// =========================================

export const FOCUS_PRESETS = [
  15,
  25,
  50,
];

export const BREAK_PRESETS = [
  5,
  10,
  15,
];

// =========================================
// Helpers
// =========================================

export function minutesToSeconds(
  minutes: number
) {
  return Math.round(
    minutes * 60
  );
}

export function clampMinutes(
  value: number,
  min: number,
  max: number
) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(value)
    )
  );
}

export function clampFocusMinutes(
  value: number
) {
  return clampMinutes(
    value,
    MIN_FOCUS_MINUTES,
    MAX_FOCUS_MINUTES
  );
}

export function clampBreakMinutes(
  value: number
) {
  return clampMinutes(
    value,
    MIN_BREAK_MINUTES,
    MAX_BREAK_MINUTES
  );
}

// =========================================
// Phase duration
// =========================================

export function getPhaseDuration(
  phase: FocusPhase,
  durations: DurationSettings
) {
  return phase === "focus"
    ? minutesToSeconds(
        durations.focusMinutes
      )
    : minutesToSeconds(
        durations.breakMinutes
      );
}

// =========================================
// Phase transition
// =========================================

export function getNextPhase(
  currentPhase: FocusPhase
): FocusPhase {
  return currentPhase === "focus"
    ? "break"
    : "focus";
}

// =========================================
// Duration adjustment
//
// Changing 25 -> 30 while 20 minutes
// remain gives 25commentting stuff kieru wtf are we doing ?/ minutes remaining.
//Kieur wtf let int stuff 
// Changing 25 -> 20 while 20 minutes
// remain gives 15 minutes remaining.
//
// Before a session starts, the current
// countdown equals the old duration,
// so changing the setting gives exactly
// the new duration.
// =========================================

export function getAdjustedTimeLeft(
  currentTimeLeft: number,
  currentDuration: number,
  nextDuration: number
) {
  const delta =
    nextDuration -
    currentDuration;

  return Math.max(
    1,
    Math.min(
      nextDuration,
      currentTimeLeft + delta
    )
  );
}