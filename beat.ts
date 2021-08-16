import type { ExpectedBeat } from "./cue.ts";
import type { Beat } from "./level.ts";
import { almostEqual, includes, unique } from "./util.ts";

export interface CheckBeatsResult {
  unexpectedSkipshots: number[];
  overlappingSkipshots: number[];
  unexpectedFreezeshots: number[];
  overlappingFreezeshots: number[];
  uncuedHits: number[];
  skippedHits: number[];
  missingHits: number[];
}

interface NormalResult {
  type: "normal";
  time: number;
  delay: number;
  skips: number | undefined;
}

interface ErrorResult {
  type: "uncued" | "unexpected_freezeshot" | "unexpected_skipshot" | "overlapping_skipshot";
  time: number;
}

type BeatResult = NormalResult | ErrorResult;

function addBeat({ time, skipshot, start, delay }: Beat, expected: ExpectedBeat[]): BeatResult {
  const matches = expected.filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
  if (matches.length === 0)
    return { type: "uncued", time };
  if (delay) {
    const prev = matches
      .map(match => match.prev)
      .filter(x => x !== -1);
    if (!includes(prev, start, almostEqual))
      return { type: "unexpected_freezeshot", time };
  }
  if (skipshot) {
    const next = matches
      .map(match => match.next)
      .filter(x => x !== -1);
    if (next.length === 0)
      return { type: "unexpected_skipshot", time };
    const first = next[0];
    if (!next.every(x => almostEqual(first, x)))
      return { type: "overlapping_skipshot", time };
    return { type: "normal", time, delay, skips: first };
  }
  return { type: "normal", time, delay, skips: undefined };
}

export function checkBeats(beats: Beat[], expected: ExpectedBeat[]): CheckBeatsResult {
  const hit: { time: number; delay: number; }[] = [];
  const skipped: number[] = [];
  const uncued: number[] = [];
  const result: CheckBeatsResult = {
    unexpectedSkipshots: [],
    overlappingSkipshots: [],
    unexpectedFreezeshots: [],
    overlappingFreezeshots: [],
    uncuedHits: [],
    skippedHits: [],
    missingHits: []
  };
  for (const beat of beats) {
    const beatResult = addBeat(beat, expected);
    switch (beatResult.type) {
      case "normal": {
        hit.push({ time: beatResult.time, delay: beatResult.delay });
        if (beatResult.skips !== undefined)
          skipped.push(beatResult.skips);
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
        throw ((_: never) => new TypeError("Non-exhaustive switch"))(beatResult);
    }
  }
  for (const { time, delay } of hit)
    if (hit.some(x => almostEqual(x.time, time) && !almostEqual(x.delay, delay)))
      result.overlappingFreezeshots.push(time);
  for (const time of uncued)
    if (!hit.some(x => almostEqual(x.time + x.delay, time)))
      result.uncuedHits.push(time);
  for (const { time } of expected) {
    const isHit = hit.some(x => almostEqual(x.time, time));
    const isSkipped = includes(skipped, time, almostEqual);
    if (isHit && isSkipped)
      result.skippedHits.push(time);
    else if (isHit === isSkipped)
      result.missingHits.push(time);
  }
  unique(result.unexpectedSkipshots.sort((a, b) => a - b), almostEqual);
  unique(result.overlappingSkipshots.sort((a, b) => a - b), almostEqual);
  unique(result.unexpectedFreezeshots.sort((a, b) => a - b), almostEqual);
  unique(result.overlappingFreezeshots.sort((a, b) => a - b), almostEqual);
  unique(result.uncuedHits.sort((a, b) => a - b), almostEqual);
  unique(result.skippedHits.sort((a, b) => a - b), almostEqual);
  unique(result.missingHits.sort((a, b) => a - b), almostEqual);
  return result;
}
