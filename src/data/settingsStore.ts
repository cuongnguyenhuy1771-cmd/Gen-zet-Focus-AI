import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_FOCUS_MINUTES,
  clampBreakMinutes,
  clampFocusMinutes,
  type DurationSettings,
} from "../focus/focusEngine";

const STORAGE_KEY =
  "focus-ai-durations";

function readMinutes(
  value: unknown,
  clamp: (value: number) => number,
  fallback: number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return clamp(value);
}

export function getDurationSettings(): DurationSettings {
  const stored =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!stored) {
    return {
      focusMinutes:
        DEFAULT_FOCUS_MINUTES,

      breakMinutes:
        DEFAULT_BREAK_MINUTES,
    };
  }

  try {
    const parsed =
      JSON.parse(stored) as Partial<DurationSettings>;

    return {
      focusMinutes:
        readMinutes(
          parsed.focusMinutes,
          clampFocusMinutes,
          DEFAULT_FOCUS_MINUTES
        ),

      breakMinutes:
        readMinutes(
          parsed.breakMinutes,
          clampBreakMinutes,
          DEFAULT_BREAK_MINUTES
        ),
    };
  } catch {
    return {
      focusMinutes:
        DEFAULT_FOCUS_MINUTES,

      breakMinutes:
        DEFAULT_BREAK_MINUTES,
    };
  }
}

export function saveDurationSettings(
  durations: DurationSettings
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(durations)
  );
}