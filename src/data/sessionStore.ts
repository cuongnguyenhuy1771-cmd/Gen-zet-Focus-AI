export interface SessionRecord {
  id: string;

  startedAt: string;

  endedAt: string;

  focusedSeconds: number;

  breakSeconds: number;

  completedBreaks: number;

  attentionFocusedSeconds: number;

  attentionAwaySeconds: number;

  attentionAbsentSeconds: number;

  attentionSleepySeconds: number;

  /** Seconds classified as distracted (away, absent, or sleepy) during focus phases. */
  distractedSeconds: number;

  /** Number of distinct distraction episodes during the session. */
  distractionEpisodes: number;

  /** Longest continuous distraction episode, in seconds. */
  longestDistractionSeconds: number;

  /** Number of reminders shown during the session. */
  remindersShown: number;
}

const STORAGE_KEY =
  "focus-ai-sessions";

function normalizeSession(
  session: Partial<SessionRecord>
): SessionRecord {
  return {
    id:
      session.id ??
      crypto.randomUUID(),

    startedAt:
      session.startedAt ??
      new Date().toISOString(),

    endedAt:
      session.endedAt ??
      new Date().toISOString(),

    focusedSeconds:
      session.focusedSeconds ?? 0,

    breakSeconds:
      session.breakSeconds ?? 0,

    completedBreaks:
      session.completedBreaks ?? 0,

    attentionFocusedSeconds:
      session.attentionFocusedSeconds ??
      0,

    attentionAwaySeconds:
      session.attentionAwaySeconds ??
      0,

    attentionAbsentSeconds:
      session.attentionAbsentSeconds ??
      0,

    attentionSleepySeconds:
      session.attentionSleepySeconds ??
      0,

    distractedSeconds:
      session.distractedSeconds ?? 0,

    distractionEpisodes:
      session.distractionEpisodes ?? 0,

    longestDistractionSeconds:
      session.longestDistractionSeconds ?? 0,

    remindersShown:
      session.remindersShown ?? 0,
  };
}

export function getSessions(): SessionRecord[] {
  const stored =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!stored) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      (session) =>
        normalizeSession(session)
    );
  } catch (error) {
    console.error(
      "Unable to read saved sessions:",
      error
    );

    return [];
  }
}

export function saveSession(
  session: SessionRecord
) {
  const sessions =
    getSessions();

  sessions.push(
    normalizeSession(session)
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sessions)
  );
}

export function clearSessions() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}