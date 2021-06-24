import { readText } from "./io.ts";
import { almostEqual, includes, repeat, unique } from "./util.ts";

const cueTypes = ["get", "set", "go", "stop", 1, 2, 3, 4, 5, 6, 7, 8] as const;
const cueSources = ["nurse", "ian"] as const;
type CueType = typeof cueTypes[number];
type CueSource = typeof cueSources[number];
const cueTypeMap = new Map<string, CueType[]>([
  ["SayReaDyGetSetGoNew", ["get", "set", "get", "set", "go"]],
  ["SayGetSetGo", ["get", "set", "go"]],
  ["SayReaDyGetSetOne", ["get", "set", "get", "set", 1]],
  ["SayGetSetOne", ["get", "set", 1]],
  ["JustSayRea", ["get"]],
  ["JustSayDy", ["set"]],
  ["JustSayGet", ["get"]],
  ["JustSaySet", ["set"]],
  ["JustSayGo", ["go"]],
  ["JustSayStop", ["stop"]],
  ["JustSayAndStop", ["stop"]],
  ["Count1", [1]],
  ["Count2", [2]],
  ["Count3", [3]],
  ["Count4", [4]],
  ["Count5", [5]],
  ["Count6", [6]],
  ["Count7", [7]],
  ["Count8", [8]],
  ["SayReadyGetSetGo", ["get", "set", "get", "set", "go"]],
  ["JustSayReady", ["get", "set"]]
]);
const cueSourceMap = new Map<string, CueSource>([
  ["Nurse", "nurse"],
  ["NurseTired", "nurse"],
  ["IanExcited", "ian"],
  ["IanCalm", "ian"],
  ["IanSlow", "ian"]
]);

export interface Cue {
  time: number;
  type: CueType;
  source: CueSource;
}

export interface Beat {
  time: number;
  skipshot: boolean;
}

export function parseLevel(level: string): { cues: Cue[]; beats: Beat[]; } {
  const { rows, events } = JSON.parse(level.replace(/^\ufeff/, "").replace(/,\s*(?=[}\]])/g, ""));
  const cues: Cue[] = [];
  const beats: Beat[] = [];
  const enabledRows = new Set<number>();
  for (const { row, muteBeats } of rows)
    if (!muteBeats)
      enabledRows.add(row);
  let bar = 1;
  let barTime = 0;
  let secondsPerBeat = 0.6;
  let crotchetsPerBar = 8;
  // deno-lint-ignore no-explicit-any
  for (const event of events.filter((event: any) => (event.active ?? true) && !event.if && !event.tag).sort((a: any, b: any) => a.bar - b.bar)) {
    barTime += (event.bar - bar) * crotchetsPerBar * secondsPerBeat;
    bar = event.bar;
    switch (event.type) {
      case "PlaySong":
        secondsPerBeat = 60 / event.bpm;
        break;
      case "SetCrotchetsPerBar":
        crotchetsPerBar = event.crotchetsPerBar;
        break;
      case "SetBeatsPerMinute":
        secondsPerBeat = 60 / event.beatsPerMinute;
        break;
      case "SayReadyGetSetGo": {
        const tick = event.tick;
        const parts = cueTypeMap.get(event.phraseToSay) ?? [];
        const source = cueSourceMap.get(event.voiceSource) ?? "nurse";
        const beat = event.beat - 1;
        for (let i = 0, len = parts.length; i < len; i++)
          cues.push({ time: barTime + (beat + tick * i) * secondsPerBeat, type: parts[i], source });
        break;
      }
      case "AddOneshotBeat": {
        if (!enabledRows.has(event.row))
          break;
        const tick = event.tick;
        const loops = event.loops ?? 0;
        const interval = event.interval ?? 0;
        const delay = event.delay ?? 0;
        const skipshot = event.skipshot ?? false;
        const beat = event.beat - 1 + (delay ? interval - delay : tick);
        for (let i = 0; i <= loops; i++)
          beats.push({ time: barTime + (beat + interval * i) * secondsPerBeat, skipshot: skipshot && i === loops });
        break;
      }
    }
  }
  cues.sort((a, b) => cueTypes.indexOf(a.type) - cueTypes.indexOf(b.type) || cueSources.indexOf(a.source) - cueSources.indexOf(b.source) || a.time - b.time);
  unique(cues, (a, b) => a.type === b.type && a.source === b.source && almostEqual(a.time, b.time));
  cues.sort((a, b) => a.time - b.time);
  beats.sort((a, b) => (a.skipshot ? 1 : 0) - (b.skipshot ? 1 : 0) || a.time - b.time);
  unique(beats, (a, b) => a.skipshot === b.skipshot && almostEqual(a.time, b.time));
  beats.sort((a, b) => a.time - b.time);
  return { cues, beats };
}

interface Pattern {
  interval: number;
  offsets: number[];
}

