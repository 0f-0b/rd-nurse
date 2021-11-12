import type { CheckHoldsResult, CheckOneshotBeatsResult } from "./beat.ts";
import { checkHolds, checkOneshotBeats } from "./beat.ts";
import type { CheckOneshotCuesResult, PlayOneshotCuesOptions } from "./cue.ts";
import { playOneshotCues } from "./cue.ts";
import { parseLevel } from "./level.ts";
import type { TimeCache } from "./time.ts";

export type {
  CheckHoldsResult,
  CheckOneshotBeatsResult,
  CheckOneshotCuesResult,
  PlayOneshotCuesOptions,
  TimeCache,
};
export { checkHolds, checkOneshotBeats, parseLevel, playOneshotCues };
export type { ExpectedBeat, PlayOneshotCuesResult } from "./cue.ts";
export type {
  CueSource,
  CueType,
  Level,
  OneshotBeat,
  OneshotCue,
} from "./level.ts";
export { barToBeat, beatToBar, beatToTime, timeToBeat } from "./time.ts";

export type CheckLevelOptions = PlayOneshotCuesOptions;

export interface CheckLevelResult
  extends CheckOneshotCuesResult, CheckOneshotBeatsResult, CheckHoldsResult {
  barCache: TimeCache;
  beatCache: TimeCache;
}

export function checkLevel(
  level: string,
  options?: CheckLevelOptions,
): CheckLevelResult {
  const {
    barCache,
    beatCache,
    oneshotCues,
    oneshotBeats,
    hits,
    holds,
  } = parseLevel(level);
  const {
    expected,
    invalidNormalCues,
    invalidSquareCues,
  } = playOneshotCues(oneshotCues, options);
  const {
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
  } = checkOneshotBeats(oneshotBeats, expected);
  const {
    hitOnHoldRelease,
    overlappingHolds,
  } = checkHolds(hits, holds);
  return {
    barCache,
    beatCache,
    invalidNormalCues,
    invalidSquareCues,
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
    hitOnHoldRelease,
    overlappingHolds,
  };
}

export function formatTime([bar, beat]: [number, number]): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}
