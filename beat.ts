import type { ExpectedBeat } from "./cue.ts";
import type { Hold, OneshotBeat } from "./level.ts";
import { almostEqual, cleanUp } from "./util.ts";

export interface CheckOneshotBeatsResult {
  unexpectedSkipshots: number[];
  overlappingSkipshots: number[];
  unexpectedFreezeshots: number[];
  overlappingFreezeshots: number[];
  uncuedHits: number[];
  skippedHits: number[];
  missingHits: number[];
}

type BeatResult =
  | {
    type: "cued";
    time: number;
    delay: number;
    skips: number | undefined;
  }
  | {
    type:
      | "uncued"
      | "unexpected_freezeshot"
      | "unexpected_skipshot"
      | "overlapping_skipshot";
    time: number;
  };

function addBeat(
  { time, skipshot, start, delay }: OneshotBeat,
  expected: ExpectedBeat[],
): BeatResult {
  const matches = expected
    .filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
  if (matches.length === 0) {
    return { type: "uncued", time };
  }
  if (delay) {
    const prev = matches
      .map((match) => match.prev)
      .filter((x) => x !== -1);
    if (!prev.some((x) => almostEqual(x, start))) {
      return { type: "unexpected_freezeshot", time };
    }
  }
  if (skipshot) {
    const next = matches
      .map((match) => match.next)
      .filter((x) => x !== -1);
    if (next.length === 0) {
      return { type: "unexpected_skipshot", time };
    }
    const first = next[0];
    if (!next.every((x) => almostEqual(first, x))) {
      return { type: "overlapping_skipshot", time };
    }
    return { type: "cued", time, delay, skips: first };
  }
  return { type: "cued", time, delay, skips: undefined };
}

export function checkOneshotBeats(
  beats: OneshotBeat[],
  expected: ExpectedBeat[],
): CheckOneshotBeatsResult {
  const hit: { time: number; delay: number }[] = [];
  const skipped: number[] = [];
  const uncued: number[] = [];
  const result: CheckOneshotBeatsResult = {
    unexpectedSkipshots: [],
    overlappingSkipshots: [],
    unexpectedFreezeshots: [],
    overlappingFreezeshots: [],
    uncuedHits: [],
    skippedHits: [],
    missingHits: [],
  };
  for (const beat of beats) {
    const beatResult = addBeat(beat, expected);
    switch (beatResult.type) {
      case "cued": {
        hit.push({ time: beatResult.time, delay: beatResult.delay });
        if (beatResult.skips !== undefined) {
          skipped.push(beatResult.skips);
        }
        break;
      }
      case "uncued":
        uncued.push(beatResult.time);
        break;
      case "unexpected_freezeshot":
        result.unexpectedFreezeshots.push(beatResult.time);
        break;
      case "unexpected_skipshot":
        result.unexpectedSkipshots.push(beatResult.time);
        break;
      case "overlapping_skipshot":
        result.overlappingSkipshots.push(beatResult.time);
        break;
      default:
        throw ((_: never) => new TypeError("Non-exhaustive switch"))(
          beatResult,
        );
    }
  }
  for (const { time, delay } of hit) {
    if (
      hit.some((x) => almostEqual(x.time, time) && !almostEqual(x.delay, delay))
    ) {
      result.overlappingFreezeshots.push(time);
    }
  }
  for (const time of uncued) {
    if (!hit.some((x) => almostEqual(x.time + x.delay, time))) {
      result.uncuedHits.push(time);
    }
  }
  for (const { time } of expected) {
    const isHit = hit.some((x) => almostEqual(x.time, time));
    const isSkipped = skipped.some((x) => almostEqual(x, time));
    if (isHit && isSkipped) {
      result.skippedHits.push(time);
    } else if (isHit === isSkipped) {
      result.missingHits.push(time);
    }
  }
  cleanUp(result.unexpectedSkipshots);
  cleanUp(result.overlappingSkipshots);
  cleanUp(result.unexpectedFreezeshots);
  cleanUp(result.overlappingFreezeshots);
  cleanUp(result.uncuedHits);
  cleanUp(result.skippedHits);
  cleanUp(result.missingHits);
  return result;
}

export interface CheckHoldsResult {
  hitOnHoldRelease: number[];
  overlappingHolds: number[];
}

export function checkHolds(hits: number[], holds: Hold[]): CheckHoldsResult {
  const result: CheckHoldsResult = {
    hitOnHoldRelease: [],
    overlappingHolds: [],
  };
  for (const hit of hits) {
    if (holds.some(({ release }) => almostEqual(release, hit))) {
      result.hitOnHoldRelease.push(hit);
    }
  }
  for (const { hit, release } of holds) {
    if (
      holds.some((other) =>
        !(almostEqual(hit, other.hit) && almostEqual(release, other.release)) &&
        (almostEqual(hit, other.hit) || almostEqual(hit, other.release) ||
          (hit > other.hit && hit < other.release))
      )
    ) {
      result.overlappingHolds.push(hit);
    }
  }
  cleanUp(result.hitOnHoldRelease);
  cleanUp(result.overlappingHolds);
  return result;
}
