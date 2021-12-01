import type { CheckHoldsResult, CheckOneshotBeatsResult } from "./beat.ts";
import { checkHolds, checkOneshotBeats } from "./beat.ts";
import type { CheckOneshotCuesResult, PlayOneshotCuesOptions } from "./cue.ts";
import { playOneshotCues } from "./cue.ts";
import type { Level } from "./level.ts";
import { parseLevel } from "./level.ts";
import type { TimeCache } from "./time.ts";

export type {
  CheckHoldsResult,
  CheckOneshotBeatsResult,
  CheckOneshotCuesResult,
  Level,
  PlayOneshotCuesOptions,
  TimeCache,
};
export { checkHolds, checkOneshotBeats, parseLevel, playOneshotCues };
export type { ExpectedBeat, PlayOneshotCuesResult } from "./cue.ts";
export type { CueSource, CueType, OneshotBeat, OneshotCue } from "./level.ts";
export { barToBeat, beatToBar, beatToTime, timeToBeat } from "./time.ts";

export type CheckLevelOptions = PlayOneshotCuesOptions;

export interface CheckLevelResult
  extends CheckOneshotCuesResult, CheckOneshotBeatsResult, CheckHoldsResult {}

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
  const checkHoldsResult = checkHolds(
    level.hits,
    level.holds,
  );
  return {
    ...checkOneshotCuesResult,
    ...checkOneshotBeatsResult,
    ...checkHoldsResult,
  };
}

export function formatTime([bar, beat]: [number, number]): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}
