import type {
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type AttentionState =
  | "focused"
  | "away"
  | "sleepy"
  | "absent";

export interface AttentionResult {
  state: AttentionState;

  yaw: number;

  pitch: number;

  hasFace: boolean;

  leftEyeRatio: number;

  rightEyeRatio: number;

  eyeRatio: number;
}

export interface AttentionSettings {
  sensitivity: number;

  countLookingDown: boolean;

  sleepyEyeThreshold: number;

  sleepyDurationMs: number;
}

interface Point {
  x: number;
  y: number;
}

// =========================================
// Eye landmarks
//
// MediaPipe Face Landmarker provides dense
// landmarks around both eyes.
//
// These are representative points around
// each eye used to calculate an EAR-like
// openness measurement.
// =========================================

const LEFT_EYE = {
  left: 33,

  right: 133,

  top: 159,

  bottom: 145,

  topInner: 160,

  bottomInner: 144,

  topOuter: 158,

  bottomOuter: 153,
};

const RIGHT_EYE = {
  left: 362,

  right: 263,

  top: 386,

  bottom: 374,

  topInner: 387,

  bottomInner: 373,

  topOuter: 385,

  bottomOuter: 380,
};

// =========================================
// Sleep state
//
// This persists between frames so that
// a short blink does not become "sleepy".
// =========================================

let eyesClosedSince:
  number | null = null;

// =========================================
// Reset
// =========================================

export function resetAttentionState() {
  eyesClosedSince = null;
}

// =========================================
// Distance
// =========================================

function distance(
  a: Point,
  b: Point
) {
  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  return Math.sqrt(
    dx * dx +
      dy * dy
  );
}

// =========================================
// Eye openness
//
// EAR-like measurement:
//
// vertical eye opening
// --------------------
// horizontal eye width
//
// Multiple vertical pairs are averaged
// to make the measurement less dependent
// on one noisy landmark.
// =========================================

function calculateEyeRatio(
  landmarks: Point[],
  eye: typeof LEFT_EYE
) {
  const left =
    landmarks[eye.left];

  const right =
    landmarks[eye.right];

  const top =
    landmarks[eye.top];

  const bottom =
    landmarks[eye.bottom];

  const topInner =
    landmarks[
      eye.topInner
    ];

  const bottomInner =
    landmarks[
      eye.bottomInner
    ];

  const topOuter =
    landmarks[
      eye.topOuter
    ];

  const bottomOuter =
    landmarks[
      eye.bottomOuter
    ];

  if (
    !left ||
    !right ||
    !top ||
    !bottom ||
    !topInner ||
    !bottomInner ||
    !topOuter ||
    !bottomOuter
  ) {
    return 1;
  }

  const width =
    distance(
      left,
      right
    );

  if (width < 0.0001) {
    return 1;
  }

  const vertical1 =
    distance(
      top,
      bottom
    );

  const vertical2 =
    distance(
      topInner,
      bottomInner
    );

  const vertical3 =
    distance(
      topOuter,
      bottomOuter
    );

  const verticalAverage =
    (vertical1 +
      vertical2 +
      vertical3) /
    3;

  return (
    verticalAverage /
    width
  );
}

// =========================================
// Head pose
//
// Uses the same basic normalized geometry
// as the previous implementation.
// =========================================

function calculatePose(
  landmarks: Point[]
) {
  const nose =
    landmarks[1];

  const leftEye =
    landmarks[33];

  const rightEye =
    landmarks[263];

  const leftEar =
    landmarks[234];

  const rightEar =
    landmarks[454];

  const mouth =
    landmarks[13];

  if (
    !nose ||
    !leftEye ||
    !rightEye ||
    !leftEar ||
    !rightEar ||
    !mouth
  ) {
    return {
      yaw: 0,
      pitch: 0,
    };
  }

  const earSpan =
    rightEar.x -
    leftEar.x;

  let yaw=0;

  if (
    Math.abs(earSpan) >
    0.02
  ) {
    yaw =
      ((nose.x -
        leftEar.x) /
        earSpan -
        0.5) *
      2;
  } else {
    const eyeMid =
      (leftEye.x +
        rightEye.x) /
      2;

    const eyeDistance =
      Math.max(
        0.0001,
        Math.abs(
          rightEye.x -
            leftEye.x
        )
      );

    yaw =
      (nose.x -
        eyeMid) /
      eyeDistance;
  }

  const eyeMidY =
    (leftEye.y +
      rightEye.y) /
    2;

  const height =
    mouth.y -
    eyeMidY;

  const pitch =
    Math.abs(height) >
    0.01
      ? ((nose.y -
          eyeMidY) /
          height -
          0.5) *
        2
      : 0;

  return {
    yaw: Math.max(
      -1.5,
      Math.min(1.5, yaw)
    ),

    pitch: Math.max(
      -1.5,
      Math.min(1.5, pitch)
    ),
  };
}

// =========================================
// Main classifier
// =========================================

export function classifyAttention(
  result:
    | FaceLandmarkerResult
    | null,

  settings: AttentionSettings,

  yawOffset = 0,

  pitchOffset = 0
): AttentionResult {
  if (
    !result ||
    !result.faceLandmarks ||
    result.faceLandmarks.length ===
      0
  ) {
    eyesClosedSince = null;

    return {
      state: "absent",

      yaw: 0,

      pitch: 0,

      hasFace: false,

      leftEyeRatio: 0,

      rightEyeRatio: 0,

      eyeRatio: 0,
    };
  }

  const landmarks =
    result.faceLandmarks[0];

  if (
    !landmarks ||
    landmarks.length <
      400
  ) {
    eyesClosedSince = null;

    return {
      state: "absent",

      yaw: 0,

      pitch: 0,

      hasFace: false,

      leftEyeRatio: 0,

      rightEyeRatio: 0,

      eyeRatio: 0,
    };
  }

  const pose =
    calculatePose(
      landmarks
    );

  const yaw =
    pose.yaw;

  const pitch =
    pose.pitch;

  const leftEyeRatio =
    calculateEyeRatio(
      landmarks,
      LEFT_EYE
    );

  const rightEyeRatio =
    calculateEyeRatio(
      landmarks,
      RIGHT_EYE
    );

  const eyeRatio =
    (leftEyeRatio +
      rightEyeRatio) /
    2;

  // =====================================
  // Sleep detection
  //
  // Only trigger after continuous
  // eye closure.
  // =====================================

  const eyesClosed =
    eyeRatio <
    settings.sleepyEyeThreshold;

  const now =
    performance.now();

  if (eyesClosed) {
    if (
      eyesClosedSince ===
      null
    ) {
      eyesClosedSince = now;
    }
  } else {
    eyesClosedSince = null;
  }

  const sleepy =
    eyesClosed &&
    eyesClosedSince !==
      null &&
    now -
      eyesClosedSince >=
      settings.sleepyDurationMs;

  if (sleepy) {
    return {
      state: "sleepy",

      yaw,

      pitch,

      hasFace: true,

      leftEyeRatio,

      rightEyeRatio,

      eyeRatio,
    };
  }

  // =====================================
  // Looking left/right
  // =====================================

  const yawDifference =
    Math.abs(
      yaw -
        yawOffset
    );

  const yawThreshold =
    settings.sensitivity /
    100;

  if (
    yawDifference >
    yawThreshold
  ) {
    return {
      state: "away",

      yaw,

      pitch,

      hasFace: true,

      leftEyeRatio,

      rightEyeRatio,

      eyeRatio,
    };
  }

  // =====================================
  // Optional looking up/down
  // =====================================

  if (
    settings.countLookingDown &&
    Math.abs(
      pitch -
        pitchOffset
    ) > 0.5
  ) {
    return {
      state: "away",

      yaw,

      pitch,

      hasFace: true,

      leftEyeRatio,

      rightEyeRatio,

      eyeRatio,
    };
  }

  return {
    state: "focused",

    yaw,

    pitch,

    hasFace: true,

    leftEyeRatio,

    rightEyeRatio,

    eyeRatio,
  };
}