import type { ExpectedBeat } from "./cue.ts";
import type { Error } from "./error.ts";
import { sortErrors } from "./error.ts";
import type { Beat } from "./level.ts";
import { almostEqual, includes } from "./util.ts";

interface NormalResult {
  type: "normal";
  time: number;
  delay: number;
  skips: number | undefined;
}

interface UncuedResult {
  type: "uncued";
  time: number;
}

interface ErrorResult {
  type: "error";
  error: Error;
}

type BeatResult =
  | NormalResult
  | UncuedResult
  | ErrorResult;

function addBeat({ time, skipshot, start, delay }: Beat, expected: ExpectedBeat[]): BeatResult {
  const matches = expected.filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
  if (matches.length === 0)
    return { type: "uncued", time };
  if (delay) {
    const prev = matches
      .map(match => match.prev)
      .filter(x => x !== -1);
    if (!includes(prev, start, almostEqual))
      return { type: "error", error: { type: "unexpected_freezeshot", time } };
  }
  if (skipshot) {
    const next = matches
      .map(match => match.next)
      .filter(x => x !== -1);
    if (next.length === 0)
      return { type: "error", error: { type: "unexpected_skipshot", time } };
    const first = next[0];
    if (!next.every(x => almostEqual(first, x)))
      return { type: "error", error: { type: "overlapping_skipshot", time } };
    return { type: "normal", time, delay, skips: first };
  }
  return { type: "normal", time, delay, skips: undefined };
}

export function checkBeats(beats: Beat[], expected: ExpectedBeat[]): { errors: Error[]; } {
  const hit: { time: number; delay: number; }[] = [];
  const skipped: number[] = [];
  const uncued: number[] = [];
  const errors: Error[] = [];
  for (const beat of beats) {
    const result = addBeat(beat, expected);
    switch (result.type) {
      case "normal": {
        hit.push({ time: result.time, delay: result.delay });
        if (result.skips !== undefined)
          skipped.push(result.skips);
        break;
      }
      case "uncued":
        uncued.push(result.time);
        break;
      case "error":
        errors.push(result.error);
        break;
      default:
        throw ((_: never) => new TypeError("Non-exhaustive switch"))(result);
    }
  }
  for (const { time, delay } of hit)
    if (hit.some(x => almostEqual(x.time, time) && !almostEqual(x.delay, delay)))
      errors.push({ type: "overlapping_freezeshot", time });
  for (const time of uncued)
    if (!hit.some(x => almostEqual(x.time + x.delay, time)))
      errors.push({ type: "uncued_hit", time });
  for (const { time } of expected) {
    const isHit = hit.some(x => almostEqual(x.time, time));
    const isSkipped = includes(skipped, time, almostEqual);
    if (isHit && isSkipped)
      errors.push({ type: "skipped_hit", time });
    else if (isHit === isSkipped)
      errors.push({ type: "missing_hit", time });
  }
  sortErrors(errors);
  return { errors };
}
