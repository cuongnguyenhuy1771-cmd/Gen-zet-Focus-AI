import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  detectFaceLandmarks,
  loadFaceLandmarker,
} from "../vision/detector";

import {
  classifyAttention,
  resetAttentionState,
  type AttentionState,
} from "../vision/attention";

interface CameraProps {
  enabled: boolean;

  onAttentionChange: (
    state: AttentionState
  ) => void;
}

function Camera({
  enabled,
  onAttentionChange,
}: CameraProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const animationRef =
    useRef<number | null>(
      null
    );

  const lastVideoTime =
    useRef(-1);

  const yawRef =
    useRef(0);

  const pitchRef =
    useRef(0);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!enabled) {
      resetAttentionState();

      onAttentionChange(
        "absent"
      );

      return;
    }

    let cancelled = false;

    resetAttentionState();

    async function startCamera() {
      try {
        setError(null);

        // =================================
        // Load Face Landmarker
        // =================================

        await loadFaceLandmarker();

        if (cancelled) {
          return;
        }

        // =================================
        // Camera
        // =================================

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                width: {
                  ideal: 640,
                },

                height: {
                  ideal: 480,
                },

                facingMode:
                  "user",
              },

              audio: false,
            }
          );

        if (cancelled) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          return;
        }

        streamRef.current =
          stream;

        const video =
          videoRef.current;

        if (video === null) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          streamRef.current =
            null;

          return;
        }

        const videoElement: HTMLVideoElement =
          video;

        videoElement.srcObject =
          stream;

        await videoElement.play();

        if (cancelled) {
          return;
        }

        // =================================
        // Detection loop
        // =================================

        function detectionLoop(
          timestamp: number
        ) {
          if (cancelled) {
            return;
          }

          if (
            videoElement.readyState >=
              2 &&
            videoElement.currentTime !==
              lastVideoTime.current
          ) {
            lastVideoTime.current =
              videoElement.currentTime;

            const landmarks =
              detectFaceLandmarks(
                videoElement,
                timestamp
              );

            const result =
              classifyAttention(
                landmarks,
                {
                  sensitivity: 22,

                  countLookingDown:
                    true,

                  sleepyEyeThreshold:
                    0.16,

                  sleepyDurationMs:
                    2500,
                },

                yawRef.current,

                pitchRef.current
              );

            // =================================
            // Smooth head movement
            // =================================

            if (
              result.hasFace
            ) {
              yawRef.current +=
                (result.yaw -
                  yawRef.current) *
                0.35;

              pitchRef.current +=
                (result.pitch -
                  pitchRef.current) *
                0.35;
            }

            onAttentionChange(
              result.state
            );
          }

          animationRef.current =
            requestAnimationFrame(
              detectionLoop
            );
        }

        animationRef.current =
          requestAnimationFrame(
            detectionLoop
          );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Camera error:",
          err
        );

        setError(
          "Unable to start the camera or face landmarker."
        );

        onAttentionChange(
          "absent"
        );
      }
    }

    startCamera();

    // =================================
    // Cleanup
    // =================================

    return () => {
      cancelled = true;

      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );

        animationRef.current =
          null;
      }

      if (
        streamRef.current !==
        null
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        streamRef.current =
          null;
      }

      lastVideoTime.current =
        -1;

      yawRef.current = 0;

      pitchRef.current = 0;

      resetAttentionState();

      onAttentionChange(
        "absent"
      );
    };
  }, [
    enabled,
    onAttentionChange,
  ]);

  return (
    <div>
      <div className="camera-preview">
        {enabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="camera-placeholder">
            <div className="camera-icon">
              ◉
            </div>

            <p>
              Camera is off
            </p>

            <span>
              Enable the camera to
              track your focus.
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="camera-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default Camera;