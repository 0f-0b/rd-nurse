import type { OneshotCue } from "./level.ts";
import { almostEqual, sortTime, unique } from "./util.ts";

export interface PlayOneshotCuesOptions {
  ignoreSource?: boolean;
  interruptiblePattern?: boolean;
  triangleshot?: boolean;
}

export interface CheckOneshotCuesResult {
  invalidNormalCues: number[];
  invalidSquareCues: number[];
}

export interface PlayOneshotCuesResult extends CheckOneshotCuesResult {
  expected: ExpectedBeat[];
}

interface NormalPattern {
  interval: number;
  offsets: number[];
}

interface SquarePattern {
  interval: number;
}

interface PatternCue {
  type: "get" | "set";
  time: number;
}

interface Source {
  startTime: number;
  normal: NormalPattern;
  square: SquarePattern;
  next: PatternCue[];
}

interface ReplaceResult<T> {
  type: "replace";
  pattern: T;
}

interface KeepResult {
  type: "keep";
}

interface ErrorResult {
  type: "error";
}

type CueResult<T> =
  | ReplaceResult<T>
  | KeepResult
  | ErrorResult;

export interface ExpectedBeat {
  time: number;
  prev: number;
  next: number;
}

function* repeat<T, U>(
  arr: readonly T[],
  selector: (value: T, group: number) => U,
): Generator<U, never, unknown> {
  for (let i = 0;; i++) {
    for (const elem of arr) {
      yield selector(elem, i);
    }
  }
}

function* playNormal(
  source: Source,
  endTime: number,
): Generator<ExpectedBeat, void, unknown> {
  const startTime = source.startTime;
  if (startTime < 0) {
    return;
  }
  const { interval, offsets } = source.normal;
  if (interval <= 0 || offsets.length === 0) {
    return;
  }
  const repeated = repeat(
    offsets,
    (value, group) => startTime + group * interval + value,
  );
  let [prev, cur, next] = [-1, -1, repeated.next().value];
  while (next < endTime || almostEqual(next, endTime)) {
    [prev, cur, next] = [cur, next, repeated.next().value];
    yield { time: cur, prev, next };
  }
}

function* playSquare(
  source: Source,
  startTime: number,
  count: number,
  triangleshot?: boolean,
): Generator<ExpectedBeat, void, unknown> {
  const { interval } = source.square;
  if (interval <= 0) {
    return;
  }
  if (count === 2 && triangleshot) {
    for (const i of [1.5, 2]) {
      yield { time: startTime + interval * i, prev: -1, next: -1 };
    }
  } else {
    for (let i = 1; i <= count; i++) {
      yield { time: startTime + interval * i, prev: -1, next: -1 };
    }
  }
}

function checkNormalCue(
  cue: PatternCue[],
  time: number,
): CueResult<NormalPattern> {
  const count = cue.length;
  if (count === 1 && cue[0].type === "set") {
    return { type: "keep" };
  }
  const startTime = cue[0].time;
  return {
    type: "replace",
    pattern: {
      interval: time - startTime,
      offsets: cue
        .filter((offset) => offset.type === "set")
        .map((offset) => offset.time - startTime),
    },
  };
}

function checkSquareCue(
  cue: PatternCue[],
  time: number,
): CueResult<SquarePattern> {
  const count = cue.length;
  if (count === 1 && cue[0].type === "set") {
    return { type: "keep" };
  }
  if (count & 1) {
    return { type: "error" };
  }
  const groups = count >> 1;
  if (groups === 0) {
    return { type: "keep" };
  }
  const startTime = cue[0].time;
  for (let i = 0; i < groups; i++) {
    const get = cue[i * 2];
    const set = cue[i * 2 + 1];
    if (get.type !== "get" || set.type !== "set") {
      return { type: "error" };
    }
  }
  const interval = cue[1].time - startTime;
  const cueInterval = time - cue[(groups - 1) * 2].time;
  for (let i = 1; i < groups; i++) {
    const get = cue[i * 2];
    const set = cue[i * 2 + 1];
    const curTime = cueInterval * i;
    if (
      !almostEqual(get.time - startTime, curTime) ||
      !almostEqual(set.time - startTime, curTime + interval)
    ) {
      return { type: "error" };
    }
  }
  return {
    type: "replace",
    pattern: {
      interval,
    },
  };
}

export function playOneshotCues(cues: readonly OneshotCue[], {
  ignoreSource,
  interruptiblePattern,
  triangleshot,
}: PlayOneshotCuesOptions = {}): PlayOneshotCuesResult {
  const result: PlayOneshotCuesResult = {
    expected: [],
    invalidNormalCues: [],
    invalidSquareCues: [],
  };
  const sources = new Map<OneshotCue["source"], Source>();
  for (const cue of cues) {
    const time = cue.time;
    const sourceId = ignoreSource ? "nurse" : cue.source;
    let source = sources.get(sourceId);
    if (!source) {
      sources.set(
        sourceId,
        source = {
          startTime: -1,
          normal: { interval: 0, offsets: [] },
          square: { interval: 0 },
          next: [],
        },
      );
    }
    switch (cue.type) {
      case "get":
        source.next.push({ type: "get", time });
        break;
      case "set":
        source.next.push({ type: "set", time });
        break;
      case "go":
        for (const beat of playNormal(source, time)) {
          result.expected.push(beat);
        }
        if (source.next.length !== 0) {
          const cueResult = checkNormalCue(source.next, time);
          if (cueResult.type === "error") {
            result.invalidNormalCues.push(time);
          } else if (cueResult.type === "replace") {
            source.normal = cueResult.pattern;
          }
          source.next = [];
        }
        source.startTime = time;
        break;
      case "stop":
        for (const beat of playNormal(source, time)) {
          result.expected.push(beat);
        }
        source.startTime = -1;
        break;
      default:
        if (interruptiblePattern) {
          for (const beat of playNormal(source, time)) {
            result.expected.push(beat);
          }
          source.startTime = -1;
        }
        if (source.next.length !== 0) {
          const cueResult = checkSquareCue(source.next, time);
          if (cueResult.type === "error") {
            result.invalidSquareCues.push(time);
          } else if (cueResult.type === "replace") {
            source.square = cueResult.pattern;
          }
          source.next = [];
        }
        for (const beat of playSquare(source, time, cue.type, triangleshot)) {
          result.expected.push(beat);
        }
        break;
    }
  }
  result.expected
    .sort((a, b) => a.time - b.time || a.next - b.next)
    [unique]((a, b) =>
      almostEqual(a.time, b.time) && almostEqual(a.next, b.next)
    );
  sortTime(result.invalidNormalCues);
  sortTime(result.invalidSquareCues);
  return result;
}
