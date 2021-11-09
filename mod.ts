import { checkBeats } from "./beat.ts";
import type { PlayCuesOptions } from "./cue.ts";
import { playCues } from "./cue.ts";
import { parseLevel } from "./level.ts";
import type { TimeCache } from "./time.ts";

export type { PlayCuesOptions, TimeCache };
export { checkBeats, parseLevel, playCues };
export type { CheckBeatsResult } from "./beat.ts";
export type { ExpectedBeat, PlayCuesResult } from "./cue.ts";
export type {
  CueSource,
  CueType,
  Level,
  OneshotBeat,
  OneshotCue,
} from "./level.ts";
export { barToBeat, beatToBar, beatToTime, timeToBeat } from "./time.ts";

export interface CheckLevelResult {
  barCache: TimeCache;
  beatCache: TimeCache;
  invalidNormalCues: number[];
  invalidSquareCues: number[];
  unexpectedSkipshots: number[];
  overlappingSkipshots: number[];
  unexpectedFreezeshots: number[];
  overlappingFreezeshots: number[];
  uncuedHits: number[];
  skippedHits: number[];
  missingHits: number[];
}

export function checkLevel(
  level: string,
  options?: PlayCuesOptions,
): CheckLevelResult {
  const {
    barCache,
    beatCache,
    oneshotCues,
    oneshotBeats,
  } = parseLevel(level);
  const {
    expected,
    invalidNormalCues,
    invalidSquareCues,
  } = playCues(oneshotCues, options);
  const {
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
  } = checkBeats(oneshotBeats, expected);
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
  };
}

export function formatTime([bar, beat]: [number, number]): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}
