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

    setAttentionSleepySeconds(
      0
    );

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
        setAttentionState(
          state
        );
      },
      []
    );

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
              <span>
                Sleepy
              </span>

              <strong>
                {formatDuration(
                  attentionSleepySeconds
                )}
              </strong>
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
              durations={
                durations
              }
              onFocusMinutesChange={
                handleFocusMinutesChange
              }
              onBreakMinutesChange={
                handleBreakMinutesChange
              }
            />

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

                      Breaks:{" "}
                      {
                        session.completedBreaks
                      }
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