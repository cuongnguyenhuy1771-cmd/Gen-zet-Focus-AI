import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

let faceLandmarker:
  | FaceLandmarker
  | null = null;

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) {
    return faceLandmarker;
  }

  const vision =
    await FilesetResolver.forVisionTasks(
      WASM_URL
    );

  faceLandmarker =
    await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            MODEL_URL,

          delegate: "GPU",
        },

        runningMode: "VIDEO",

        numFaces: 1,

        minFaceDetectionConfidence:
          0.5,

        minFacePresenceConfidence:
          0.5,

        minTrackingConfidence:
          0.5,

        outputFaceBlendshapes: false,

        outputFacialTransformationMatrixes:
          false,
      }
    );

  return faceLandmarker;
}

export function detectFaceLandmarks(
  video: HTMLVideoElement,
  timestamp: number
): FaceLandmarkerResult | null {
  if (!faceLandmarker) {
    return null;
  }

  try {
    return faceLandmarker.detectForVideo(
      video,
      timestamp
    );
  } catch (error) {
    console.error(
      "Face landmark detection error:",
      error
    );

    return null;
  }
}