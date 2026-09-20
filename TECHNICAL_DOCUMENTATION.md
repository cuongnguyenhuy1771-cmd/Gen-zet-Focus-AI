# Focus AI — Technical Documentation

## 1. Purpose

This document explains how to install, configure, run, test, build, and deploy the current Focus AI web application.

It is intended for developers, contributors, evaluators, and deployment administrators.

The product specification describes Focus AI as a camera-powered AI focus coach that observes study behavior, learns a student's focus rhythm, and eventually adapts the focus/break cycle.

---

## 2. System overview

Focus AI is currently a client-side React + TypeScript application.

```text
                 +-------------------------+
                 |       Web Browser       |
                 |                         |
                 |  React / TypeScript     |
                 |          |              |
                 |    +-----+-----+        |
                 |    |           |        |
                 |  Timer      Camera      |
                 |    |           |        |
                 | Focus      MediaPipe    |
                 | Engine   Face Landmarker|
                 |    |           |        |
                 |    +-----+-----+        |
                 |          |              |
                 |     Session State       |
                 |          |              |
                 |      localStorage       |
                 +-------------------------+
```

The current MVP does not require a traditional backend for its basic timer, camera analysis, or local session-history functionality.

The original product plan lists Firebase/Supabase as possible future backend technologies for storing focus sessions and user data.

---

## 3. Technology stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Computer vision

- MediaPipe Tasks Vision
- Face Landmarker
- Browser webcam APIs

### Browser APIs

- `navigator.mediaDevices.getUserMedia()`
- `localStorage`
- `requestAnimationFrame()`
- Web Audio API for sound alerts

### Deployment

Vercel is identified as a deployment resource in the product specification.

---

## 4. Requirements

### Hardware

- Computer with webcam.
- Sufficient CPU/GPU capability for real-time browser inference.
- Stable internet connection for initial model/dependency loading.

### Software

- Node.js
- npm
- Git
- Modern browser with webcam support.

---

## 5. Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/cuongnguyenhuy1771-cmd/focus-ai.git
cd focus-ai
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Start development mode

```bash
npm run dev
```

Vite will print the local development URL, normally similar to:

```text
http://localhost:5173/
```

Open that URL in a supported browser.

---

## 6. Development workflow

Recommended cycle:

```text
Edit source
    |
npm run dev
    |
Test in browser
    |
Check browser console
    |
npm run build
    |
Fix TypeScript/build errors
    |
Commit changes
    |
Deploy
```

Computer-vision changes should be tested with the actual webcam, not only through TypeScript compilation.

---

## 7. Application architecture

### `App.tsx`

`App.tsx` coordinates:

- Current focus/break phase.
- Countdown.
- Session lifecycle.
- Focus and break statistics.
- Camera state.
- Current attention state.
- Saved session history.
- Configurable durations.
- Integration between the timer and computer-vision state.

The one-second timer interval is intentionally kept dependent on `isRunning` rather than rapidly changing camera state. Attention values are read through refs so camera updates do not repeatedly recreate the interval.

### Timer state

```text
phase
  |
  +-- focus
  +-- break

timeLeft
isRunning
```

### Phase transition

```text
Focus -> Break
Break -> Focus
```

The phase transition is kept outside the `setTimeLeft` updater so state updaters remain pure.

---

## 8. Focus engine

File:

```text
src/focus/focusEngine.ts
```

The focus engine contains the timer's domain logic.

### Focus phases

```ts
export type FocusPhase =
  | "focus"
  | "break";
```

### Duration settings

```ts
export interface DurationSettings {
  focusMinutes: number;
  breakMinutes: number;
}
```

### Defaults

```text
Focus: 25 minutes
Break: 5 minutes
```

### Bounds

```text
Focus: 1–120 minutes
Break: 1–60 minutes
```

The engine also exposes focus and break presets.

### Countdown adjustment

Changing a configured phase length applies the difference to the existing countdown rather than blindly restarting it.

Example:

```text
Configured focus: 25 min
Current remaining: 18:00
New focus setting: 30 min

New remaining: 23:00
```

The same principle works when reducing the duration, with a lower bound preventing negative countdown values.

### Temporary countdown adjustment

The running clock supports:

```text
-1 minute
+1 minute
```

These change only the current countdown. They do not modify the configured duration for future phases.

---

## 9. Duration settings

File:

```text
src/components/DurationAdjuster.tsx
```

The duration component provides:

- Focus duration slider.
- Break duration slider.
- Minus/plus controls.
- Preset buttons.
- Current duration display.

The component delegates state changes to `App.tsx`.

Settings are persisted through:

```text
src/data/settingsStore.ts
```

This allows duration settings to survive a browser refresh.

---

## 10. Session storage

File:

```text
src/data/sessionStore.ts
```

A session record contains data such as:

- Session ID.
- Start time.
- End time.
- Focused seconds.
- Break seconds.
- Completed breaks.
- AI-focused time.
- Looking-away time.
- No-face time.
- Sleepy time, when included by the current schema.

