# Focus AI

> Your AI-powered focus coach that learns your study rhythm.

Focus AI is a browser-based study assistant combining a configurable focus/break timer with webcam-based attention detection. The product is designed around the idea that focus behavior is feedback: the system observes study behavior and can eventually personalize the student's focus rhythm.

## Features

- Configurable focus and break durations.
- Default timer: 25-minute focus / 5-minute break.
- Slider, +/- controls, and duration presets.
- +/- 1 minute adjustment for the current countdown.
- Start, pause, resume, reset, and end-session controls.
- Webcam-based face and attention detection.
- Approximate head orientation / gaze classification.
- Attention states: focused, looking away, nobody detected, and sleepy/prolonged eye closure.
- Local session history using browser storage.
- Live session statistics.
- Camera enable/disable control.
- Privacy-oriented, browser-side computer-vision architecture.

The broader product specification describes future personalization, a Focus Credit Bank, adaptive focus/break rhythms, reminders, and an AI coach. These are roadmap items rather than all being implemented in the current MVP. 

## Architecture

```text
Browser
|
+-- React + TypeScript UI
|   +-- Timer
|   +-- Camera
|   +-- Attention status
|   +-- Session statistics
|   +-- Duration settings
|
+-- Focus Engine
|   +-- Focus / break state machine
|   +-- Configurable durations
|   +-- Countdown adjustment
|
+-- Vision Pipeline
|   +-- Webcam
|   +-- MediaPipe Face Landmarker
|   +-- Facial landmark analysis
|   +-- Head orientation
|   +-- Eye-openness / sleepy-state detection
|
+-- Browser Storage
    +-- Session records
    +-- Timer settings
```

The product specification identifies React + TypeScript, WebRTC/Camera API, MediaPipe/OpenCV, Firebase/Supabase for future backend work, and Vercel as deployment resources.

## Requirements

- Node.js and npm
- Git
- Modern browser with webcam support
- Webcam for attention detection
- Internet access for initial dependency/model loading

## Installation

### 1. Clone

```bash
git clone https://github.com/cuongnguyenhuy1771-cmd/focus-ai.git
cd focus-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run development server

```bash
npm run dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173/
```

### 4. Enable the camera

Allow camera permission when the browser asks. Then enable the camera in Focus AI and position the face clearly in view.

## Production build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

For a standard Vite project, the production output is `dist/`.

## Deployment with Vercel

The product plan lists Vercel as the intended deployment platform.

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Confirm the project root.
4. Confirm the Vite framework/build settings.
5. Use the project's normal build command.
6. Deploy.
7. Open the HTTPS production URL.
8. Test camera permission and MediaPipe detection on the deployed site.

### HTTPS

Production webcam access should use HTTPS. Test the camera on the actual deployed URL rather than only on localhost.

## First-run checklist

- [ ] Page loads without fatal console errors.
- [ ] Timer displays 25:00 / 5:00 by default.
- [ ] Focus duration can be changed.
- [ ] Break duration can be changed.
- [ ] Start/pause/resume works.
- [ ] Camera permission works.
- [ ] Face detection works.
- [ ] Looking-away state works.
- [ ] Prolonged eye closure can enter the sleepy state.
- [ ] Ending a session creates a history record.
- [ ] Refreshing preserves stored settings/history.

## Data and privacy

The intended architecture performs webcam analysis in the browser and stores session information locally. The product specification explicitly calls for local processing where possible and a clear camera toggle/privacy notice.

Raw webcam video should not be treated as session-history data. The application instead records derived numerical/state information such as focus time and attention classifications.

The sleepy state is a computer-vision signal based on prolonged eye closure; it is not a medical sleep diagnosis.

## Project structure

```text
focus-ai/
├── package.json
├── index.html
├── README.md
├── TECHNICAL_DOCUMENTATION.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── components/
    │   ├── Camera.tsx
    │   └── DurationAdjuster.tsx
    ├── data/
    │   ├── sessionStore.ts
    │   └── settingsStore.ts
    ├── focus/
    │   └── focusEngine.ts
    └── vision/
        ├── attention.ts
        └── detector.ts
```

## Roadmap

### Phase 1 — MVP
Focus detection, focus/break system, and basic tracking.

### Phase 2 — Personalization
Adaptive rhythm, Focus Credit Bank, and weekly insights.

### Phase 3 — AI Coach
Long-term patterns, personalized recommendations, and schedule integration.

## Troubleshooting

### `npm install` fails

Check:

```bash
node --version
npm --version
```

Then reinstall dependencies:

```bash
rm -rf node_modules
npm install
```

### Camera does not start

Check browser camera permissions, confirm another application is not using the webcam, and verify that the site is running on localhost or HTTPS.

### MediaPipe does not load

Check the browser console and network tab. The current browser implementation requires the MediaPipe assets/model to be reachable.

### Build fails

Run:

```bash
npm run build
```

Fix the first TypeScript/Vite error reported by the build before deploying.

## Development principle

The product concept is organized around:

```text
Observe -> Analyze -> Adapt -> Learn
```

The long-term goal is to move from forced productivity toward self-regulation: Focus AI should learn when a student tends to lose focus and eventually use those patterns to personalize the study rhythm.
