import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

import {
  clampBreakMinutes,
  clampFocusMinutes,
  getAdjustedTimeLeft,
  getNextPhase,
  getPhaseDuration,
  type DurationSettings,
  type FocusPhase,
} from "./focus/focusEngine";

import {
  getSessions,
  saveSession,
  type SessionRecord,
} from "./data/sessionStore";

import {
  getDurationSettings,
  saveDurationSettings,
  getReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from "./data/settingsStore";

import Camera from "./components/Camera";

import DurationAdjuster from "./components/DurationAdjuster";

import type {
  AttentionState,
} from "./vision/attention";

// =========================================
// Helpers
// =========================================

function formatTime(
  seconds: number
) {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(
    2,
    "0"
  )}`;
}

function formatDuration(
  seconds: number
) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  return `${minutes}m`;
}

// =========================================
// App
// =========================================

function App() {
  // =======================================
  // Duration settings
  // =======================================

  const [durations, setDurations] =
    useState<DurationSettings>(
      getDurationSettings
    );

  const [reminderSettings, setReminderSettings] =
    useState<ReminderSettings>(getReminderSettings);
  const [distractionSeconds, setDistractionSeconds] = useState(0);
  const [currentDistractionSeconds, setCurrentDistractionSeconds] = useState(0);
  const [longestDistractionSeconds, setLongestDistractionSeconds] = useState(0);
  const [distractionEpisodes, setDistractionEpisodes] = useState(0);
  const [remindersShown, setRemindersShown] = useState(0);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [reminderVisible, setReminderVisible] = useState(false);

  const distractionStreakRef = useRef(0);
  const reminderShownThisEpisodeRef = useRef(false);
  const cameraEnabledRef = useRef(false);
  const reminderSettingsRef = useRef(reminderSettings);
  const isRunningRef = useRef(false);

  // =======================================
  // Timer
  // =======================================

  const [phase, setPhase] =
    useState<FocusPhase>(
      "focus"
    );

  const [timeLeft, setTimeLeft] =
    useState(() =>
      getPhaseDuration(
        "focus",
        durations
      )
    );

  const [isRunning, setIsRunning] =
    useState(false);

  // =======================================
  // Session
  // =======================================

  const [
    focusedSeconds,
    setFocusedSeconds,
  ] = useState(0);

  const [
    breakSeconds,
    setBreakSeconds,
  ] = useState(0);

  const [
    completedBreaks,
    setCompletedBreaks,
  ] = useState(0);

  const [
    sessionStartedAt,
    setSessionStartedAt,
  ] =
    useState<string | null>(
      null
    );

  // =======================================
  // Camera
  // =======================================

  const [
    cameraEnabled,
    setCameraEnabled,
  ] = useState(false);

  const [
    attentionState,
    setAttentionState,
  ] =
    useState<AttentionState>(
      "absent"
    );

  // =======================================
  // Attention statistics
  // =======================================

  const [
    attentionFocusedSeconds,
    setAttentionFocusedSeconds,
  ] = useState(0);

  const [
    attentionAwaySeconds,
    setAttentionAwaySeconds,
  ] = useState(0);

  const [
    attentionAbsentSeconds,
    setAttentionAbsentSeconds,
  ] = useState(0);

  const [
    attentionSleepySeconds,
    setAttentionSleepySeconds,
  ] = useState(0);

  // =======================================
  // Saved sessions
  // =======================================

  const [sessions, setSessions] =
    useState<SessionRecord[]>(
      () => getSessions()
    );

  // =======================================
  // Live refs
  //
  // Camera changes attention frequently.
  // Do NOT put attentionState in the timer
  // interval dependencies.
  // =======================================

  const phaseRef =
    useRef(phase);

  const attentionStateRef =
    useRef(
      attentionState
    );

  useEffect(() => {
    phaseRef.current =
      phase;
  }, [phase]);

  useEffect(() => {
    attentionStateRef.current =
      attentionState;
  }, [
    attentionState,
  ]);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
    if (!cameraEnabled) {
      distractionStreakRef.current = 0;
      setCurrentDistractionSeconds(0);
      reminderShownThisEpisodeRef.current = false;
      setReminderVisible(false);
    }
  }, [cameraEnabled]);

  useEffect(() => {
    reminderSettingsRef.current = reminderSettings;
    saveReminderSettings(reminderSettings);
  }, [reminderSettings]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // =======================================
  // Save duration settings
  // =======================================

  useEffect(() => {
    saveDurationSettings(
      durations
    );
  }, [durations]);

  // =======================================
  // Timer tick
  //
  // Only depends on isRunning.
  // =======================================

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          const currentPhase =
            phaseRef.current;

          const currentAttention =
            attentionStateRef.current;

          // -------------------------------
          // Timer statistics
          // -------------------------------

          if (
            currentPhase ===
            "focus"
          ) {
            setFocusedSeconds(
              (seconds) =>
                seconds + 1
            );
          } else {
            setBreakSeconds(
              (seconds) =>
                seconds + 1
            );
          }

          // -------------------------------
          // Distraction tracking + reminder
          // Count only during an active focus phase with camera enabled.
          // A short interruption is tracked, but reminders wait for threshold.
          // -------------------------------
          if (currentPhase === "focus" && cameraEnabledRef.current) {
            if (currentAttention !== "focused") {
              distractionStreakRef.current += 1;
              setDistractionSeconds((seconds) => seconds + 1);
              setCurrentDistractionSeconds(distractionStreakRef.current);
              setLongestDistractionSeconds((longest) =>
                Math.max(longest, distractionStreakRef.current)
              );

              const threshold = reminderSettingsRef.current.thresholdSeconds;
              if (
                distractionStreakRef.current >= threshold &&
                !reminderShownThisEpisodeRef.current
              ) {
                reminderShownThisEpisodeRef.current = true;
                setRemindersShown((count) => count + 1);
                setReminderMessage(
                  `You've been away from focus for ${distractionStreakRef.current} seconds. Ready to get back on track?`
                );
                setReminderVisible(true);

                if (reminderSettingsRef.current.soundEnabled) {
                  try {
                    const AudioContextClass =
                      window.AudioContext ||
                      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                    if (AudioContextClass) {
                      const audio = new AudioContextClass();
                      const oscillator = audio.createOscillator();
                      const gain = audio.createGain();
                      oscillator.connect(gain);
                      gain.connect(audio.destination);
                      oscillator.frequency.value = 740;
                      gain.gain.value = 0.08;
                      oscillator.start();
                      oscillator.stop(audio.currentTime + 0.16);
                      oscillator.onended = () => void audio.close();
                    }
                  } catch {
                    // Audio is optional; the visual reminder still works.
                  }
                }
              }
            } else {
              distractionStreakRef.current = 0;
              setCurrentDistractionSeconds(0);
              reminderShownThisEpisodeRef.current = false;
              setReminderVisible(false);
            }
          } else {
            distractionStreakRef.current = 0;
            setCurrentDistractionSeconds(0);
            reminderShownThisEpisodeRef.current = false;
            setReminderVisible(false);
          }

          // -------------------------------
          // AI statistics
          // -------------------------------

          if (
            currentPhase ===
            "focus"
          ) {
            if (
              currentAttention ===
              "focused"
            ) {
              setAttentionFocusedSeconds(
                (seconds) =>
                  seconds + 1
              );
            }

            if (
              currentAttention ===
              "away"
            ) {
              setAttentionAwaySeconds(
                (seconds) =>
                  seconds + 1
              );
            }

            if (
              currentAttention ===
              "absent"
            ) {
              setAttentionAbsentSeconds(
                (seconds) =>
                  seconds + 1
              );
            }

            if (
              currentAttention ===
              "sleepy"
            ) {
              setAttentionSleepySeconds(
                (seconds) =>
                  seconds + 1
              );
            }
          }

          // -------------------------------
          // Countdown
          // -------------------------------

          setTimeLeft(
            (currentTime) =>
              currentTime > 0
                ? currentTime - 1
                : 0
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [isRunning]);

  // =======================================
  // Phase transition
  //
  // Kept OUTSIDE setTimeLeft updater.
  // =======================================

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (timeLeft > 0) {
      return;
    }

    const nextPhase =
      getNextPhase(
        phase
      );

    if (
      phase === "break"
    ) {
      setCompletedBreaks(
        (breaks) =>
          breaks + 1
      );
    }

    setPhase(
      nextPhase
    );

    distractionStreakRef.current = 0;
    setCurrentDistractionSeconds(0);
    reminderShownThisEpisodeRef.current = false;
    setReminderVisible(false);

    setTimeLeft(
      getPhaseDuration(
        nextPhase,
        durations
      )
    );
  }, [
    isRunning,
    timeLeft,
    phase,
    durations,
  ]);

  // =======================================
  // Duration changes
  // =======================================

  function applyDurations(
    nextDurations: DurationSettings
  ) {
    const currentDuration =
      getPhaseDuration(
        phase,
        durations
      );

    const nextDuration =
      getPhaseDuration(
        phase,
        nextDurations
      );

    setDurations(
      nextDurations
    );

    if (
      currentDuration ===
      nextDuration
    ) {
      return;
    }

    setTimeLeft(
      (currentTime) =>
        getAdjustedTimeLeft(
          currentTime,
          currentDuration,
          nextDuration
        )
    );
  }

  function handleFocusMinutesChange(
    minutes: number
  ) {
    applyDurations({
      ...durations,

      focusMinutes:
        clampFocusMinutes(
          minutes
        ),
    });
  }

  function handleBreakMinutesChange(
    minutes: number
  ) {
    applyDurations({
      ...durations,

      breakMinutes:
        clampBreakMinutes(
          minutes
        ),
    });
  }

  // =======================================
  // Current-clock ±1 minute
  //
  // Does NOT change configured duration.
  // =======================================

  function handleAdjustCurrentPhase(
    deltaMinutes: number
  ) {
    setTimeLeft(
      (currentTime) =>
        Math.max(
          1,
          currentTime +
            deltaMinutes *
              60
        )
    );
  }

  // =======================================
  // Start / pause
  // =======================================

  function handleStartPause() {
    if (
      !isRunning &&
      sessionStartedAt ===
        null
    ) {
      setSessionStartedAt(
        new Date().toISOString()
      );
    }

    setIsRunning(
      (running) =>
        !running
    );
  }

  // =======================================
  // Reset
  // =======================================

  function handleReset() {
    setIsRunning(false);

    setPhase("focus");

    setTimeLeft(
      getPhaseDuration(
        "focus",
        durations
      )
    );

    setFocusedSeconds(0);

    setBreakSeconds(0);

    setCompletedBreaks(0);

    setAttentionFocusedSeconds(
      0
    );

    setAttentionAwaySeconds(
      0
    );

    setAttentionAbsentSeconds(
      0
    );

    setAttentionSleepySeconds(0);
    setDistractionSeconds(0);
    setCurrentDistractionSeconds(0);
    setLongestDistractionSeconds(0);
    setDistractionEpisodes(0);
    setRemindersShown(0);
    setReminderVisible(false);
    setReminderMessage(null);
    distractionStreakRef.current = 0;
    reminderShownThisEpisodeRef.current = false;

    setSessionStartedAt(
      null
    );

    setAttentionState(
      "absent"
    );
  }

  // =======================================
  // End session
  // =======================================

  function handleEndSession() {
    if (
      sessionStartedAt ===
      null
    ) {
      return;
    }

    const session: SessionRecord =
      {
        id: crypto.randomUUID(),

        startedAt:
          sessionStartedAt,

        endedAt:
          new Date().toISOString(),

        focusedSeconds,

        breakSeconds,

        completedBreaks,

        attentionFocusedSeconds,

        attentionAwaySeconds,

        attentionAbsentSeconds,

        attentionSleepySeconds,

        distractedSeconds: distractionSeconds,
        distractionEpisodes,
        longestDistractionSeconds,
        remindersShown,
      };

    saveSession(
      session
    );

    setSessions(
      getSessions()
    );

    handleReset();
  }

  // =======================================
  // Camera callback
  // =======================================

  const handleAttentionChange =
    useCallback(
      (
        state: AttentionState
      ) => {
        const previous = attentionStateRef.current;
        if (
          isRunningRef.current &&
          phaseRef.current === "focus" &&
          cameraEnabledRef.current &&
          previous === "focused" &&
          state !== "focused"
        ) {
          setDistractionEpisodes((count) => count + 1);
        }
        if (state === "focused") {
          setReminderVisible(false);
        }
        attentionStateRef.current = state;
        setAttentionState(state);
      },
      []
    );

  function updateReminderThreshold(value: number) {
    setReminderSettings((current) => ({
      ...current,
      thresholdSeconds: Math.max(5, Math.min(120, Math.round(value))),
    }));
  }

  function toggleReminderSound() {
    setReminderSettings((current) => ({
      ...current,
      soundEnabled: !current.soundEnabled,
    }));
  }

  function dismissReminder() {
    setReminderVisible(false);
  }

  function toggleCamera() {
    setCameraEnabled(
      (enabled) =>
        !enabled
    );
  }

  // =======================================
  // Attention percentage
  // =======================================

  const totalAttention =
    attentionFocusedSeconds +
    attentionAwaySeconds +
    attentionAbsentSeconds +
    attentionSleepySeconds;

  const attentionPercentage =
    totalAttention > 0
      ? Math.round(
          (attentionFocusedSeconds /
            totalAttention) *
            100
        )
      : 0;

  // =======================================
  // Status
  // =======================================

  function getAttentionText() {
    switch (
      attentionState
    ) {
      case "focused":
        return "Focused";

      case "away":
        return "Looking away";

      case "sleepy":
        return "Looks sleepy";

      case "absent":
        return "Nobody detected";
    }
  }

  // =======================================
  // UI
  // =======================================

  return (
    <main className="app">

      {/* ================================= */}
      {/* Header */}
      {/* ================================= */}

      <header className="header">
        <div>
          <h1>
            Focus AI
          </h1>

          <p>
            Your AI-powered
            focus coach
          </p>
        </div>

        <div className="status">
          <span className="status-dot" />

          {isRunning
            ? "Running"
            : sessionStartedAt
              ? "Paused"
              : "Ready"}
        </div>
      </header>

      {reminderVisible && reminderMessage && isRunning && phase === "focus" && (
        <section className="distraction-reminder" role="status" aria-live="polite">
          <div>
            <strong>Gentle focus reminder</strong>
            <p>{reminderMessage}</p>
          </div>
          <button type="button" onClick={dismissReminder}>Got it</button>
        </section>
      )}

      {/* ================================= */}
      {/* Dashboard */}
      {/* ================================= */}

      <section className="dashboard">

        {/* ================================= */}
        {/* Timer */}
        {/* ================================= */}

        <div className="card timer-card">

          <p className="label">
            {phase === "focus"
              ? "FOCUS SESSION"
              : "BREAK"}
          </p>

          <div className="timer">
            {formatTime(
              timeLeft
            )}
          </div>

          <div className="phase">
            <span className="phase-dot" />

            {phase === "focus"
              ? "Focus"
              : "Break"}
          </div>

          {/* Current timer adjustment */}

          {sessionStartedAt !==
            null && (
            <div className="quick-adjust">
              <button
                type="button"
                className="quick-adjust-button"
                disabled={
                  timeLeft <= 60
                }
                onClick={() =>
                  handleAdjustCurrentPhase(
                    -1
                  )
                }
              >
                &minus;1 min
              </button>

              <button
                type="button"
                className="quick-adjust-button"
                onClick={() =>
                  handleAdjustCurrentPhase(
                    1
                  )
                }
              >
                +1 min
              </button>
            </div>
          )}

          <button
            className="primary-button"
            onClick={
              handleStartPause
            }
          >
            {isRunning
              ? "Pause"
              : sessionStartedAt
                ? "Resume"
                : "Start Session"}
          </button>

          <button
            className="secondary-button"
            onClick={
              handleReset
            }
          >
            Reset
          </button>

          <button
            className="secondary-button"
            onClick={
              handleEndSession
            }
            disabled={
              sessionStartedAt ===
              null
            }
          >
            End Session
          </button>

        </div>

        {/* ================================= */}
        {/* Camera */}
        {/* ================================= */}

        <div className="card camera-card">

          <p className="label">
            CAMERA
          </p>

          <Camera
            enabled={
              cameraEnabled
            }
            onAttentionChange={
              handleAttentionChange
            }
          />

          <button
            className="secondary-button"
            onClick={
              toggleCamera
            }
          >
            {cameraEnabled
              ? "Disable Camera"
              : "Enable Camera"}
          </button>

          <div
            className={`attention-status ${attentionState}`}
          >
            <span className="attention-dot" />

            {getAttentionText()}
          </div>

        </div>

        {/* ================================= */}
        {/* Stats + settings */}
        {/* ================================= */}

        <div className="stats-column">

          {/* Session stats */}

          <div className="card stats-card">

            <p className="label">
              THIS SESSION
            </p>

            <div className="stat">
              <span>
                Focus time
              </span>

              <strong>
                {formatDuration(
                  focusedSeconds
                )}
              </strong>
            </div>

            <div className="stat">
              <span>
                Break time
              </span>

              <strong>
                {formatDuration(
                  breakSeconds
                )}
              </strong>
            </div>

            <div className="stat">
              <span>
                AI focused
              </span>

              <strong>
                {formatDuration(
                  attentionFocusedSeconds
                )}
              </strong>
            </div>

            <div className="stat">
              <span>
                Looking away
              </span>

              <strong>
                {formatDuration(
                  attentionAwaySeconds
                )}
              </strong>
            </div>

            <div className="stat">
              <span>Sleepy</span>
              <strong>{formatDuration(attentionSleepySeconds)}</strong>
            </div>

            <div className="stat">
              <span>Total distracted</span>
              <strong>{formatDuration(distractionSeconds)}</strong>
            </div>

            <div className="stat">
              <span>Distraction episodes</span>
              <strong>{distractionEpisodes}</strong>
            </div>

            <div className="stat">
              <span>Current distraction</span>
              <strong>{formatDuration(currentDistractionSeconds)}</strong>
            </div>

            <div className="stat">
              <span>Longest distraction</span>
              <strong>{formatDuration(longestDistractionSeconds)}</strong>
            </div>

            <div className="stat">
              <span>Reminders shown</span>
              <strong>{remindersShown}</strong>
            </div>

            <div className="stat">
              <span>
                Breaks
              </span>

              <strong>
                {completedBreaks}
              </strong>
            </div>

          </div>

          {/* Duration settings */}

          <div className="card settings-card">

            <p className="label">
              TIMER SETTINGS
            </p>

            <DurationAdjuster
              durations={durations}
              onFocusMinutesChange={handleFocusMinutesChange}
              onBreakMinutesChange={handleBreakMinutesChange}
            />

            <div className="reminder-settings">
              <label htmlFor="reminder-threshold">
                Remind me after
                <strong>{reminderSettings.thresholdSeconds}s</strong>
              </label>
              <input
                id="reminder-threshold"
                type="range"
                min="5"
                max="120"
                step="5"
                value={reminderSettings.thresholdSeconds}
                onChange={(event) => updateReminderThreshold(Number(event.target.value))}
              />
              <label className="sound-setting">
                <input
                  type="checkbox"
                  checked={reminderSettings.soundEnabled}
                  onChange={toggleReminderSound}
                />
                Play reminder sound
              </label>
              <p className="settings-note">
                Reminders appear once per distraction episode. Tracking runs only during an active focus phase while the camera is enabled.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* ================================= */}
      {/* Attention overview */}
      {/* ================================= */}

      <section className="card attention-card">

        <div className="attention-header">
          <div>
            <p className="label">
              AI ATTENTION
            </p>

            <p className="attention-description">
              How your attention was
              classified during focus
              time.
            </p>
          </div>

          <strong className="attention-score">
            {attentionPercentage}%
          </strong>
        </div>

        <div className="attention-list">

          <div className="attention-stat">
            <span>
              Focused
            </span>

            <strong>
              {formatDuration(
                attentionFocusedSeconds
              )}
            </strong>
          </div>

          <div className="attention-stat">
            <span>
              Away
            </span>

            <strong>
              {formatDuration(
                attentionAwaySeconds
              )}
            </strong>
          </div>

          <div className="attention-stat">
            <span>
              Sleepy
            </span>

            <strong>
              {formatDuration(
                attentionSleepySeconds
              )}
            </strong>
          </div>

          <div className="attention-stat">
            <span>Total distracted</span>
            <strong>{formatDuration(distractionSeconds)}</strong>
          </div>

          <div className="attention-stat">
            <span>Reminders</span>
            <strong>{remindersShown}</strong>
          </div>

          <div className="attention-stat">
            <span>
              Absent
            </span>

            <strong>
              {formatDuration(
                attentionAbsentSeconds
              )}
            </strong>
          </div>

        </div>

      </section>

      {/* ================================= */}
      {/* Timeline */}
      {/* ================================= */}

      <section className="card timeline-card">

        <p className="label">
          SESSION TIMELINE
        </p>

        <div className="timeline">

          {sessions.length ===
          0 ? (
            <div className="timeline-empty">
              Start a session to
              begin tracking your
              focus.
            </div>
          ) : (
            sessions
              .slice()
              .reverse()
              .map(
                (
                  session
                ) => (
                  <div
                    className="session-item"
                    key={
                      session.id
                    }
                  >
                    <strong>
                      {new Date(
                        session.startedAt
                      ).toLocaleString()}
                    </strong>

                    <p>
                      Timer focus:{" "}
                      {formatDuration(
                        session.focusedSeconds
                      )}

                      {" · "}

                      AI focused:{" "}
                      {formatDuration(
                        session.attentionFocusedSeconds
                      )}

                      {" · "}

                      Away:{" "}
                      {formatDuration(
                        session.attentionAwaySeconds
                      )}

                      {" · "}

                      Sleepy:{" "}
                      {formatDuration(
                        session.attentionSleepySeconds
                      )}

                      {" · "}
                      Distracted: {formatDuration(session.distractedSeconds ?? 0)}
                      {" · "}
                      Episodes: {session.distractionEpisodes ?? 0}
                      {" · "}
                      Breaks: {session.completedBreaks}
                    </p>
                  </div>
                )
              )
          )}

        </div>

      </section>

    </main>
  );
}

export default App;