The current architecture stores session information in browser storage.

Therefore:

```text
Browser A
  +-- local session history

Browser B
  +-- separate local session history
```

There is currently no cross-device synchronization layer.

Account infrastructure and multi-device synchronization are roadmap items rather than core MVP functionality.

---

## 11. Camera pipeline

File:

```text
src/components/Camera.tsx
```

The camera pipeline is:

```text
Enable camera
     |
Request getUserMedia()
     |
Start <video>
     |
Load MediaPipe Face Landmarker
     |
Read video frames
     |
Run face-landmark detection
     |
Classify attention
     |
Send attention state to App
```

The camera requests video only; audio capture is disabled.

The intended camera configuration is approximately:

```text
640 × 480
front-facing/user camera
audio: false
```

---

## 12. MediaPipe detection

File:

```text
src/vision/detector.ts
```

The current architecture uses MediaPipe Face Landmarker in video mode.

The model produces facial landmarks which are passed to the attention classifier.

The earlier standalone prototype used MediaPipe in the browser and a BlazeFace detector. It processed the camera stream locally and did not save session video.

The current application moves that functionality into reusable TypeScript modules.

---

## 13. Attention classification

File:

```text
src/vision/attention.ts
```

The classifier converts facial-landmark data into application-level states.

```text
focused
away
absent
sleepy
```

### Focused

A face is detected and estimated head orientation remains within the configured attention threshold.

### Away

A face is detected but estimated head orientation indicates that the user is looking away.

### Absent

A usable face cannot be detected.

### Sleepy

The face is present and eye landmarks indicate prolonged eye closure.

The sleepy state is a computer-vision behavioral signal, not a medical diagnosis.

---

## 14. Eye-closure detection

Face Landmarker supplies many facial landmarks, allowing the application to estimate eye openness from eyelid geometry.

A common metric is the Eye Aspect Ratio (EAR):

```text
EAR =
vertical eye distances
---------------------
horizontal eye distance
```

The value can be compared with a configured eye-closure threshold.

The current integration uses values around:

```text
sleepyEyeThreshold = 0.16
sleepyDurationMs   = 2500
```

Conceptually:

```text
Eyes sufficiently closed
        |
Continuous closure timer starts
        |
Closure exceeds threshold
        |
attention = sleepy
```

The sleepy timer should reset when the eyes open again or the face disappears.

---

## 15. Sleepy alarm

The sleepy alarm should be implemented above the vision classifier rather than firing directly from camera frames.

Recommended sequence:

```text
Prolonged eye closure
        |
~2.5 second sleepy threshold
        |
sleepy state
        |
60 seconds continuously sleepy
        |
sound alarm
```

The alarm should trigger once per continuous sleepy episode and reset when the user returns to another attention state.

The earlier standalone prototype already uses the Web Audio API to create browser beeps with an oscillator and gain node.

---

## 16. Browser audio restrictions

Browsers may restrict automatic audio playback until the user interacts with the page.

For reliable alarms:

1. The user starts a session using a button.
2. The application initializes/resumes an `AudioContext`.
3. The alarm uses that audio context.

If necessary:

```ts
audioContext.resume();
```

The implementation should fail gracefully if audio is unavailable.

---

## 17. Data flow

### Camera-to-attention

```text
Webcam
  |
HTMLVideoElement
  |
MediaPipe Face Landmarker
  |
Face landmarks
  |
attention.ts
  |
AttentionState
  |
App.tsx
```

### Timer

```text
DurationSettings
      |
Focus Engine
      |
timeLeft
      |
1-second interval
      |
phase transition
      |
Focus / Break
```

### Session

```text
Start Session
     |
Live counters
     |
Pause / Resume
     |
End Session
     |
SessionRecord
     |
localStorage
     |
Session Timeline
```

---

## 18. Privacy model

The product specification calls for:

- Real-time camera focus detection.
- Local processing where possible.
- Clear camera toggle.
- Privacy notice.

The intended architecture is:

```text
Raw camera frames
       |
Real-time local analysis
       |
Derived state
       |
Session statistics
```

Raw webcam video should not be treated as session-history data.

Any future backend implementation must explicitly document what data is transmitted and why.

---

## 19. Production build

Run:

```bash
npm run build
```

The build should complete without TypeScript or Vite errors.

Preview locally:

```bash
npm run preview
```

For a standard Vite application, the production output is `dist/`.

---

## 20. Vercel deployment

The product plan identifies Vercel as a deployment resource.

Recommended process:

```text
GitHub repository
       |
Vercel project
       |
Install dependencies
       |
npm run build
       |
Deploy Vite output
       |
HTTPS application
```

Steps:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Confirm the project root.
4. Confirm Vite is detected.
5. Confirm the build command.
6. Confirm the output directory.
7. Deploy.
8. Open the HTTPS URL.
9. Test camera permission and MediaPipe detection.