interface Source {
  startTime: number;
  normal: Pattern;
  square: Pattern;
  next: { time: number; offsets: { type: "get" | "set"; value: number; }[]; };
}

interface ExpectedBeat {
  time: number;
  skips: number;
}

function* updateNormal(source: Source, endTime: number): Generator<ExpectedBeat, void, unknown> {
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

function* updateSquare(source: Source, startTime: number, count: number): Generator<ExpectedBeat, void, unknown> {
  const { interval, offsets } = source.square;
  if (interval <= 0 || offsets.length === 0)
    return;
  const repeated = repeat(offsets, (value, group) => startTime + group * interval + value);
  let [cur, next] = [0, repeated.next().value];
  for (let i = count; i > 0; i--) {
    cur = next;
    next = repeated.next().value;
    yield { time: cur, skips: next };
  }
}

export function playCues(cues: readonly Cue[]): ExpectedBeat[] {
  const beats: ExpectedBeat[] = [];
  const sources = new Map<Cue["source"], Source>();
  for (const cue of cues) {
    const time = cue.time;
    let source = sources.get(cue.source);
    if (!source)
      sources.set(cue.source, source = {
        startTime: -1,
        normal: { interval: 0, offsets: [] },
        square: { interval: 0, offsets: [] },
        next: { time: -1, offsets: [] }
      });
    switch (cue.type) {
      case "get":
        if (source.next.time >= 0)
          source.next.offsets.push({ type: "get", value: time - source.next.time });
        else
          source.next.time = time;
        break;
      case "set":
        if (source.next.time >= 0)
          source.next.offsets.push({ type: "set", value: time - source.next.time });
        break;
      case "go":
        for (const beat of updateNormal(source, time))
          beats.push(beat);
        if (source.next.time >= 0) {
          source.normal = {
            interval: time - source.next.time,
            offsets: source.next.offsets.filter(offset => offset.type === "set").map(offset => offset.value)
          };
          source.next = { time: -1, offsets: [] };
        }
        source.startTime = time;
        break;
      case "stop":
        for (const beat of updateNormal(source, time))
          beats.push(beat);
        source.startTime = -1;
        break;
      default:
        if (source.next.time >= 0) {
          source.square = {
            interval: time - source.next.time,
            offsets: source.next.offsets.map(offset => offset.value)
          };
          source.next = { time: -1, offsets: [] };
        }
        for (const beat of updateSquare(source, time, cue.type))
          beats.push(beat);
        break;
    }
  }
  beats.sort((a, b) => a.time - b.time || a.skips - b.skips);
  unique(beats, (a, b) => almostEqual(a.time, b.time) && almostEqual(a.skips, b.skips));
  return beats;
}

const errorTypes = ["uncued_hit", "skipped_hit", "expected_hit", "overlapping_skipshot"] as const;
type ErrorType = typeof errorTypes[number];

interface CueError {
  type: ErrorType;
  time: number;
}

export function checkBeats(beats: Beat[], expected: ExpectedBeat[]): CueError[] {
  const errors: CueError[] = [];
  const hit = beats.map(beat => beat.time);
  const skipped: number[] = [];
  for (const { time, skipshot } of beats) {
    const matches = expected.filter(({ time: expectedTime }) => almostEqual(time, expectedTime));
    if (matches.length === 0)
      errors.push({ type: "uncued_hit", time });
    else if (skipshot) {
      const first = matches[0].skips;
      for (const match of matches)
        if (!almostEqual(first, match.skips)) {
          errors.push({ type: "overlapping_skipshot", time });
          break;
        }
      for (const match of matches)
        skipped.push(match.skips);
    }
  }
  for (const { time } of expected) {
    const isHit = includes(hit, time, almostEqual);
    const isSkipped = includes(skipped, time, almostEqual);
    if (isHit && isSkipped)
      errors.push({ type: "skipped_hit", time });
    else if (isHit === isSkipped)
      errors.push({ type: "expected_hit", time });
  }
  errors.sort((a, b) => errorTypes.indexOf(a.type) - errorTypes.indexOf(b.type) || a.time - b.time);
  unique(errors, (a, b) => a.type === b.type && almostEqual(a.time, b.time));
  return errors;
}

if (import.meta.main) {
  const { cues, beats } = parseLevel(await readText(Deno.stdin));
  const errors = checkBeats(beats, playCues(cues));
  if (errors.length !== 0) {
    for (const { type, time } of errors)
      switch (type) {
        case "uncued_hit":
          console.error(`Uncued hit at ${time.toFixed(3)}s`);
          break;
        case "skipped_hit":
          console.error(`Hit at ${time.toFixed(3)}s is skipped by a previous skipshot`);
          break;
        case "expected_hit":
          console.error(`Expected hit at ${time.toFixed(3)}s`);
          break;
        case "overlapping_skipshot":
          console.error(`Overlapping skipshot at ${time.toFixed(3)}s`);
          break;
      }
    Deno.exit(1);
  }
}
