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

const REMINDER_STORAGE_KEY = "focus-ai-reminder-settings";

export interface ReminderSettings {
  thresholdSeconds: number;
  soundEnabled: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  thresholdSeconds: 15,
  soundEnabled: true,
};

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const threshold = Number(parsed.thresholdSeconds);
    return {
      thresholdSeconds: Number.isFinite(threshold)
        ? Math.max(5, Math.min(120, Math.round(threshold)))
        : DEFAULT_REMINDER_SETTINGS.thresholdSeconds,
      soundEnabled: typeof parsed.soundEnabled === "boolean"
        ? parsed.soundEnabled
        : DEFAULT_REMINDER_SETTINGS.soundEnabled,
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
}
