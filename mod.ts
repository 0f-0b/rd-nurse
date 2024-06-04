import {
  checkHolds,
  type CheckHoldsResult,
  checkOneshotBeats,
  type CheckOneshotBeatsResult,
} from "./beat.ts";
import {
  type CheckOneshotCuesResult,
  type ExpectedBeat,
  playOneshotCues,
  type PlayOneshotCuesOptions,
  type PlayOneshotCuesResult,
} from "./cue.ts";
import {
  type CueSource,
  type CueType,
  type Level,
  type OneshotBeat,
  type OneshotCue,
  parseLevel,
} from "./level.ts";
import {
  type BarAndBeat,
  barToBeat,
  beatToBar,
  beatToTime,
  type CpbChange,
  type TempoChange,
  timeToBeat,
} from "./time.ts";

export {
  type BarAndBeat,
  barToBeat,
  beatToBar,
  beatToTime,
  checkHolds,
  type CheckHoldsResult,
  checkOneshotBeats,
  type CheckOneshotBeatsResult,
  type CheckOneshotCuesResult,
  type CpbChange,
  type CueSource,
  type CueType,
  type ExpectedBeat,
  type Level,
  type OneshotBeat,
  type OneshotCue,
  parseLevel,
  playOneshotCues,
  type PlayOneshotCuesOptions,
  type PlayOneshotCuesResult,
  type TempoChange,
  timeToBeat,
};
export type CheckLevelOptions = PlayOneshotCuesOptions;
export type CheckLevelResult =
  & CheckOneshotCuesResult
  & CheckOneshotBeatsResult
  & CheckHoldsResult;

export function checkLevel(
  level: Level,
  options?: CheckLevelOptions,
): CheckLevelResult {
  const { expected, result: checkOneshotCuesResult } = playOneshotCues(
    level.oneshotCues,
    options,
  );
  const checkOneshotBeatsResult = checkOneshotBeats(
    level.oneshotBeats,
    expected,
  );
  const checkHoldsResult = checkHolds(level.holds);
  return {
    ...checkOneshotCuesResult,
    ...checkOneshotBeatsResult,
    ...checkHoldsResult,
  };
}

export function formatTime({ bar, beat }: BarAndBeat): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}
