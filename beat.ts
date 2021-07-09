import type { ExpectedBeat } from "./cue.ts";
import type { Error } from "./error.ts";
import { sortErrors } from "./error.ts";
import type { Beat } from "./level.ts";
import { almostEqual, includes } from "./util.ts";

interface NormalResult {
  type: "normal";
}

interface SkipResult {
  type: "skip";
  skips: number;
}

interface ErrorResult {
  type: "error";
  error: Error;
}

type BeatResult =
  | NormalResult
  | SkipResult
  | ErrorResult;

function addBeat({ time, skipshot }: Beat, expected: ExpectedBeat[]): BeatResult {
  const matches = expected.filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
  if (matches.length === 0)
    return { type: "error", error: { type: "uncued_hit", time } };
  if (skipshot) {
    const skips = matches
      .map(match => match.skips)
      .filter(x => x !== -1);
    if (skips.length === 0)
      return { type: "error", error: { type: "unexpected_skipshot", time } };
    const first = skips[0];
    for (const other of skips)
      if (!almostEqual(first, other))
        return { type: "error", error: { type: "overlapping_skipshot", time } };
    for (const match of matches)
      return { type: "skip", skips: match.skips };
  }
  return { type: "normal" };
}

export function checkBeats(beats: Beat[], expected: ExpectedBeat[]): { errors: Error[]; } {
  const errors: Error[] = [];
  const hit = beats.map(beat => beat.time);
  const skipped: number[] = [];
  for (const beat of beats) {
    const result = addBeat(beat, expected);
    if (result.type === "error")
      errors.push(result.error);
    else if (result.type === "skip")
      skipped.push(result.skips);
  }
  for (const { time } of expected) {
    const isHit = includes(hit, time, almostEqual);
    const isSkipped = includes(skipped, time, almostEqual);
    if (isHit && isSkipped)
      errors.push({ type: "skipped_hit", time });
    else if (isHit === isSkipped)
      errors.push({ type: "missing_hit", time });
  }
  sortErrors(errors);
  return { errors };
}