---

## 21. Deployment verification

### Application

```text
[ ] Page loads
[ ] No fatal console errors
[ ] CSS loads
[ ] React application mounts
```

### Timer

```text
[ ] Default focus duration works
[ ] Default break duration works
[ ] Start works
[ ] Pause works
[ ] Resume works
[ ] Reset works
[ ] End session works
[ ] Focus -> Break transition works
[ ] Break -> Focus transition works
```

### Duration controls

```text
[ ] Slider works
[ ] Minus works
[ ] Plus works
[ ] Presets work
[ ] Current countdown changes correctly
[ ] Next phase uses configured duration
[ ] Settings survive refresh
```

### Camera

```text
[ ] Permission prompt works
[ ] Camera can be enabled
[ ] Camera can be disabled
[ ] Face detection works
[ ] Looking away works
[ ] No-face state works
[ ] Sleepy state can be detected
```

### Storage

```text
[ ] Session can be ended
[ ] Session appears in timeline
[ ] Refresh preserves history
[ ] Invalid storage data does not crash the app
```

---

## 22. Troubleshooting

### Camera permission denied

Check the browser's site permissions.

Local development:

```text
http://localhost:5173
```

Production:

```text
https://your-domain.example
```

### Model loading failure

Check the browser Console and Network tabs.

Verify that MediaPipe model/WASM assets are reachable.

### Detection instability

Possible causes:

- Poor lighting.
- Face too far from camera.
- Strong side angle.
- Camera movement.
- Face occlusion.
- Low camera quality.
- Incorrect attention threshold.

### Too many sleepy detections

Increase the continuous-eye-closure duration.

For example:

```text
2500 ms -> 4000 ms
```

Thresholds should be evaluated against real test sessions before being treated as stable product parameters.

---

## 23. Performance

Real-time face-landmark inference can be computationally expensive if executed synchronously on the browser's main thread.

A future production optimization is:

```text
Main thread
    |
    +-- React UI
    +-- Timer
    |
    v
Web Worker
    |
    v
MediaPipe inference
```

This can reduce interference between computer-vision inference and UI rendering.

The earlier prototype also avoided processing the same video frame repeatedly by tracking the video's current time.

---

## 24. Security

The application should:

- Request only necessary permissions.
- Avoid uploading raw webcam frames unless a future feature explicitly requires it.
- Avoid storing raw video in localStorage.
- Validate parsed localStorage data.
- Use HTTPS in production.
- Review/pin third-party model dependencies for production releases.
- Never put private API credentials in frontend source code.

Anything bundled into a frontend application should be treated as publicly accessible.

---

## 25. Current limitations

The product specification places the following outside the initial MVP:

- Advanced emotion/engagement scoring.
- Custom scheduling.
- Advanced analytics and weekly reports.
- Social/leaderboard functionality.
- Third-party integrations.
- Account infrastructure and multi-device synchronization.
- Advanced gamification.
- Offline/background processing.

The current attention system estimates behavioral states from camera landmarks. It does not establish a clinical or medical assessment of sleep, attention, or cognitive state.

---

## 26. Roadmap

```text
Phase 1 — MVP
|
+-- Focus detection
+-- Timer
+-- Basic tracking
        |
        v
Phase 2 — Personalization
|
+-- Adaptive rhythm
+-- Focus Credit Bank
+-- Weekly insights
        |
        v
Phase 3 — AI Coach
|
+-- Long-term patterns
+-- Personalized recommendations
+-- Schedule integration
```

This follows the supplied Focus AI product roadmap.

---

## 27. Release procedure

Before each release:

```bash
git pull
npm install
npm run build
npm run preview
```

Then test:

1. Timer.
2. Camera.
3. Attention states.
4. Sleepy detection.
5. Sleepy alarm.
6. Session storage.
7. Responsive layout.
8. Production deployment.
9. Production camera permission.

A release should not be considered complete until both the production build and webcam functionality have been tested.

---

## 28. Repository structure

```text
focus-ai/
|
+-- package.json
+-- index.html
+-- README.md
+-- TECHNICAL_DOCUMENTATION.md
|
+-- src/
    +-- main.tsx
    +-- App.tsx
    +-- App.css
    |
    +-- components/
    |   +-- Camera.tsx
    |   +-- DurationAdjuster.tsx
    |
    +-- data/
    |   +-- sessionStore.ts
    |   +-- settingsStore.ts
    |
    +-- focus/
    |   +-- focusEngine.ts
    |
    +-- vision/
        +-- attention.ts
        +-- detector.ts
```

## 29. Summary

The current product is a browser-first application built around:

```text
React
+
TypeScript
+
Vite
+
MediaPipe
+
Webcam APIs
+
local browser storage
```

The central product loop is:

```text
Observe -> Analyze -> Adapt -> Learn
```

The current MVP primarily implements observation, analysis, timer control, and basic session tracking. Adaptive learning and the full AI-coach functionality remain future development stages.
