import type { ExpectedBeat } from "./cue.ts";
import type { Hold, OneshotBeat, OneshotBeatOffset } from "./level.ts";
import { almostEqual, cleanUp } from "./util.ts";

export interface CheckOneshotBeatsResult {
  unexpectedSkipshots: number[];
  overlappingSkipshots: number[];
  unexpectedFreezeshots: number[];
  overlappingFreezeshots: number[];
  unexpectedBurnshots: number[];
  overlappingBurnshots: number[];
  uncuedHits: number[];
  skippedHits: number[];
  missingHits: number[];
  hasBurnshot: boolean;
}

type BeatResult =
  | {
    type: "cued";
    time: number;
    offset: OneshotBeatOffset | null;
    skips: number | null;
  }
  | {
    type:
      | "uncued"
      | "unexpected_freezeshot"
      | "unexpected_burnshot"
      | "unexpected_skipshot"
      | "overlapping_skipshot";
    time: number;
  };

function addBeat(
  { time, skipshot, offset }: OneshotBeat,
  expected: ExpectedBeat[],
): BeatResult {
  const matches = expected
    .filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
  if (matches.length === 0) {
    return { type: "uncued", time };
  }
  if (offset) {
    const cueTime = time - offset.interval;
    const prev = matches
      .map((match) => match.prev)
      .filter((x) => x !== -1);
    if (!prev.some((x) => almostEqual(x, cueTime))) {
      switch (offset.mode) {
        case "freezeshot":
          return { type: "unexpected_freezeshot", time };
        case "burnshot":
          return { type: "unexpected_burnshot", time };
      }
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
    return { type: "cued", time, offset, skips: first };
  }
  return { type: "cued", time, offset, skips: null };
}

export function checkOneshotBeats(
  beats: OneshotBeat[],
  expected: ExpectedBeat[],
): CheckOneshotBeatsResult {
  const hit: { time: number; offset: OneshotBeatOffset | null }[] = [];
  const skipped: number[] = [];
  const uncued: number[] = [];
  const result: CheckOneshotBeatsResult = {
    unexpectedSkipshots: [],
    overlappingSkipshots: [],
    unexpectedFreezeshots: [],
    overlappingFreezeshots: [],
    unexpectedBurnshots: [],
    overlappingBurnshots: [],
    uncuedHits: [],
    skippedHits: [],
    missingHits: [],
    hasBurnshot: false,
  };
  for (const beat of beats) {
    if (beat.offset?.mode === "burnshot") {
      result.hasBurnshot = true;
    }
    const beatResult = addBeat(beat, expected);
    switch (beatResult.type) {
      case "cued": {
        hit.push({ time: beatResult.time, offset: beatResult.offset });
        if (beatResult.skips !== null) {
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
    }
  }
  for (const { time, offset } of hit) {
    if (
      offset && hit.some((x) =>
        almostEqual(x.time, time) &&
        !(x.offset?.mode === offset.mode && x.offset.delay === offset.delay)
      )
    ) {
      switch (offset.mode) {
        case "freezeshot":
          result.overlappingFreezeshots.push(time);
          break;
        case "burnshot":
          result.overlappingBurnshots.push(time);
          break;
      }
    }
  }
  const hitTime = hit.map((x) => {
    let time = x.time;
    switch (x.offset?.mode) {
      case "freezeshot":
        time += x.offset.delay;
        break;
      case "burnshot":
        time -= x.offset.delay;
        break;
    }
    return time;
  });
  for (const time of uncued) {
    if (!hitTime.some((x) => almostEqual(x, time))) {
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
  cleanUp(result.unexpectedBurnshots);
  cleanUp(result.overlappingBurnshots);
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
