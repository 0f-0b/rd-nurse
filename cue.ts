import type { OneshotCue } from "./level.ts";
import { almostEqual, cleanUp } from "./util.ts";

export interface PlayOneshotCuesOptions {
  ignoreSource?: boolean;
  interruptiblePattern?: boolean;
  triangleshot?: boolean;
}

export interface CheckOneshotCuesResult {
  invalidCues: number[];
}

export interface PlayOneshotCuesResult {
  expected: ExpectedBeat[];
  result: CheckOneshotCuesResult;
}

interface Pattern {
  interval: number;
  offsets: number[];
  squareshot: boolean;
}

interface Cue {
  type: "get" | "set";
  time: number;
}

interface Source {
  startTime: number;
  cueTime: number;
  pattern: Pattern;
  next: Cue[];
}

type CueResult =
  | { type: "replace"; pattern: Pattern }
  | { type: "keep" | "error" };

export interface ExpectedBeat {
  time: number;
  prev: number;
  next: number;
}

function* repeat<T, U>(
  arr: readonly T[],
  selector: (value: T, group: number) => U,
): Generator<U, never> {
  for (let i = 0;; i++) {
    for (const elem of arr) {
      yield selector(elem, i);
    }
  }
}

function* playNormal(
  { interval, offsets }: Pattern,
  startTime: number,
  endTime: number,
): Generator<ExpectedBeat, undefined> {
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

function* playSubdiv(
  { offsets: [interval] }: Pattern,
  startTime: number,
  count: number,
  triangleshot: boolean,
): Generator<ExpectedBeat, undefined> {
  if (count > 1 && triangleshot) {
    for (let subdiv = 0; subdiv < count; subdiv++) {
      yield {
        time: startTime + interval * (1.5 + subdiv / count),
        prev: -1,
        next: -1,
      };
    }
  } else {
    for (let i = 1; i <= count; i++) {
      yield { time: startTime + interval * i, prev: -1, next: -1 };
    }
  }
  return;
}

function checkCue(cue: Cue[], endTime: number): CueResult {
  const count = cue.length;
  if (count === 0) {
    return { type: "keep" };
  }
  const startTime = cue[0].time;
  if (cue[0].type === "set") {
    if (count !== 1) {
      return { type: "error" };
    }
    const tick = endTime - startTime;
    return {
      type: "replace",
      pattern: { interval: tick * 2, offsets: [tick], squareshot: true },
    };
  }
  const length = endTime - startTime;
  const offsets: { [K in Cue["type"]]: number[] } = { get: [], set: [] };
  for (const { type, time } of cue) {
    offsets[type].push(time - startTime);
    if (type === "set" && almostEqual(time, startTime)) {
      return { type: "error" };
    }
  }
  const pulseCount = offsets.get.length;
  const hitCount = offsets.set.length;
  let divs = 1;
  deduplicate:
  for (let i = 1; i < hitCount; i++) {
    if (hitCount % i !== 0) {
      continue;
    }
    const curDivs = hitCount / i;
    const interval = length / curDivs;
    for (let j = i; j < hitCount; j++) {
      if (!almostEqual(offsets.set[j - i] + interval, offsets.set[j])) {
        continue deduplicate;
      }
    }
    divs = curDivs;
  }
  const interval = length / divs;
  return {
    type: "replace",
    pattern: {
      interval,
      offsets: offsets.set.slice(0, hitCount / divs),
      squareshot: pulseCount === hitCount &&
        offsets.get.every((offset, index) =>
          almostEqual(offset, interval * index)
        ),
    },
  };
}

export function playOneshotCues(
  cues: readonly OneshotCue[],
  {
    ignoreSource = false,
    interruptiblePattern = false,
    triangleshot = false,
  }: PlayOneshotCuesOptions = {},
): PlayOneshotCuesResult {
  const expected: ExpectedBeat[] = [];
  const result: CheckOneshotCuesResult = {
    invalidCues: [],
  };
  const validate = (source: Source, cueResult: CueResult) => {
    switch (cueResult.type) {
      case "replace":
        source.pattern = cueResult.pattern;
        return true;
      case "keep":
        return source.pattern.interval > 0;
      case "error":
        return false;
    }
  };
  const start = (source: Source, time: number) => {
    const valid = validate(source, checkCue(source.next, time));
    if (valid) {
      source.cueTime = time;
    } else {
      result.invalidCues.push(time);
    }
    source.next = [];
    return valid;
  };
  const tonk = ({ pattern, cueTime }: Source, time: number, count: number) => {
    if (pattern.squareshot) {
      for (const beat of playSubdiv(pattern, time, count, triangleshot)) {
        expected.push(beat);
      }
    } else {
      result.invalidCues.push(cueTime);
    }
  };
  const stop = ({ pattern, startTime }: Source, time: number) => {
    if (startTime >= 0) {
      for (const beat of playNormal(pattern, startTime, time)) {
        expected.push(beat);
      }
    }
  };
  const sources = new Map<OneshotCue["source"], Source>();
  const getSource = (id: OneshotCue["source"]) => {
    let source = sources.get(id);
    if (source === undefined) {
      sources.set(
        id,
        source = {
          startTime: -1,
          cueTime: -1,
          pattern: { interval: 0, offsets: [], squareshot: false },
          next: [],
        },
      );
    }
    return source;
  };
  for (const cue of cues) {
    const time = cue.time;
    const source = getSource(ignoreSource ? "nurse" : cue.source);
    switch (cue.type) {
      case "get":
        source.next.push({ type: "get", time });
        break;
      case "set":
        source.next.push({ type: "set", time });
        break;
      case "go":
        stop(source, time);
        if (start(source, time)) {
          source.startTime = time;
        }
        break;
      case "stop":
        stop(source, time);
        source.startTime = -1;
        break;
      default: {
        if (interruptiblePattern) {
          stop(source, time);
          source.startTime = -1;
        }
        if (start(source, time)) {
          tonk(source, time, cue.type);
        }
        break;
      }
    }
  }
  expected.sort((a, b) => a.time - b.time || a.next - b.next);
  cleanUp(result.invalidCues);
  return { expected, result };
}
