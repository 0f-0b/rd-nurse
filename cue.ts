import type { Error } from "./error.ts";
import { sortErrors } from "./error.ts";
import type { Cue } from "./level.ts";
import { almostEqual, repeat, unique } from "./util.ts";

export interface NormalPattern {
  interval: number;
  offsets: number[];
}

export interface SquarePattern {
  interval: number;
}

export interface PatternCue {
  type: "get" | "set";
  time: number;
}

export interface Source {
  startTime: number;
  normal: NormalPattern;
  square: SquarePattern;
  next: PatternCue[];
}

export interface ReplaceResult<T> {
  type: "replace";
  pattern: T;
}

export interface KeepResult {
  type: "keep";
}

export interface ErrorResult {
  type: "error";
}

export type CueResult<T> =
  | ReplaceResult<T>
  | KeepResult
  | ErrorResult;

export interface ExpectedBeat {
  time: number;
  skips: number;
}

export function* playNormal(source: Source, endTime: number): Generator<ExpectedBeat, void, unknown> {
  const startTime = source.startTime;
  if (startTime < 0)
    return;
  const { interval, offsets } = source.normal;
  if (interval <= 0 || offsets.length === 0)
    return;
  const repeated = repeat(offsets, (value, group) => startTime + group * interval + value);
  let [cur, next] = [0, repeated.next().value];
  while (next < endTime || almostEqual(next, endTime)) {
    cur = next;
    next = repeated.next().value;
    yield { time: cur, skips: next };
  }
}

export function* playSquare(source: Source, startTime: number, count: number): Generator<ExpectedBeat, void, unknown> {
  const { interval } = source.square;
  if (interval <= 0)
    return;
  for (let i = 1; i <= count; i++)
    yield { time: startTime + interval * i, skips: -1 };
}

function checkNormalCue(cue: PatternCue[], time: number): CueResult<NormalPattern> {
  const count = cue.length;
  if (count === 1 && cue[0].type === "set")
    return { type: "keep" };
  const startTime = cue[0].time;
  return {
    type: "replace",
    pattern: {
      interval: time - startTime,
      offsets: cue
        .filter(offset => offset.type === "set")
        .map(offset => offset.time - startTime)
    }
  };
}

function checkSquareCue(cue: PatternCue[], time: number): CueResult<SquarePattern> {
  const count = cue.length;
  if (count === 1 && cue[0].type === "set")
    return { type: "keep" };
  if (count & 1)
    return { type: "error" };
  const groups = count >> 1;
  if (groups === 0)
    return { type: "keep" };
  const startTime = cue[0].time;
  for (let i = 0; i < groups; i++) {
    const get = cue[i * 2];
    const set = cue[i * 2 + 1];
    if (get.type !== "get" || set.type !== "set")
      return { type: "error" };
  }
  const interval = cue[1].time - startTime;
  const cueInterval = time - cue[(groups - 1) * 2].time;
  for (let i = 1; i < groups; i++) {
    const get = cue[i * 2];
    const set = cue[i * 2 + 1];
    const curTime = cueInterval * i;
    if (!almostEqual(get.time - startTime, curTime) || !almostEqual(set.time - startTime, curTime + interval))
      return { type: "error" };
  }
  return {
    type: "replace",
    pattern: {
      interval
    }
  };
}

export interface PlayCueOptions {
  ignoreSource?: boolean;
  keepPattern?: boolean;
}

export function playCues(cues: readonly Cue[], { ignoreSource, keepPattern }: PlayCueOptions = {}): { expected: ExpectedBeat[]; errors: Error[]; } {
  const expected: ExpectedBeat[] = [];
  const errors: Error[] = [];
  const sources = new Map<Cue["source"], Source>();
  for (const cue of cues) {
    const time = cue.time;
    const sourceId = ignoreSource ? "nurse" : cue.source;
    let source = sources.get(sourceId);
    if (!source)
      sources.set(sourceId, source = {
        startTime: -1,
        normal: { interval: 0, offsets: [] },
        square: { interval: 0 },
        next: []
      });
    switch (cue.type) {
      case "get":
        source.next.push({ type: "get", time });
        break;
      case "set":
        source.next.push({ type: "set", time });
        break;
      case "go":
        for (const beat of playNormal(source, time))
          expected.push(beat);
        if (source.next.length !== 0) {
          const result = checkNormalCue(source.next, time);
          if (result.type === "error")
            errors.push({ type: "unrecognized_normal", time });
          else if (result.type === "replace")
            source.normal = result.pattern;
          source.next = [];
        }
        source.startTime = time;
        break;
      case "stop":
        for (const beat of playNormal(source, time))
          expected.push(beat);
        source.startTime = -1;
        break;
      default:
        if (!keepPattern) {
          for (const beat of playNormal(source, time))
            expected.push(beat);
          source.startTime = -1;
        }
        if (source.next.length !== 0) {
          const result = checkSquareCue(source.next, time);
          if (result.type === "error")
            errors.push({ type: "unrecognized_square", time });
          else if (result.type === "replace")
            source.square = result.pattern;
          source.next = [];
        }
        for (const beat of playSquare(source, time, cue.type))
          expected.push(beat);
        break;
    }
  }
  expected.sort((a, b) => a.time - b.time || a.skips - b.skips);
  unique(expected, (a, b) => almostEqual(a.time, b.time) && almostEqual(a.skips, b.skips));
  sortErrors(errors);
  return { expected, errors };
}
