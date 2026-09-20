import type {
  ChangeEvent,
} from "react";

import {
  BREAK_PRESETS,
  FOCUS_PRESETS,
  MAX_BREAK_MINUTES,
  MAX_FOCUS_MINUTES,
  MIN_BREAK_MINUTES,
  MIN_FOCUS_MINUTES,
  type DurationSettings,
} from "../focus/focusEngine";

interface DurationRowProps {
  label: string;

  minutes: number;

  min: number;

  max: number;

  presets: number[];

  onChange: (
    minutes: number
  ) => void;
}

function DurationRow({
  label,
  minutes,
  min,
  max,
  presets,
  onChange,
}: DurationRowProps) {
  return (
    <div className="duration-row">
      <div className="duration-head">
        <span>
          {label}
        </span>

        <strong>
          {minutes} min
        </strong>
      </div>

      <div className="duration-controls">
        <button
          type="button"
          className="step-button"
          aria-label={`Decrease ${label} by one minute`}
          disabled={
            minutes <= min
          }
          onClick={() =>
            onChange(
              minutes - 1
            )
          }
        >
          &minus;
        </button>

        <input
          className="duration-range"
          type="range"
          aria-label={`${label} in minutes`}
          min={min}
          max={max}
          step={1}
          value={minutes}
          onChange={(
            event: ChangeEvent<HTMLInputElement>
          ) =>
            onChange(
              Number(
                event.target.value
              )
            )
          }
        />

        <button
          type="button"
          className="step-button"
          aria-label={`Increase ${label} by one minute`}
          disabled={
            minutes >= max
          }
          onClick={() =>
            onChange(
              minutes + 1
            )
          }
        >
          +
        </button>
      </div>

      <div className="duration-presets">
        {presets.map(
          (preset) => (
            <button
              type="button"
              key={preset}
              className={
                preset ===
                minutes
                  ? "preset-button active"
                  : "preset-button"
              }
              onClick={() =>
                onChange(
                  preset
                )
              }
            >
              {preset}m
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface DurationAdjusterProps {
  durations: DurationSettings;

  onFocusMinutesChange: (
    minutes: number
  ) => void;

  onBreakMinutesChange: (
    minutes: number
  ) => void;
}

function DurationAdjuster({
  durations,
  onFocusMinutesChange,
  onBreakMinutesChange,
}: DurationAdjusterProps) {
  return (
    <div className="duration-adjuster">
      <DurationRow
        label="Focus length"
        minutes={
          durations.focusMinutes
        }
        min={
          MIN_FOCUS_MINUTES
        }
        max={
          MAX_FOCUS_MINUTES
        }
        presets={
          FOCUS_PRESETS
        }
        onChange={
          onFocusMinutesChange
        }
      />

      <DurationRow
        label="Break length"
        minutes={
          durations.breakMinutes
        }
        min={
          MIN_BREAK_MINUTES
        }
        max={
          MAX_BREAK_MINUTES
        }
        presets={
          BREAK_PRESETS
        }
        onChange={
          onBreakMinutesChange
        }
      />
    </div>
  );
}

export default DurationAdjuster;